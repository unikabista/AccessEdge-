const video = document.getElementById('video');
const captionDisplay = document.getElementById('captionBox'); // 🎯 now using styled caption box
const clickSound = document.getElementById('clickSound');
const splash = document.getElementById('welcomeScreen');

// Accessibility features
const statusMessages = document.getElementById('statusMessages');
const languageSelect = document.getElementById('languageSelect');
const notificationSound = document.getElementById('notificationSound');

let currentFacingMode = "environment";
let stream = null;
let audioUnlocked = false;
let currentLanguage = languageSelect.value;

// Language detection mapping
const LANGUAGE_MAPPING = {
    'en-US': 'en',
    'es-ES': 'es',
    'fr-FR': 'fr',
    'de-DE': 'de',
    'it-IT': 'it',
    'pt-BR': 'pt',
    'ru-RU': 'ru',
    'ja-JP': 'ja',
    'ko-KR': 'ko',
    'zh-CN': 'zh-cn',
    'hi-IN': 'hi',
    'ar-SA': 'ar'
};

// Announce status changes
function announceStatus(message, priority = 'polite') {
    statusMessages.setAttribute('aria-live', priority);
    statusMessages.textContent = message;
    speakText(message);
}

// Enhanced speak function with language support
function speakText(text, language = currentLanguage) {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.9; // Slightly slower for better comprehension
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
}

// Handle language changes
languageSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    const languageName = e.target.options[e.target.selectedIndex].text;
    announceStatus(`Language changed to ${languageName}`);
});

// 🔓 Unlock autoplay audio
window.addEventListener('click', () => {
  if (!audioUnlocked) {
    const unlock = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(unlock);
    window.speechSynthesis.cancel();
    console.log('🔓 Audio unlocked by user tap');
    audioUnlocked = true;
    announceStatus('Audio enabled. You can now use voice commands.');
  }
}, { once: true });

// 🎥 Start the camera with specified facing mode
const startCamera = async () => {
  try {
    if (stream) stream.getTracks().forEach(track => track.stop());

    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentFacingMode },
      audio: true // ✅ Add this!
    });

    video.srcObject = stream;
    announceStatus('Camera started successfully');
  } catch (error) {
    console.error("Camera error:", error);
    announceStatus("Camera access failed. Please allow camera in your settings.", 'assertive');
  }
};

// 📸 Capture photo
async function capture() {
  announceStatus('Capturing image...');
  notificationSound.play();

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  const imageData = canvas.toDataURL('image/jpeg');

  try {
    announceStatus('Processing image...');
    const response = await fetch('/capture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageData,
        language: currentLanguage
      }),
    });
    
    const data = await response.json();
    if (data.error) {
      console.error('Error:', data.error);
      return;
    }
    
    // Update caption with language information
    const captionWithLanguage = `${data.caption} (${data.language_name})`;
    captionDisplay.textContent = captionWithLanguage;
    announceStatus(captionWithLanguage);

    // Play the audio if available
    if (data.audio) {
      const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
      audio.play().catch(e => console.error('Audio playback failed:', e));
    }
  } catch (error) {
    console.error('Error:', error);
    announceStatus("Something went wrong capturing the photo.", 'assertive');
  }
}

function readTextFromCamera() {
  console.log("📖 OCR capture triggered");

  const canvas = document.createElement('canvas');
  canvas.width = video.videoHeight;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  const imageData = canvas.toDataURL('image/png');

  speakText("Reading text. Please hold steady.");

  Tesseract.recognize(imageData, 'eng', {
    logger: m => console.log(m)
  }).then(({ data: { text } }) => {
    if (text.trim()) {
      console.log("📝 OCR Text:", text.trim());
      speakText("I read: " + text.trim());
    } else {
      speakText("Sorry, I couldn't detect any readable text.");
    }
  }).catch(err => {
    console.error("OCR error:", err);
    speakText("There was an error reading the text.");
  });
}

// 🎙️ Voice commands
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  
  // Start with browser's default language
  recognition.lang = navigator.language || 'en-US';
  currentLanguage = LANGUAGE_MAPPING[recognition.lang] || 'en';

  recognition.onstart = () => {
    announceStatus('Voice recognition started');
  };

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    const command = result[0].transcript.trim().toLowerCase();
    const detectedLanguage = LANGUAGE_MAPPING[result[0].lang] || 'en';
    
    // Update language if different
    if (detectedLanguage !== currentLanguage) {
        currentLanguage = detectedLanguage;
        recognition.lang = result[0].lang;
        announceStatus(`Language detected: ${SUPPORTED_LANGUAGES[currentLanguage]}`);
    }

    console.log('Command:', command, 'Language:', currentLanguage);

    if (command.includes('capture') || command.includes('take') || command.includes('photo')) {
      capture();
    } else if (command.includes('flip camera') || command.includes('switch camera')) {
      currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
      startCamera();
      announceStatus(`Camera flipped to ${currentFacingMode} view`);
    } else if (command.includes('read caption') || command.includes('speak caption')) {
      const text = captionDisplay.textContent;
      announceStatus(text);
    } else if (command.includes('help') || command.includes('commands')) {
      announceStatus('Available commands: capture photo, flip camera, read caption, help');
    } else {
      announceStatus('Command not recognized. Say "help" for available commands.');
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    announceStatus(`Speech recognition error: ${event.error}`, 'assertive');
  };

  recognition.onend = () => {
    if (!audioUnlocked) {
      announceStatus('Please click anywhere to enable audio');
    } else {
      recognition.start();
    }
  };
} else {
  console.warn('❌ Speech recognition not supported');
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'Enter':
            capture();
            break;
        case 'f':
            currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
            startCamera();
            break;
        case 'r':
            const text = captionDisplay.textContent;
            announceStatus(text);
            break;
        case 'h':
            announceStatus('Keyboard shortcuts: Enter to capture, F to flip camera, R to read caption, H for help');
            break;
    }
});

// 🚀 Launch after splash
window.addEventListener("load", () => {
  setTimeout(() => {
    splash.style.display = 'none';
    speakText("Welcome to AccessEdge. Say capture photo or flip camera.");
    startCamera();
    recognition?.start();
  }, 3000);
});