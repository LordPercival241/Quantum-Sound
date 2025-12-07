from flask import Flask, jsonify, request
from flask_cors import CORS
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from qiskit import transpile
import numpy as np

import numpy as np

app = Flask(__name__)
CORS(app)

@app.route('/api/measure', methods=['POST'])
def measure_qubit():
    try:
        data = request.get_json()
        mode = data.get('mode', 'superposition')
        probability = data.get('probability', 0.5)

        qc = QuantumCircuit(1, 1)

        if mode == 'superposition':
            # Hadamard Gate: Equal superposition |0> + |1>
            qc.h(0)
        
        elif mode == 'navigation' or mode == 'tunneling':
            # Ry Rotation Gate: Set probability of |1>
            # P(|1>) = sin^2(theta/2)
            # theta = 2 * arcsin(sqrt(P))
            theta = 2 * np.arcsin(np.sqrt(probability))
            qc.ry(theta, 0)

        # Measure
        qc.measure(0, 0)

        # Execute
        simulator = AerSimulator()
        compiled_circuit = transpile(qc, simulator)
        job = simulator.run(compiled_circuit, shots=1)
        result = job.result()
        counts = result.get_counts()
        
        # Result "0" or "1"
        collapsed_value = list(counts.keys())[0]

        return jsonify({
            'success': True,
            'mode': mode,
            'probability_target': probability,
            'result': int(collapsed_value)
        })

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 Servidor Cuántico (Modo Juego) Iniciado en http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
