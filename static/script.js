const video = document.getElementById('video');
const captionDisplay = document.getElementById('caption');

// 🔓 Unlock autoplay audio on first interaction
window.addEventListener('click', () => {
  const unlock = new SpeechSynthesisUtterance('');
  window.speechSynthesis.speak(unlock);
  window.speechSynthesis.cancel();
  console.log('🔓 Audio unlocked by user tap');
}, { once: true });

let currentFacingMode = "environment";
let stream = null;

// 🎥 Start the camera with specified facing mode
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

// 🔊 Speak text aloud
function speakText(text) {
  console.log('🗣️ Attempting to speak:', text);

  if (!('speechSynthesis' in window)) {
    console.warn('❌ TTS not supported');
    return;
  }

  window.speechSynthesis.cancel();

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

// 📸 Capture a photo and fetch caption
function capturePhoto() {
  console.log("📸 capturePhoto() triggered");

  const clickSound = document.getElementById('clickSound');
  if (clickSound) clickSound.play();

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
        const finalCaption = '📝 Caption: ' + data.caption;
        captionDisplay.innerText = finalCaption;
        setTimeout(() => {
          speakText(data.caption);
        }, 200); // small delay for DOM update
      } else {
        captionDisplay.innerText = '❌ Failed to get caption.';
        speakText("Sorry, I couldn't describe the scene.");
      }
    })
    .catch(err => {
      console.error('Error:', err);
      speakText("Something went wrong capturing the photo.");
    });
}

// 🎙️ Voice recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    const command = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
    console.log('🎙️ Voice command:', command);

    if (
      command.includes('capture') ||
      command.includes('take') ||
      command.includes('photo') ||
      command.includes('picture') ||
      command.includes('snap')
    ) {
      console.log("🟢 Voice matched: capturePhoto()");
      capturePhoto();
    } 
    else if (
      command.includes('flip camera') ||
      command.includes('switch camera')
    ) {
      currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
      startCamera();
      speakText("Camera flipped");
    } 
    else if (
      command.includes('read caption') ||
      command.includes('speak caption')
    ) {
      const text = captionDisplay.innerText.replace('📝 Caption: ', '');
      speakText(text);
    } 
    else {
      console.log('🟡 Unrecognized voice command.');
    }
  };

  recognition.onend = () => {
    console.log("🔁 Voice recognition restarted");
    recognition.start();
  };

  recognition.start();
} else {
  console.log('❌ Speech recognition not supported in this browser.');
}

// 🚀 Start camera on load
window.addEventListener("load", () => {
  startCamera();
});
