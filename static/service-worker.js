const CACHE_NAME = 'accessedge-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/static/style.css',
  '/static/script.js',
  '/static/click.mp3',
  '/static/notification.mp3',
  '/static/icon-192.png',
  '/static/icon-512.png',
  '/static/Welcome!.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

window.addEventListener('click', () => {
  // This user gesture will unlock audio playback
  console.log('🔓 TTS unlocked after user click');
}, { once: true });  

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
