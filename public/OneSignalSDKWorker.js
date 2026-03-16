importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Badge is managed exclusively by the frontend (PannelloNotifiche.tsx)
// based on the actual unread count from the "notifiche" table.
// The Service Worker does NOT touch the badge to avoid overriding
// the correct DB-based count with the push notification tray count.

// When user clicks a notification, just close it and open the app.
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
});
