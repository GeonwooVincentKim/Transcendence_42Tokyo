/**
 * Simple Svelte Router
 * Handles client-side routing for the Svelte application
 */

export interface Route {
  path: string;
  component: any;
  title: string;
}

export class Router {
  private routes: Route[] = [];
  private currentRoute: Route | null = null;
  private listeners: ((route: Route | null) => void)[] = [];

  /**
   * Add a route to the router
   */
  addRoute(route: Route) {
    this.routes.push(route);
  }

  /**
   * Navigate to a specific path
   */
  navigate(path: string) {
    const route = this.routes.find(r => r.path === path);
    if (route) {
      this.currentRoute = route;
      this.notifyListeners();
      window.history.pushState({}, '', path);
    }
  }

  /**
   * Get current route
   */
  getCurrentRoute(): Route | null {
    return this.currentRoute;
  }

  /**
   * Subscribe to route changes
   */
  subscribe(listener: (route: Route | null) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Initialize router
   */
  init() {
    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      const path = window.location.pathname;
      const route = this.routes.find(r => r.path === path);
      if (route) {
        this.currentRoute = route;
        this.notifyListeners();
      }
    });

    // Set initial route
    const path = window.location.pathname;
    const route = this.routes.find(r => r.path === path);
    if (route) {
      this.currentRoute = route;
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentRoute));
  }
}

// Create global router instance
export const router = new Router();
