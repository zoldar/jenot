const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then((persistent) => {
        if (persistent) {
          console.log(
            "Storage will not be cleared except by explicit user action",
          );
        } else {
          console.log(
            "Storage may be cleared by the UA under storage pressure.",
          );
        }
      });
    }

    try {
      const registration = await navigator.serviceWorker.register(
        "/js/service-worker.js",
        {
          type: "module",
          scope: "/",
        },
      );
      if (registration.installing) {
        console.log("Service worker installing");
      } else if (registration.waiting) {
        console.log("Service worker installed");
      } else if (registration.active) {
        console.log("Service worker active");
      }
    } catch (error) {
      console.error(`Registration failed with ${error}`, error);
    }
  }
};

registerServiceWorker();
