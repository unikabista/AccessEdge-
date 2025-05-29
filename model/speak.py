import pyttsx3
from deep_translator import GoogleTranslator
import speech_recognition as sr

# Language code mapping
LANGUAGE_CODES = {
    'hi': 'hi',  # Hindi
    'es': 'es',  # Spanish
    'fr': 'fr',  # French
    'de': 'de',  # German
    'ja': 'ja',  # Japanese
    'zh': 'zh-CN',  # Chinese
    'ar': 'ar',  # Arabic
    'en': 'en'   # English
}

def detect_language():
    """Detect the language from user's speech"""
    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        print("Listening for language detection...")
        audio = recognizer.listen(source)
        try:
            # Detect language using Google's speech recognition
            result = recognizer.recognize_google(audio, show_all=True)
            if result and 'alternative' in result:
                # Get the detected language code
                lang_code = result['alternative'][0]['language']
                # Map to supported language code
                return LANGUAGE_CODES.get(lang_code, 'en')
        except Exception as e:
            print(f"Language detection error: {e}")
    return 'en'  # Default to English if detection fails

def translate_text(text, target_lang):
    """Translate text to target language"""
    try:
        # Map language code to supported format
        target_lang = LANGUAGE_CODES.get(target_lang, 'en')
        translator = GoogleTranslator(source='auto', target=target_lang)
        translation = translator.translate(text)
        return translation
    except Exception as e:
        print(f"Translation error: {e}")
        return text  # Return original text if translation fails

def speak(text, language='en'):
    try:
        # Initialize the engine
        engine = pyttsx3.init()
        
        # Set properties for clear speech
        engine.setProperty('rate', 150)    # Speaking rate
        engine.setProperty('volume', 1.0)  # Volume
        
        # Translate text if not in English
        if language != 'en':
            text = translate_text(text, language)
        
        # Speak the description
        engine.say(text)
        engine.runAndWait()
        
    except Exception as e:
        print(f"Speech Error: {e}")
        # Continue even if speech fails
