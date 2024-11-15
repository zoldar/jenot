const notificationIcon = "/img/android-chrome-192x192.png";

export function notificationsEnabled() {
  return Notification.permission === "granted";
}

export function authorizeNotifications(afterCallback) {
  Notification.requestPermission(function (permission) {
    sendNotification(
      "notification",
      "Jenot can now send you alerts about reminders!",
    );
    afterCallback();
  });
}

export function sendNotification(titleSuffix, message) {
  return new Notification(`Jenot ${titleSuffix}`, {
    body: message,
    icon: notificationIcon,
  });
}
