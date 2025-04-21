from flask import Flask, render_template, request, jsonify
from flask import send_file, send_from_directory
from model.caption import describe_image
from model.speak import text_to_speech
from model.capture import capture_image
from translate import Translator
import base64
from PIL import Image
import numpy as np
import os
import time
import shutil
from io import BytesIO
import json

print("Initializing Flask application...")
app = Flask(__name__)

# Create uploads directory if it doesn't exist
UPLOAD_FOLDER = os.path.join(app.root_path, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
print(f"Uploads directory: {UPLOAD_FOLDER}")

# Load language mappings from manifest
print("Loading language mappings...")
with open('manifest.json', 'r', encoding='utf-8') as f:
    manifest = json.load(f)
    language_mappings = manifest.get('language_mappings', {})
print(f"Loaded {len(language_mappings)} languages")

# Cleanup old files (older than 1 hour)
def cleanup_old_files():
    current_time = time.time()
    for filename in os.listdir(UPLOAD_FOLDER):
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.getmtime(filepath) < current_time - 3600:  # 1 hour
            try:
                os.remove(filepath)
                print(f"Cleaned up old file: {filename}")
            except Exception as e:
                print(f"Error cleaning up {filepath}: {e}")

@app.route('/')
def index():
    print("Serving index page...")
    cleanup_old_files()  # Cleanup on page load
    return render_template('index.html', languages=language_mappings)

@app.route('/capture', methods=['POST'])
def capture():
    try:
        print("Received capture request...")
        # Capture image
        print("Capturing image...")
        image_path = capture_image()
        if not image_path:
            print("Failed to capture image")
            return jsonify({'error': 'Failed to capture image'}), 500

        # Get language from request
        language = request.form.get('language', 'en')
        target_language = language_mappings.get(language, 'en')
        print(f"Target language: {target_language}")

        # Generate caption
        print("Generating caption...")
        caption = describe_image(image_path)
        if not caption:
            print("Failed to generate caption")
            return jsonify({'error': 'Failed to generate caption'}), 500

        # Translate caption if needed
        if target_language != 'en':
            print(f"Translating to {target_language}...")
            translator = Translator(to_lang=target_language)
            caption = translator.translate(caption)

        # Generate speech
        print("Generating speech...")
        audio_path = text_to_speech(caption, target_language)
        if not audio_path:
            print("Failed to generate speech")
            return jsonify({'error': 'Failed to generate speech'}), 500

        print("Request completed successfully")
        return jsonify({
            'caption': caption,
            'audio_path': audio_path,
            'image_path': image_path
        })

    except Exception as e:
        print(f"Error in capture route: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/manifest.json')
def manifest():
    print("Serving manifest.json...")
    return send_file('manifest.json')

@app.route('/static/<path:filename>')
def serve_static(filename):
    print(f"Serving static file: {filename}")
    return send_from_directory('static', filename)

if __name__ == '__main__':
    print("Starting Flask server...")
    app.run(host='0.0.0.0', port=5000, debug=True)