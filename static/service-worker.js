self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open("accessedge-cache").then(function (cache) {
      return cache.addAll(["/"]);
    })
  );
});

window.addEventListener('click', () => {
  // This user gesture will unlock audio playback
  console.log('🔓 TTS unlocked after user click');
}, { once: true });  

self.addEventListener("fetch", function (e) {
  e.respondWith(
    caches.match(e.request).then(function (response) {
      return response || fetch(e.request);
    })
  );
});
