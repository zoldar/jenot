export class Router {
  constructor(routes) {
    this.routes = routes;

    window.addEventListener("popstate", () => {
      this.loadInitialRoute();
    });
  }

  static init(routes) {
    const router = new Router(routes);
    router.loadInitialRoute();
    return router;
  }

  loadRoute(path) {
    const matchedRoute = this.#matchURLToRoute(path);

    if (!matchedRoute) {
      throw new Error("Route not found!");
    }

    matchedRoute.callback(this);
  }

  navigateTo(path) {
    window.history.pushState({}, "", path);
    this.loadRoute(path);
  }

  redirect(path) {
    this.loadRoute(path);
  }

  #matchURLToRoute(path) {
    const found = this.routes.find((router) => router.path === path);

    if (!found) {
      return this.routes.find((router) => router.path === "*");
    }

    return found;
  }

  loadInitialRoute() {
    const pathParts = window.location.pathname.split("/");
    const path = pathParts.length > 1 ? pathParts[1] : "";

    this.loadRoute(path);
  }
}
