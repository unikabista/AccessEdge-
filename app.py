from flask import Flask, render_template, request, jsonify
from flask import send_file
from model.caption import describe_image
from model.speak import speak
import base64
import cv2
import numpy as np
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

import base64
import numpy as np
import cv2
from flask import request, jsonify

@app.route('/capture', methods=['POST'])
def capture():
    try:
        data = request.json.get('image', '')
        if not data:
            return jsonify({'error': 'No image data provided'}), 400

        header, encoded = data.split(",")
        img_data = base64.b64decode(encoded)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({'error': 'Failed to decode image'}), 400

        filename = 'captured.jpg'
        cv2.imwrite(filename, img)

        caption = describe_image(filename)

        # Optional: speak the caption (may not work in Codespaces)
        try:
            speak(caption)
        except Exception as tts_error:
            print("TTS Error:", tts_error)

        return jsonify({'caption': caption})

    except Exception as e:
        print("Error in /capture:", e)
        return jsonify({'error': str(e)}), 500


@app.route('/manifest.json')
def manifest():
    return send_file('manifest.json')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)