const video = document.getElementById('video');
const captionDisplay = document.getElementById('captionBox'); // 🎯 now using styled caption box
const clickSound = document.getElementById('clickSound');
const splash = document.getElementById('welcomeScreen');

let currentFacingMode = "environment";
let stream = null;
let audioUnlocked = false;

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
  console.log('🗣️ Speaking:', text);
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
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
        setTimeout(() => speakText(data.caption), 200);
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

// 🎙️ Voice commands
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    const command = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
    console.log('🎙️ Command:', command);

    if (command.includes('capture') || command.includes('take') || command.includes('photo') || command.includes('picture') || command.includes('snap')) {
      capturePhoto();
    } else if (command.includes('flip camera') || command.includes('switch camera')) {
      currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
      startCamera();
      speakText("Camera flipped");
    } else if (command.includes('read caption') || command.includes('speak caption')) {
      const text = captionDisplay.innerText.replace('📝 ', '');
      speakText(text);
    } else {
      console.log('🟡 Unrecognized voice command');
    }
  };

  recognition.onend = () => recognition.start();
} else {
  console.warn('❌ Speech recognition not supported');
}

// 🚀 Launch after splash
window.addEventListener("load", () => {
  setTimeout(() => {
    splash.style.display = 'none';
    speakText("Welcome to AccessEdge. Say capture photo or flip camera.");
    startCamera();
    recognition?.start();
  }, 3000);
});
