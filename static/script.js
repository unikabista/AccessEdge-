const video = document.getElementById('video');
const captureBtn = document.getElementById('captureBtn');
const captionDisplay = document.getElementById('caption');
const flipBtn = document.getElementById('flipCamera');

window.addEventListener('click', () => {
    // Unlock autoplay audio by speaking and immediately cancelling
    const unlock = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(unlock);
    window.speechSynthesis.cancel();
    console.log('🔓 Audio unlocked by user tap');
  }, { once: true });
  

let currentFacingMode = "environment"; // Start with back camera
let stream = null;

// Start camera based on current facing mode
const startCamera = async () => {
  try {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentFacingMode }
    });

    video.srcObject = stream;
  } catch (error) {
    console.error("Camera error:", error);
    alert("Camera access failed. Please allow camera in your settings.");
  }
};

// Flip camera button
flipBtn.addEventListener("click", () => {
  currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
  startCamera();
});

// Load camera on page load
window.addEventListener("load", () => {
  startCamera();
});

// Capture photo from video feed
function capturePhoto() {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  const imageData = canvas.toDataURL('image/jpeg');

  fetch('/capture', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ image: imageData })
  })
    .then(res => res.json())
    .then(data => {
      if (data.caption) {
        captionDisplay.innerText = '📝 Caption: ' + data.caption;
        speakText(data.caption);
      } else {
        captionDisplay.innerText = '❌ Failed to get caption.';
      }
    })
    .catch(err => {
      console.error('Error:', err);
    });
}

// Speak the given text aloud
function speakText(text) {
    console.log('🗣️ Attempting to speak:', text);
  
    if (!('speechSynthesis' in window)) {
      console.warn('❌ TTS not supported');
      return;
    }
  
    window.speechSynthesis.cancel(); // cancel any previous
  
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.pitch = 1;
    utterance.rate = 1;
    utterance.volume = 1;
  
    utterance.onstart = () => console.log('🟢 TTS started');
    utterance.onend = () => console.log('✅ TTS finished');
    utterance.onerror = (err) => console.error('❌ TTS error:', err);
  
    window.speechSynthesis.speak(utterance);
  }
  

// Button click to capture photo
captureBtn.addEventListener('click', capturePhoto);

// Voice recognition for commands
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    const command = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
    console.log('🎙️ Voice command:', command);

    if (command.includes('capture photo') || command.includes('take photo')) {
      capturePhoto();
    } else if (command.includes('read caption') || command.includes('speak caption')) {
      const text = captionDisplay.innerText.replace('📝 Caption: ', '');
      speakText(text);
    } else {
      console.log('Unrecognized voice command.');
    }
  };

  recognition.start();
} else {
  console.log('❌ Speech recognition not supported in this browser.');
}
