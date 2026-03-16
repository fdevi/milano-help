importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Badge API: incrementa il badge quando arriva una push
self.addEventListener("push", function (event) {
  event.waitUntil(
    self.registration.getNotifications().then(function (notifications) {
      var count = notifications.length + 1;
      if (self.navigator && self.navigator.setAppBadge) {
        return self.navigator.setAppBadge(count);
      }
    })
  );
});

// Badge API: decrementa/resetta quando l'utente clicca una notifica
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    self.registration.getNotifications().then(function (notifications) {
      if (notifications.length === 0 && self.navigator && self.navigator.clearAppBadge) {
        return self.navigator.clearAppBadge();
      } else if (self.navigator && self.navigator.setAppBadge) {
        return self.navigator.setAppBadge(notifications.length);
      }
    })
  );
});
