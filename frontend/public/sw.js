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
