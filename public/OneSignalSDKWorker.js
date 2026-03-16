importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// When a push arrives and the app is in background, the frontend can't update
// the badge. We estimate the count from active notifications in the tray.
self.addEventListener("push", function (event) {
  console.log("[SW][push] Notification received");
  event.waitUntil(
    self.registration.getNotifications().then(function (notifications) {
      // +1 because the new notification hasn't been shown yet
      var count = notifications.length + 1;
      if (navigator.setAppBadge) {
        navigator.setAppBadge(count);
        console.log("[SW][Badge] setAppBadge(" + count + ")");
      }
    })
  );
});

// When user clicks a notification, update the badge and open the app
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    self.registration.getNotifications().then(function (remaining) {
      if (remaining.length === 0 && navigator.clearAppBadge) {
        navigator.clearAppBadge();
        console.log("[SW][Badge] clearAppBadge()");
      } else if (navigator.setAppBadge) {
        navigator.setAppBadge(remaining.length);
        console.log("[SW][Badge] setAppBadge(" + remaining.length + ")");
      }
      // Focus existing window or open new one
      return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clients) {
        if (clients.length > 0) return clients[0].focus();
        return self.clients.openWindow("/");
      });
    })
  );
});
