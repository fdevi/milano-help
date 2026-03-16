// Blocca qualsiasi gestione badge dal Service Worker / SDK esterni.
const blockBadgeApi = () => {
  const noop = () => {
    console.log("[SW] badge API intercettata e bloccata");
    return Promise.resolve();
  };

  if (typeof self.setAppBadge === "function") {
    self.setAppBadge = noop;
  }

  if (typeof self.clearAppBadge === "function") {
    self.clearAppBadge = noop;
  }

  if (self.navigator && typeof self.navigator.setAppBadge === "function") {
    self.navigator.setAppBadge = noop;
  }

  if (self.navigator && typeof self.navigator.clearAppBadge === "function") {
    self.navigator.clearAppBadge = noop;
  }
};

blockBadgeApi();
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
blockBadgeApi();

// Badge API è gestita esclusivamente dal frontend (conteggio DB notifiche+messaggi non letti).
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
