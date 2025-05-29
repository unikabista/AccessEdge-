from flask import Flask, render_template, request, jsonify, send_file
import os
import base64
import cv2
import numpy as np
import time
import speech_recognition as sr
from deep_translator import GoogleTranslator

from model.caption import load_models, describe_image
from model.speak import speak, detect_language

app = Flask(__name__)

# Preload models when app starts
print("Preloading AI models...")
load_models()
print("Models loaded successfully!")

# Language mapping for backend processing and response
LANGUAGE_MAP_BACKEND = {
    'hi': 'hi',  # Hindi
    'es': 'es',  # Spanish
    'fr': 'fr',  # French
    'de': 'de',  # German
    'ja': 'ja',  # Japanese
    'zh': 'zh-CN',  # Chinese simplified
    'ar': 'ar',  # Arabic
    'en': 'en'   # English
}

# Command patterns for different languages for backend matching
COMMAND_PATTERNS_BACKEND = {
    'hi': ['फोटो लो', 'तस्वीर खींचो', 'कैमरा बदलो', 'टेक्स्ट पढ़ो'],
    'es': ['toma una foto', 'captura una imagen', 'cambia la cámara', 'lee el texto'],
    'fr': ['prends une photo', 'capture une image', 'change de caméra', 'lis le texte'],
    'de': ['mach ein foto', 'nimm ein bild auf', 'wechsle die kamera', 'lies den text'],
    'ja': ['写真を撮って', 'カメラを切り替えて', 'テキストを読んで'], # Simplified Japanese patterns
    'zh': ['拍照', '切换相机', '读文字'], # Simplified Chinese patterns
    'ar': ['خذ صورة', 'بدل الكاميرا', 'اقرأ النص'], # Simplified Arabic patterns
    'en': ['take a photo', 'capture photo', 'take picture', 'capture image', 'describe this', 'what do you see', 'describe scene', 'read the text', 'read text', 'what text do you see', 'read what\'s written', 'flip camera', 'switch camera', 'change camera']
}

# Mapping recognized command patterns to actions
ACTION_MAPPING = {
    'capture': ['फोटो लो', 't तस्वीर खींचो', 'toma una foto', 'captura una imagen', 'prends une photo', 'capture une image', 'mach ein foto', 'nimm ein bild auf', '写真を撮って', '拍照', 'خذ صورة', 'take a photo', 'capture photo', 'take picture', 'capture image', 'describe this', 'what do you see', 'describe scene'],
    'read': ['टेक्स्ट पढ़ो', 'lee el texto', 'lis le texte', 'lies den text', 'テキストを読んで', '读文字', 'اقرأ النص', 'read the text', 'read text', 'what text do you see', 'read what\'s written'],
    'flip': ['कैमरा बदलो', 'cambia la cámara', 'change de caméra', 'wechsle die kamera', 'カメラを切り替えて', '切换相机', 'بدل الكاميرا', 'flip camera', 'switch camera', 'change camera']
}

def get_action_from_command(command_text, detected_lang):
    """Determines the action based on the command text and detected language."""
    command_text_lower = command_text.lower()
    lang_patterns = COMMAND_PATTERNS_BACKEND.get(detected_lang, COMMAND_PATTERNS_BACKEND['en'])

    for pattern in lang_patterns:
        if pattern.lower() in command_text_lower:
            # Map pattern to action
            for action, patterns in ACTION_MAPPING.items():
                if pattern.lower() in [p.lower() for p in patterns]:
                    return action

    return None # No action found

# 2) Serve your main PWA page
@app.route('/')
def index():
    return render_template('index.html')

# 3) New intent parsing endpoint (local processing)
@app.route("/api/intent", methods=["POST"])
def parse_intent():
    try:
        # Get the spoken command
        user_text = request.json.get("text", "")
        
        # Detect language using Google's language detection
        try:
            translator = GoogleTranslator(source='auto', target='en')
            detected_lang_full = translator.detect(user_text)['lang']
            # Use simplified language code for mapping
            detected_lang = detected_lang_full.split('-')[0] # e.g., 'en' from 'en-US'
        except Exception as e:
            print(f"Language detection error: {e}")
            detected_lang = 'en' # Default to English if detection fails

        # Get standardized language code using our mapping
        standardized_lang = LANGUAGE_MAP_BACKEND.get(detected_lang, 'en')

        # Determine action based on command text and detected language
        action = get_action_from_command(user_text, standardized_lang)

        if action:
            return jsonify({
                'language': standardized_lang,
                'action': action,
                'status': 'success'
            })
        else:
            return jsonify({
                'language': standardized_lang, # Return detected language even if command is not recognized
                'action': None,
                'status': 'unrecognized_command'
            })

    except Exception as e:
        print(f"Intent parsing endpoint error: {e}")
        return jsonify({
            'language': 'en', # Default language on error
            'action': None,
            'status': 'error',
            'error': str(e)
        }), 500

# 4) Existing capture endpoint for BLIP captioning + TTS
@app.route('/capture', methods=['POST'])
def capture():
    try:
        # Automatically detects user's language for the spoken response
        # This detect_language is from model/speak.py and listens to the microphone again.
        # This might be redundant if the language was already detected by the /api/intent call.
        # Consider if we should pass the detected language from the intent call instead.
        user_language = detect_language() 
        print(f"Detected language for speech: {user_language}")
        
        # Decode image directly to memory
        data = request.json.get('image', '')
        if not data:
            return jsonify({'error': 'No image data provided'}), 400

        header, encoded = data.split(",", 1)
        img_data = base64.b64decode(encoded)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({'error': 'Failed to decode image'}), 400

        # Save to temporary file with timestamp
        filename = f'captured_{int(time.time())}.jpg'
        cv2.imwrite(filename, img)

        try:
            # Generate description
            description = describe_image(filename)
            print("Generated description:", description)

            # Speak the description in user's language
            # Pass the user_language detected by this endpoint for speaking.
            speak(description, language=user_language)

            return jsonify({
                'caption': description,
                'language': user_language, # Return language used for speech
                'status': 'success',
                'message': 'Image processed successfully'
            })
        finally:
            # Clean up the image file
            try:
                os.remove(filename)
            except Exception as cleanup_error:
                print(f"Error cleaning up image file {filename}: {cleanup_error}")
                pass # Continue even if cleanup fails

    except Exception as e:
        print("Error in /capture:", e)
        return jsonify({
            'error': str(e),
            'status': 'error',
            'message': 'Failed to process image'
        }), 500

# Note: The detect_language function is now imported from model.speak

if __name__ == '__main__':
    # Run on port 5002 for example; adjust as needed
    # Running with debug=True temporarily for easier troubleshooting if needed.
    app.run(host='0.0.0.0', port=5002, debug=True)
