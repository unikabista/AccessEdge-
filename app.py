from flask import Flask, render_template, request, jsonify, send_file
import os
import requests
import base64
import cv2
import numpy as np
from dotenv import load_dotenv

from model.caption import describe_image
from model.speak import speak

# 1) Load environment variables (your EDENAI_API_KEY lives in .env)
load_dotenv()
EDEN_KEY = os.getenv("EDENAI_API_KEY")
BASE_URL = "https://api.edenai.run/v2"

app = Flask(__name__)

# 2) Serve your main PWA page
@app.route('/')
def index():
    return render_template('index.html')

# 3) New GPT-3.5-turbo intent parsing endpoint
@app.route("/api/intent", methods=["POST"])
def parse_intent():
    user_text = request.json.get("text", "")
    system_prompt = (
        "You are an intent parser. Given a user command, output ONLY "
        "a JSON object with 'action' (capture_photo, read_text, flip_camera, describe_scene) "
        "and any params."
    )
    payload = {
        "providers": ["openai/gpt-3.5-turbo"],
        "prompt": system_prompt + f" Command: \"{user_text}\"",
        "max_tokens": 60,
        "temperature": 0
    }
    headers = {
        "Authorization": f"Bearer {EDEN_KEY}",
        "Content-Type": "application/json"
    }
    resp = requests.post(f"{BASE_URL}/language/text_generation",
                         json=payload, headers=headers)
    return jsonify(resp.json()), resp.status_code

# 4) Existing capture endpoint for BLIP captioning + TTS
@app.route('/capture', methods=['POST'])
def capture():
    try:
        data = request.json.get('image', '')
        if not data:
            return jsonify({'error': 'No image data provided'}), 400

        header, encoded = data.split(",", 1)
        img_data = base64.b64decode(encoded)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({'error': 'Failed to decode image'}), 400

        filename = 'captured.jpg'
        cv2.imwrite(filename, img)

        caption = describe_image(filename)

        # Optional server-side TTS fallback
        try:
            speak(caption)
        except Exception as tts_error:
            print("TTS Error:", tts_error)

        return jsonify({'caption': caption})

    except Exception as e:
        print("Error in /capture:", e)
        return jsonify({'error': str(e)}), 500

# 5) Serve your PWA manifest
@app.route('/manifest.json')
def manifest():
    return send_file('manifest.json')

if __name__ == '__main__':
    # Run on port 5002 for example; adjust as needed
    app.run(host='0.0.0.0', port=5002, debug=True)
