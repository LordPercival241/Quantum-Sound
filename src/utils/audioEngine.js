// src/utils/audioEngine.js

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.oscillators = [];
        this.gainNodes = [];
    }

    init() {
        if (!this.ctx) {
            // Inicializar el contexto de audio solo tras una interacción del usuario
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    // Detiene todos los sonidos actuales
    stopAll() {
        this.oscillators.forEach(osc => {
            try { osc.stop(); } catch (e) { /* ignore */ }
        });
        this.oscillators = [];
        this.gainNodes = [];
    }

    // FASE 1: SUPERPOSICIÓN
    // Reproduce un tono. Si es 'superposition', reproduce ambos.
    playTone(type) {
        this.stopAll();
        this.init();

        const now = this.ctx.currentTime;

        // Configuración base
        const playOsc = (freq, type = 'sine') => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);

            // Envelope suave para evitar "clicks"
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 0.1); // Volumen suave

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();

            this.oscillators.push(osc);
            this.gainNodes.push(gain);
        };

        if (type === '0') playOsc(200); // Grave [cite: 17]
        if (type === '1') playOsc(800); // Agudo [cite: 19]
        if (type === 'superposition') {
            playOsc(200);
            playOsc(800);
            // Efecto de interferencia leve para denotar inestabilidad
            const lfo = this.ctx.createOscillator();
            lfo.frequency.value = 5; // 5Hz vibrato
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = 50;
            lfo.connect(lfoGain);
            // Conectar LFO a uno de los osciladores si se desea mayor complejidad
        }
    }

    // FASE 2: ENTRELAZAMIENTO (STEREO PANNING)
    //: Qubit A (Izquierda), Qubit B (Derecha)
    playEntanglement(freqLeft, freqRight) {
        this.stopAll();
        this.init();

        const createPannedOsc = (freq, panValue) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const panner = this.ctx.createStereoPanner(); // Web Audio API Panner

            osc.type = 'sine';
            osc.frequency.value = freq;
            panner.pan.value = panValue; // -1 (Izquierda) a 1 (Derecha)

            osc.connect(gain);
            gain.connect(panner);
            panner.connect(this.ctx.destination);

            osc.start();
            gain.gain.value = 0.2; // Volumen bajo para no saturar

            this.oscillators.push(osc);
            return { osc, panner };
        };

        // Qubit A: Oído Izquierdo (Fijo)
        createPannedOsc(freqLeft, -1);

        // Qubit B: Oído Derecho (Variable)
        const rightSide = createPannedOsc(freqRight, 1);

        // Devolvemos referencia para poder actualizar la frecuencia en tiempo real
        return rightSide.osc;
    }

    playFeedback(isSuccess) {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = isSuccess ? 'sine' : 'sawtooth';
        osc.frequency.setValueAtTime(isSuccess ? 500 : 150, this.ctx.currentTime);
        if (isSuccess) {
            osc.frequency.exponentialRampToValueAtTime(1000, this.ctx.currentTime + 0.1);
        } else {
            osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.3);
        }

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }
}

export const audioEngine = new AudioEngine();
