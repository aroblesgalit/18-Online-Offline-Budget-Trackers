console.log("Hello from service worker!");

// Set up cache files
const FILES_TO_CACHE = [
    "/",
    "/index.html",
    "/index.js",
    "/manifest.webmanifest",
    "/style.css",
    "/icons/icon-192x192.png",
    "/icons/icon-512x512.png"
];

const CACHE_NAME = "static-cache-v2";
const DATA_CACHE_NAME = "data-cache-v1";

// Install and register service worker
self.addEventListener("install", e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("Your files were pre-cached successfully!");
            return cache.addAll(FILES_TO_CACHE);
        })
    );

    self.skipWaiting();
});

// Enable the service worker to intercept network requests
self.addEventListener("fetch", e => {
    // Handle requests
    // Serve static files from the cache.
    // Proceed with a network request when the resource is not in the cache
    // This code allows the page to be accessible offline
    e.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(e.request).then(response => {
                return response || fetch(e.request);
            });
        })
    );
});