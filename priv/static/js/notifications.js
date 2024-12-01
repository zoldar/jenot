const notificationIcon = "/img/android-chrome-192x192.png";

export function notificationsAvailable() {
  return !!window.Notification;
}
export function notificationsEnabled() {
  return window.Notification && Notification.permission === "granted";
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

export async function sendNotification(titleSuffix, message) {
  return navigator.serviceWorker.ready.then((registration) =>
    registration.showNotification(`Jenot ${titleSuffix}`, {
      body: message,
      icon: notificationIcon,
    }),
  );
}
