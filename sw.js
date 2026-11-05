/* whya service worker — notifikasi + cache ringan */
const CACHE = "whya-static-v2";
const PRECACHE = [
  "/",
  "/index.html",
  "/login.html",
  "/dashboard.html",
  "/icon-192.png",
  "/icon-32.png",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // network-first for HTML, cache-first for static assets
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith(".html") || url.pathname === "/") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/login.html")))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => hit))
  );
});

// Notifikasi dari client via postMessage atau showNotification langsung
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const action = event.action;
  let target = "/dashboard.html";
  if (data.roomId) {
    target = "/dashboard.html?open=" + encodeURIComponent(data.roomId);
  }
  if (action === "mute" && data.roomId) {
    // client akan handle mute saat focus
    target = "/dashboard.html?mute=" + encodeURIComponent(data.roomId);
  }
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.postMessage({ type: "notif-click", data: data, action: action });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});

self.addEventListener("message", (event) => {
  const msg = event.data || {};
  if (msg.type === "show-notif") {
    const { title, options } = msg;
    event.waitUntil(self.registration.showNotification(title || "whya", options || {}));
  }
});
