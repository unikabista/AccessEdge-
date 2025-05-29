const video = document.getElementById('video');
const captionDisplay = document.getElementById('captionBox'); // 🎯 now using styled caption box
const clickSound = document.getElementById('clickSound');
const splash = document.getElementById('welcomeScreen');

let currentFacingMode = "environment";
let stream = null;
let audioUnlocked = false;
let currentLanguage = 'en-US'; // Default language

// Language mapping for speech recognition and synthesis (Frontend uses this for speakText)
const LANGUAGE_MAP_FRONTEND = {
    'hi': 'hi-IN',  // Hindi
    'es': 'es-ES',  // Spanish
    'fr': 'fr-FR',  // French
    'de': 'de-DE',  // German
    'ja': 'ja-JP',  // Japanese
    'zh': 'zh-CN',  // Chinese
    'ar': 'ar-SA',  // Arabic
    'en': 'en-US'   // English
};

// Language code to name mapping for announcements
const LANGUAGE_NAMES = {
    'hi': 'Hindi',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'ja': 'Japanese',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'en': 'English'
};

// Command patterns for different languages
const COMMAND_PATTERNS = {
    'hi': {
        capture: ['फोटो', 'तस्वीर', 'कैप्चर'],
        flip: ['कैमरा बदलो', 'कैमरा बदल'],
        read: ['पढ़ो', 'टेक्स्ट पढ़ो']
    },
    'es': {
        capture: ['foto', 'captura', 'tomar'],
        flip: ['cambiar cámara', 'voltear cámara'],
        read: ['leer', 'leer texto']
    },
    'fr': {
        capture: ['photo', 'capture', 'prendre'],
        flip: ['changer caméra', 'retourner caméra'],
        read: ['lire', 'lire texte']
    },
    'de': {
        capture: ['foto', 'aufnahme', 'machen'],
        flip: ['kamera wechseln', 'kamera umdrehen'],
        read: ['lesen', 'text lesen']
    },
    'ja': {
        capture: ['写真', '撮影', '撮る'],
        flip: ['カメラ切り替え', 'カメラ反転'],
        read: ['読む', 'テキスト読む']
    },
    'zh': {
        capture: ['拍照', '拍摄', '照相'],
        flip: ['切换相机', '翻转相机'],
        read: ['阅读', '读文字']
    },
    'ar': {
        capture: ['صورة', 'التقاط', 'تصوير'],
        flip: ['تغيير الكاميرا', 'قلب الكاميرا'],
        read: ['قراءة', 'قراءة النص']
    },
    'en': {
        capture: ['photo', 'capture', 'take', 'picture', 'snap'],
        flip: ['flip camera', 'switch camera'],
        read: ['read', 'read text', 'what does it say']
    }
};

// 🔓 Unlock autoplay audio
window.addEventListener('click', () => {
  if (!audioUnlocked) {
    const unlock = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(unlock);
    window.speechSynthesis.cancel();
    console.log('🔓 Audio unlocked by user tap');
    audioUnlocked = true;
  }
}, { once: true });

// 🎥 Start the camera with specified facing mode
const startCamera = async () => {
  try {
    if (stream) stream.getTracks().forEach(track => track.stop());

    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentFacingMode },
      audio: true
    });

    video.srcObject = stream;
  } catch (error) {
    console.error("Camera error:", error);
    alert("Camera access failed. Please allow camera in your settings.");
  }
};

// 🔊 Speak text aloud
function speakText(text, lang = currentLanguage) {
  console.log('🗣️ Speaking:', text);
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.pitch = 1;
  utterance.rate = 1;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
}

// 📸 Capture photo
function capturePhoto() {
  console.log("📸 Capturing photo");

  if (clickSound) clickSound.play();

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  const imageData = canvas.toDataURL('image/jpeg');

  fetch('/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageData })
  })
    .then(res => res.json())
    .then(data => {
      if (data.caption) {
        const finalCaption = '📝 ' + data.caption;
        captionDisplay.innerText = finalCaption;
        // Use the language returned from the backend /capture endpoint for speaking
        setTimeout(() => speakText(data.caption, LANGUAGE_MAP_FRONTEND[data.language] || currentLanguage), 200);
      } else {
        captionDisplay.innerText = '❌ Failed to get caption.';
        speakText("Sorry, I couldn't describe the scene.", currentLanguage);
      }
    })
    .catch(err => {
      console.error('Error:', err);
      speakText("Something went wrong capturing the photo.", currentLanguage);
    });
}

function readTextFromCamera() {
  console.log("📖 OCR capture triggered");

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  const imageData = canvas.toDataURL('image/png');

  speakText("Reading text. Please hold steady.", currentLanguage);

  Tesseract.recognize(imageData, 'eng', {
    logger: m => console.log(m)
  }).then(({ data: { text } }) => {
    if (text.trim()) {
      console.log("📝 OCR Text:", text.trim());
      speakText("I read: " + text.trim(), currentLanguage);
    } else {
      speakText("Sorry, I couldn't detect any readable text.", currentLanguage);
    }
  }).catch(err => {
    console.error("OCR error:", err);
    speakText("There was an error reading the text.", currentLanguage);
  });
}

// 🎙️ Voice commands
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  // Set initial language for recognition. This will be updated by backend detection.
  recognition.lang = currentLanguage;

  recognition.onresult = (event) => {
    const command = event.results[event.results.length - 1][0].transcript.trim(); // Get the raw transcript
    console.log('🎙️ Command:', command);

    // Send command to backend for language detection and intent parsing
    fetch('/api/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: command })
    })
    .then(res => res.json())
    .then(data => {
      console.log('🧠 Backend Intent Data:', data);
      if (data.status === 'success' && data.action) {
        // Update current language based on backend detection
        currentLanguage = LANGUAGE_MAP_FRONTEND[data.language] || currentLanguage; // Use backend language for subsequent speech
        recognition.lang = currentLanguage; // Update recognition language

        // Execute action based on backend response
        if (data.action === 'capture') {
          capturePhoto();
        } else if (data.action === 'read') {
          readTextFromCamera();
        } else if (data.action === 'flip') {
          currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
          startCamera();
          speakText("Camera flipped", currentLanguage);
        } else {
           console.log('🟡 Unrecognized action from backend:', data.action);
           speakText("Sorry, I didn't understand that command.", currentLanguage);
        }
      } else if (data.status === 'unrecognized_command'){
         console.log('🟡 Backend could not recognize command.');
         speakText("Sorry, I didn't understand that command.", currentLanguage);
      }
       else {
        console.error('❌ Error from backend intent parsing:', data.error || 'Unknown error');
        speakText("There was an error processing your command.", currentLanguage);
      }
    })
    .catch(err => {
      console.error('❌ Error communicating with backend intent endpoint:', err);
      speakText("Something went wrong processing your command.", currentLanguage);
    });
  };

  recognition.onerror = (event) => {
    console.error('❌ Speech recognition error:', event.error);
    // Optionally provide user feedback on speech recognition errors
    // speakText("Speech recognition error.", currentLanguage);
  };

  recognition.onend = () => {
      console.log('🎙️ Speech recognition ended. Restarting...');
      recognition.start(); // Restart recognition after it ends
  };
} else {
  console.warn('❌ Speech recognition not supported');
  captionDisplay.innerText = '❌ Speech recognition not supported in this browser.';
}

// 🚀 Launch after splash
window.addEventListener("load", () => {
  setTimeout(() => {
    splash.style.display = 'none';
    // Initial greeting - will be in default or previously detected language
    speakText("Welcome to Dristi. Say capture photo or flip camera.", currentLanguage);
    startCamera();
    recognition?.start(); // Start speech recognition on load
  }, 3000);
});