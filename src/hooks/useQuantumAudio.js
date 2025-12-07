import { useRef, useEffect, useCallback } from 'react';

export const useQuantumAudio = () => {
    const audioContext = useRef(null);
    const masterGain = useRef(null);
    const activeOscillators = useRef([]);
    // Navigable probability (0.0 to 1.0). 0.0 = Pure 0 (Left), 1.0 = Pure 1 (Right)
    const probabilityRef = useRef(0.5);

    const initAudio = useCallback(() => {
        if (audioContext.current) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext.current = new AudioContext();

        masterGain.current = audioContext.current.createGain();
        masterGain.current.gain.value = 0.2; // 20% limit
        masterGain.current.connect(audioContext.current.destination);
    }, []);

    const stopAudio = useCallback(() => {
        if (activeOscillators.current.length > 0) {
            const now = audioContext.current.currentTime;
            activeOscillators.current.forEach(({ nodes, type }) => {
                // Recursive stop for all source nodes
                nodes.forEach(n => {
                    if (n.stop) {
                        try { n.stop(now + 0.1); } catch (e) { }
                    }
                    if (n.disconnect) {
                        // Schedule disconnect
                        setTimeout(() => n.disconnect(), 200);
                    }
                });
            });
            activeOscillators.current = [];
        }
    }, []);

    // Update real-time balance based on navigation
    const setProbability = useCallback((prob) => {
        probabilityRef.current = prob;
        // If we have active superposition sounds, update gains
        const superPos = activeOscillators.current.find(o => o.type === 'superposition');
        if (superPos && superPos.gains) {
            const { leftGain, rightGain } = superPos.gains;
            const now = audioContext.current.currentTime;
            // Crossfade logic
            // If prob is 0 (State 0) -> Left Gain 1, Right Gain 0
            // If prob is 0.5 -> Both 0.7
            // We use linear for simplicity or cos/sin for equal power
            leftGain.gain.setValueAtTime(leftGain.gain.value, now);
            rightGain.gain.setValueAtTime(rightGain.gain.value, now);

            const lVol = Math.cos(prob * Math.PI / 2);
            const rVol = Math.sin(prob * Math.PI / 2);

            leftGain.gain.linearRampToValueAtTime(lVol, now + 0.1);
            rightGain.gain.linearRampToValueAtTime(rVol, now + 0.1);
        }
    }, []);

    const playSuperposition = useCallback(() => {
        initAudio();
        stopAudio();
        const now = audioContext.current.currentTime;
        const ctx = audioContext.current;

        /** SCHEMATIC
         * Osc Left (200Hz) -> Gain L -> Panner L (-1) -> Master
         * Osc Right (800Hz) -> Gain R -> Panner R (+1) -> Master
         */

        // Left Channel |0>
        const oscL = ctx.createOscillator();
        oscL.type = 'sine';
        oscL.frequency.value = 200;
        const gainL = ctx.createGain();
        const pannerL = ctx.createStereoPanner();
        pannerL.pan.value = -1; // Full Left

        oscL.connect(gainL);
        gainL.connect(pannerL);
        pannerL.connect(masterGain.current);

        // Right Channel |1>
        const oscR = ctx.createOscillator();
        oscR.type = 'sine';
        oscR.frequency.value = 800;
        const gainR = ctx.createGain();
        const pannerR = ctx.createStereoPanner();
        pannerR.pan.value = 1; // Full Right

        oscR.connect(gainR);
        gainR.connect(pannerR);
        pannerR.connect(masterGain.current);

        // Initial Volume based on current Probability (usually starts 0.5)
        const prob = probabilityRef.current;
        const lVol = Math.cos(prob * Math.PI / 2);
        const rVol = Math.sin(prob * Math.PI / 2);

        gainL.gain.value = 0;
        gainR.gain.value = 0;
        gainL.gain.linearRampToValueAtTime(lVol, now + 0.5);
        gainR.gain.linearRampToValueAtTime(rVol, now + 0.5);

        oscL.start(now);
        oscR.start(now);

        // LFO for "Uncertainty" Ripple
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 4; // Hz
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 5; // Slight frequency wobble
        lfo.connect(lfoGain);
        lfoGain.connect(oscL.frequency);
        lfoGain.connect(oscR.frequency);
        lfo.start(now);

        activeOscillators.current.push({
            type: 'superposition',
            nodes: [oscL, oscR, gainL, gainR, pannerL, pannerR, lfo, lfoGain],
            gains: { leftGain: gainL, rightGain: gainR }
        });

    }, [initAudio, stopAudio]);

    const playTunneling = useCallback(() => {
        initAudio();
        stopAudio();
        const now = audioContext.current.currentTime;
        const ctx = audioContext.current;

        // Sound: A barrier tone (White Noise + Low Pass) that sweeps up
        // Then a "Ping" if successful
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 100;

        noise.connect(noiseFilter);
        noiseFilter.connect(masterGain.current);

        // Sweep filter up (Approaching barrier)
        noiseFilter.frequency.exponentialRampToValueAtTime(1000, now + 2);

        noise.start(now);
        noise.stop(now + 2.5);

        activeOscillators.current.push({
            type: 'tunneling',
            nodes: [noise, noiseFilter]
        });
    }, [initAudio, stopAudio]);

    const playTunnelResult = useCallback((success) => {
        const now = audioContext.current.currentTime;
        const ctx = audioContext.current;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        if (success) {
            // Clear high ping
            osc.frequency.value = 1200;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1);
        } else {
            // Dull thud
            osc.frequency.value = 100;
            osc.type = 'triangle';
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        }

        osc.connect(gain);
        gain.connect(masterGain.current);
        osc.start(now);
        osc.stop(now + 1);
    }, []);

    const playInterference = useCallback(() => {
        initAudio();
        stopAudio();
        const now = audioContext.current.currentTime;
        const ctx = audioContext.current;

        // Two close frequencies to create beating
        // Or 200Hz fixed vs 200Hz + Detune
        const osc1 = ctx.createOscillator();
        osc1.frequency.value = 300;
        const osc2 = ctx.createOscillator();
        osc2.frequency.value = 302; // 2Hz Beat

        const gain = ctx.createGain();
        gain.gain.value = 0.5;

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(masterGain.current);

        osc1.start(now);
        osc2.start(now);

        activeOscillators.current.push({
            type: 'interference',
            nodes: [osc1, osc2, gain]
        });
    }, [initAudio, stopAudio]);

    const playCollapse = useCallback((state) => {
        initAudio();
        stopAudio();
        const now = audioContext.current.currentTime;
        const ctx = audioContext.current;

        // Strict Layout:
        // 0 -> Left Ear Only, 200Hz
        // 1 -> Right Ear Only, 800Hz

        const freq = state === 0 ? 110 : 660; // 110Hz (A2) Grave, 660Hz (E5) Agudo
        const pan = state === 0 ? -1 : 1;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const panner = ctx.createStereoPanner();
        panner.pan.value = pan;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(1.0, now + 0.05); // Louder start
        gain.gain.setValueAtTime(1.0, now + 0.5); // Sustain
        gain.gain.exponentialRampToValueAtTime(0.01, now + 2.0); // Longer tail

        osc.connect(gain);
        gain.connect(panner);
        panner.connect(masterGain.current);

        osc.start(now);
        osc.stop(now + 2.0);
    }, [initAudio, stopAudio]);

    const playTutorialTone = useCallback((side) => {
        initAudio();
        stopAudio();
        const now = audioContext.current.currentTime;
        const ctx = audioContext.current;

        const freq = side === 'left' ? 110 : 660;
        const pan = side === 'left' ? -1 : 1;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const panner = ctx.createStereoPanner();
        panner.pan.value = pan;
        const gain = ctx.createGain();

        gain.gain.value = 0;
        gain.gain.linearRampToValueAtTime(0.5, now + 0.1);
        gain.gain.linearRampToValueAtTime(0.5, now + 1.5);
        gain.gain.linearRampToValueAtTime(0, now + 2.0);

        osc.connect(gain);
        gain.connect(panner);
        panner.connect(masterGain.current);

        osc.start(now);
        osc.stop(now + 2.0);
    }, [initAudio, stopAudio]);

    return {
        initAudio,
        stopAudio,
        playSuperposition,
        playTunneling,
        playTunnelResult,
        playInterference,
        playCollapse,
        setProbability,
        playTutorialTone
    };
};
