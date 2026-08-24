const CACHE_NAME = "gpp-relax-pa1-pa2-final-v2-3-3";
const BASE = new URL("./", self.registration.scope);
const CORE_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./logo-icon.png",
  "./logo-icon-192.png",
  "./logo-icon-512.png",
  "./logo.png",
  "./hospital-map.jpg",
  "./hospital-upgrade-1.jpg",
  "./hospital-upgrade-2.jpg",
  "./hospital-upgrade-3.jpg",
  "./hospital-upgrade-4.jpg"
].map((path) => new URL(path, BASE).toString());

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_FILES)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)); return response;
    }).catch(() => caches.match(new URL("./index.html", BASE))));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)); return response;
  })));
});
