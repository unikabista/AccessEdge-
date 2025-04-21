from gtts import gTTS
import io

def text_to_speech(text, language='en'):
    try:
        # Create a BytesIO object to store the audio
        audio_buffer = io.BytesIO()
        
        # Generate speech
        tts = gTTS(text=text, lang=language)
        tts.write_to_fp(audio_buffer)
        
        # Reset buffer position
        audio_buffer.seek(0)
        
        # Return the audio data
        return audio_buffer.getvalue()
        
    except Exception as e:
        print(f"TTS Error: {str(e)}")
        return None
