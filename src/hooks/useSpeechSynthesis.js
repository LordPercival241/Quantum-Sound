import { useState, useEffect, useRef, useCallback } from 'react';

export const useSpeechSynthesis = () => {
    const [voices, setVoices] = useState([]);
    const speaking = useRef(false);
    const queue = useRef([]);

    useEffect(() => {
        const updateVoices = () => {
            setVoices(window.speechSynthesis.getVoices());
        };

        window.speechSynthesis.onvoiceschanged = updateVoices;
        updateVoices();

        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const speak = useCallback((text, priority = false, onEndCallback = null) => {
        if (priority) {
            window.speechSynthesis.cancel();
            queue.current = [];
            speaking.current = false;
        }

        const utterance = new SpeechSynthesisUtterance(text);

        // Config: 0.9x speed, 1.0 pitch, 0.8 volume
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        // Use es-ES voice
        const esVoice = voices.find(v => v.lang === 'es-ES') ||
            voices.find(v => v.lang.startsWith('es'));
        if (esVoice) utterance.voice = esVoice;

        utterance.onend = () => {
            speaking.current = false;
            if (onEndCallback) onEndCallback();

            if (queue.current.length > 0) {
                const next = queue.current.shift();
                speak(next.text, false, next.onEnd);
            }
        };

        if (speaking.current && !priority) {
            queue.current.push({ text, onEnd: onEndCallback });
        } else {
            speaking.current = true;
            window.speechSynthesis.speak(utterance);
        }
    }, [voices]);

    return { speak };
};
