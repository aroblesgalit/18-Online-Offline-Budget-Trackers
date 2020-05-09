console.log("Hello from service worker!");

// Set up cache files
const FILES_TO_CACHE = [
    "/",
    "/index.html",
    "/index.js",
    "/manifest.webmanifest",
    "/styles.css",
    "/icons/icon-192x192.png",
    "/icons/icon-512x512.png",
    "https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css",
    "https://cdn.jsdelivr.net/npm/chart.js@2.8.0"
];

const CACHE_NAME = "my-site-cache-v2";
const DATA_CACHE_NAME = "data-cache-v2";

// Install and register service worker
self.addEventListener("install", function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log("Your files were pre-cached successfully!");
            return cache.addAll(FILES_TO_CACHE);
        })
    );

    self.skipWaiting();
});

// Activation
self.addEventListener("activate", function(event) {
    event.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(
                keyList.map(key => {
                    if (key !== CACHE_NAME && key != DATA_CACHE_NAME) {
                        console.log("Removing old cache data", key);
                        return caches.delete(key);
                    }
                })
            )
        })
    );

    self.clients.claim();
})

// Enable the service worker to intercept network requests
self.addEventListener("fetch", function(event) {
    // Handle requests
    // Cache repsonses for requests for data
    if (event.request.url.includes("/api/") && event.request.method === "GET") {
        console.log("[Service Worker] Fetch (data)", event.request.url);

        event.respondWith(
            caches.open(DATA_CACHE_NAME).then(cache => {
                // If it's successful put it in our cache
                return fetch(event.request)
                    .then(response => {
                        if (response.status === 200) {
                            cache.put(event.request.url, response.clone());
                        }

                        return response;
                    })
                    // If not successful, then pull it from our cache
                    .catch(err => {
                        return cache.match(event.request);
                    });
            })
            .catch(err => {
                console.log(err);
            })
        );

        return;
    }

    // Serve static files from the cache.
    // Proceed with a network request when the resource is not in the cache
    // This code allows the page to be accessible offline
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(response => {
                return response || fetch(event.request);
            });
        })
        .catch(err => {
            console.log(err)
        })
    );
});