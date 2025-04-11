const video = document.getElementById('video');
const captureBtn = document.getElementById('captureBtn');
const captionDisplay = document.getElementById('caption');

navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
        video.srcObject = stream;
    })
    .catch((err) => {
        console.error('Camera access error:', err);
    });

captureBtn.addEventListener('click', capturePhoto);

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
        captionDisplay.innerText = '📝 Caption: ' + data.caption;
        speakText(data.caption);
    })
    .catch(err => {
        console.error('Error:', err);
    });
}

function speakText(text) {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    synth.speak(utterance);
}

// Voice recognition for voice commands
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        const command = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        console.log('Voice command:', command);
        if (command.includes('capture photo') || command.includes('take photo')) {
            capturePhoto();
        } else if (command.includes('read caption') || command.includes('speak caption')) {
            const text = captionDisplay.innerText.replace('📝 Caption: ', '');
            speakText(text);
        }
    };

    recognition.start();
} else {
    console.log('Speech recognition not supported in this browser.');
}
