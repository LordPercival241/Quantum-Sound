import { useState, useEffect, useCallback, useRef } from 'react';

export const useSpeechRecognition = ({ onCommand }) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'es-ES';
            recognition.interimResults = false;

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                console.log("Recognized:", transcript);
                if (onCommand) {
                    processCommand(transcript);
                }
            };

            recognitionRef.current = recognition;
        }
    }, [onCommand]);

    const processCommand = (text) => {
        // Basic AI logic for keywords
        let response = "";

        if (text.includes("superposición") || text.includes("superposicion")) {
            response = "La superposición es cuando un qubit está en estado 0 y 1 a la vez.";
        } else if (text.includes("entrelazamiento")) {
            response = "El entrelazamiento conecta dos qubits de forma que el estado de uno afecta instantáneamente al otro.";
        } else if (text.includes("colapso") || text.includes("medir")) {
            response = "Al medir un qubit, su superposición colapsa a un estado definido, 0 o 1.";
        } else if (text.includes("ayuda") || text.includes("controles")) {
            response = "Presiona Espacio para medir, o H para hablar conmigo.";
        } else if (text.includes("objetivo")) {
            response = "Tu objetivo es identificar el estado cuántico escuchando el sonido.";
        } else {
            // Fallback or just ignore if not clear
            // response = "No entendí, prueba preguntar sobre superposición o entrelazamiento.";
            // Don't spam if misunderstood
            return;
        }

        if (onCommand && response) {
            onCommand(response);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key.toLowerCase() === 'h' && !isListening && recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                } catch (err) {
                    // Already started logic
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isListening]);

    return { isListening };
};


