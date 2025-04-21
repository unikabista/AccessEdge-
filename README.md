# AccessEdge - Visual Assistant for the Visually Impaired

AccessEdge is a Flask-based web application that helps visually impaired users understand their surroundings through image captioning, text-to-speech, and multilingual support.

## Features

- Image Captioning: Uses ViT-GPT2 model to generate descriptions of images
- Text-to-Speech: Converts captions to speech using gTTS
- Multilingual Support: Supports multiple languages for both captions and speech
- Web Interface: Accessible web interface with camera integration
- Progressive Web App: Can be installed as a PWA on mobile devices

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/AccessEdge.git
cd AccessEdge
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the application:
```bash
python app.py
```

The application will be available at `http://localhost:5000`

## Project Structure

```
AccessEdge/
├── app.py              # Main Flask application
├── requirements.txt    # Python dependencies
├── manifest.json      # PWA manifest
├── model/             # ML models and utilities
│   ├── caption.py     # Image captioning
│   ├── speak.py       # Text-to-speech
│   └── capture.py     # Image capture
├── static/            # Static files
│   ├── css/
│   ├── js/
│   └── icons/
├── templates/         # HTML templates
└── uploads/          # Temporary storage for captured images
```

## Usage

1. Open the web application in your browser
2. Allow camera access when prompted
3. Click the capture button or use voice command "capture" to take a photo
4. The application will:
   - Capture the image
   - Generate a caption
   - Convert the caption to speech
   - Play the audio description

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Uses the ViT-GPT2 model from Hugging Face
- gTTS for text-to-speech conversion
- Flask for the web framework 