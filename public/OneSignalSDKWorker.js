importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Badge API è gestita esclusivamente dal frontend (conteggio DB notifiche non lette).
// NON aggiornare mai il badge dal Service Worker.
self.addEventListener("push", function () {
  console.log("[SW][push] received (badge managed by frontend only)");
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clients) {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow("/");
    })
  );
});
