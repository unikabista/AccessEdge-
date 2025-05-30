import pyttsx3
import speech_recognition as sr

def detect_speech():
    """Detect speech from user's microphone"""
    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        print("Listening...")
        audio = recognizer.listen(source)
        try:
            # Use Google's speech recognition
            text = recognizer.recognize_google(audio)
            return text
        except Exception as e:
            print(f"Speech recognition error: {e}")
    return None

def speak(text):
    """Speak the given text"""
    try:
        # Initialize the engine
        engine = pyttsx3.init()
        
        # Set properties for clear speech
        engine.setProperty('rate', 150)    # Speaking rate
        engine.setProperty('volume', 1.0)  # Volume
        
        # Speak the text
        print(f"Speaking: {text}")
        engine.say(text)
        engine.runAndWait()
        
    except Exception as e:
        print(f"Speech Error: {e}")
        # Continue even if speech fails
