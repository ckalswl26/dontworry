const RUNTIME_CACHE = "dontworry-runtime-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== RUNTIME_CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// 네트워크가 안 되는 상황(공장 기숙사 와이파이 등)에서도 마지막으로 불러온
// 화면/데이터는 계속 보이도록, 네트워크 우선 + 실패 시 캐시로 대체한다.
// 정적 빌드 자산(_next/static)은 파일명에 해시가 붙어 절대 안 바뀌므로 캐시 우선으로 즉시 서빙한다.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isStaticAsset = url.pathname.startsWith("/_next/static/");

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((resp) => {
            const clone = resp.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
            return resp;
          })
      )
    );
    return;
  }

  const isSameOrigin = url.origin === self.location.origin;
  const isApiCall = !isSameOrigin && url.pathname.startsWith("/api/");
  if (!isSameOrigin && !isApiCall) return;

  event.respondWith(
    fetch(request)
      .then((resp) => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error()))
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "Don't ₩orry", body: "" };
  try {
    payload = event.data ? event.data.json() : payload;
  } catch {
    // ignore malformed payloads
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "Don't ₩orry", {
      body: payload.body || "",
      icon: "/logo-mark.png",
      badge: "/logo-mark.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/home");
    })
  );
});
