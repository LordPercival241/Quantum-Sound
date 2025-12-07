import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuantumAudio } from '../hooks/useQuantumAudio';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

const LEVELS = {
    1: {
        name: 'Superposición Puro',
        rounds: 3,
        points: 100,
        mode: 'superposition',
        intro: "Nivel 1: Superposición. En el mundo cuántico, las partículas pueden estar en múltiples lugares a la vez. Esto se llama superposición. Escucharás un sonido que viene de ambos lados. Tu misión es 'medir' el estado presionando Espacio. Al hacerlo, el sonido colapsará aleatoriamente a la izquierda (Cero) o a la derecha (Uno). ¡Inténtalo!"
    },
    2: {
        name: 'Navegación de Estados',
        rounds: 3,
        points: 200,
        mode: 'navigation',
        intro: "Nivel 2: Probabilidad. Ahora tú tienes el control. En cuántica, podemos influir en la probabilidad de colapso. Usa las flechas Izquierda y Derecha para mover el sonido. Si escuchas más fuerte a la derecha, es más probable que al medir obtengas un Uno. Ajusta la probabilidad y presiona Espacio para medir."
    },
    3: {
        name: 'Tunelización',
        rounds: 3,
        points: 300,
        mode: 'tunneling',
        intro: "Nivel 3: Tunelización. ¿Sabías que las partículas cuánticas pueden atravesar paredes? Esto es el Efecto Túnel. Escucharás una partícula acercándose a una barrera de energía. Presiona Espacio justo cuando el tono sea más agudo para intentar atravesarla. ¡No te rindas si rebota!"
    },
    4: {
        name: 'Interferencia',
        rounds: 3,
        points: 400,
        mode: 'interference',
        intro: "Nivel 4: Interferencia. Como las olas del mar, los estados cuánticos pueden sumarse o cancelarse entre sí. Escucha atentamente los batidos de frecuencia, ese sonido pulsante. Presiona Espacio para capturar el patrón de interferencia."
    }
};

export const GameManager = () => {
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [phase, setPhase] = useState('start');
    const [currentRound, setCurrentRound] = useState(0);
    const [userProb, setUserProb] = useState(0.5); // 0.0 to 1.0
    const [lastResult, setLastResult] = useState(null); // 'Left' (0) or 'Right' (1)

    const { initAudio, stopAudio, playSuperposition, playTunneling, playTunnelResult, playInterference, playCollapse, setProbability, playTutorialTone } = useQuantumAudio();
    const { speak } = useSpeechSynthesis();

    // AI Assistant callback
    const handleAIResponse = useCallback((text) => {
        speak(text, true);
    }, [speak]);

    const { isListening } = useSpeechRecognition({ onCommand: handleAIResponse });

    const runTutorial = useCallback(() => {
        setPhase('tutorial');
        speak("¡Hola! Bienvenido a Quantum Sounds, donde descubrirás los secretos de la computación cuántica usando solo tus oídos. Prepárate para una aventura sonora. Primero, calibremos tu audio.", true, () => {
            speak("Esto es el estado Ket Cero. Debe sonar a tu izquierda.", false, () => {
                playTutorialTone('left');
                setTimeout(() => {
                    speak("Esto es el estado Ket Uno. Debe sonar a tu derecha.", false, () => {
                        playTutorialTone('right');
                        setTimeout(() => {
                            speak("Ahora estás listo. Presiona Espacio cuando estés preparado para empezar.", false, () => {
                                setPhase('ready_to_start');
                            });
                        }, 2500);
                    });
                }, 2500);
            });
        });
    }, [speak, playTutorialTone]);

    const nextRound = useCallback((lvl) => {
        setPhase('measuring');
        setUserProb(0.5); // Reset Navigation
        setProbability(0.5);

        const config = LEVELS[lvl];

        if (config.mode === 'superposition' || config.mode === 'navigation') {
            speak("Escuchando onda...");
            playSuperposition();
        } else if (config.mode === 'tunneling') {
            speak("Barrera detectada...");
            playTunneling();
        } else if (config.mode === 'interference') {
            speak("Patrón de interferencia...");
            playInterference();
        }
    }, [speak, playSuperposition, playTunneling, playInterference, setProbability]);

    const startLevel = useCallback((lvl) => {
        const config = LEVELS[lvl];
        if (!config) return;

        setCurrentRound(1);
        setPhase('intro');

        // Speak intro, then start round
        speak(config.intro, true, () => {
            nextRound(lvl);
        });
    }, [speak, nextRound]);

    const measure = useCallback(async () => {
        if (phase !== 'measuring') return;

        const config = LEVELS[level];
        speak("Midiendo en computador cuántico...");

        try {
            let mode = 'superposition';
            let probability = 0.5;

            if (config.mode === 'navigation') {
                mode = 'navigation';
                probability = userProb;
            } else if (config.mode === 'tunneling') {
                mode = 'tunneling';
                probability = 0.6; // 60% chance to tunnel
            }

            const response = await fetch('http://127.0.0.1:5000/api/measure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, probability })
            });
            const data = await response.json();

            if (!data.success) throw new Error("Quantum Error");

            const result = data.result; // 0 or 1

            if (config.mode === 'superposition' || config.mode === 'navigation') {
                playCollapse(result);
                setLastResult(result === 0 ? 'IZQUIERDA (Cero)' : 'DERECHA (Uno)');

                // Wait for audio tail (2s) before speaking
                setTimeout(() => {
                    speak(result === 0 ? "Colapso en Ket Cero" : "Colapso en Ket Uno", true);
                    completeRound(config);
                }, 2000);

            } else if (config.mode === 'tunneling') {
                const success = result === 1; // 1 = Túnnel Success
                playTunnelResult(success);
                speak(success ? "Partícula atravesó." : "Rebote en barrera.", true);
                completeRound(config);
            } else {
                playCollapse(0);
                speak("Medición completada.");
                completeRound(config);
            }

        } catch (e) {
            console.error(e);
            speak("Error de conexión con el backend.");
        }
    }, [phase, level, userProb, speak, playCollapse, playTunnelResult]);

    const completeRound = (config) => {
        setPhase('feedback');
        setScore(s => s + config.points);
        setTimeout(() => {
            if (currentRound < config.rounds) {
                setCurrentRound(c => c + 1);
                nextRound(level);
            } else {
                if (level < 4) {
                    setLevel(l => l + 1);
                } else {
                    setPhase('victory');
                    speak("¡Victoria! Has dominado el universo.");
                }
            }
        }, 3000);
    };

    // Input Handling
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space') {
                // Initialize Audio Context on first interaction
                if (phase === 'start') {
                    runTutorial();
                } else if (phase === 'ready_to_start') {
                    startLevel(1);
                } else if (phase === 'measuring') {
                    measure();
                }
            } else if (e.code === 'ArrowLeft' && phase === 'measuring' && LEVELS[level].mode === 'navigation') {
                setUserProb(p => Math.max(0, p - 0.1));
            } else if (e.code === 'ArrowRight' && phase === 'measuring' && LEVELS[level].mode === 'navigation') {
                setUserProb(p => Math.min(1, p + 0.1));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [phase, measure, startLevel, level, LEVELS, runTutorial]);

    // Sync Audio with Prob
    useEffect(() => {
        setProbability(userProb);
    }, [userProb, setProbability]);

    // Level Watcher
    const prevLevel = useRef(1);
    useEffect(() => {
        if (level > prevLevel.current && level <= 4) {
            prevLevel.current = level;
            startLevel(level);
        }
    }, [level, startLevel]);


    return (
        <div className="game-container" aria-live="polite">
            <header>
                <h1>Quantum Sounds</h1>
                <div className="status-bar">
                    <span>Nivel: {LEVELS[level]?.name}</span>
                    <span>Puntos: {score}</span>
                    <span>Probabilidad: {(userProb * 100).toFixed(0)}% |1⟩</span>
                </div>
            </header>

            <main className={`game-phase ${phase}`}>
                {phase === 'start' && <div className="instruction">Presiona ESPACIO para Iniciar Tutorial</div>}
                {phase === 'tutorial' && <div className="instruction">🔊 Calibrando Audio...</div>}
                {phase === 'ready_to_start' && <div className="instruction pulsing">¡Listo! Presiona ESPACIO.</div>}

                {phase === 'measuring' && (
                    <div className="visualizer pulsing">
                        🔊 Escuchando Onda... <br />
                        Espacio para Medir
                    </div>
                )}
                {phase === 'feedback' && <div className="result">{lastResult}</div>}
                {phase === 'victory' && <div className="victory">¡Juego Completado!</div>}
            </main>

            <footer className="controls-hint">
                <p>H: Asistente | ⬅ ➡: Navegar (Nivel 2) | Espacio: Acción</p>
                {isListening && <span className="listening-indicator">🎤 Escuchando...</span>}
            </footer>
        </div>
    );
};
