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
    // Extract path without hash for route matching
    const pathWithoutHash = path.split('#')[0];
    const route = this.routes.find(r => r.path === pathWithoutHash || r.path === path);
    
    // Update URL first
    window.history.pushState({}, '', path);
    
    // Then update route and notify listeners
    if (route) {
      this.currentRoute = route;
    }
    this.notifyListeners();
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
      } else {
        // If no route found, try to find a matching route or set to null
        // This allows listeners to handle the path manually
        this.currentRoute = null;
      }
      // Always notify listeners to handle hash changes and path updates
      this.notifyListeners();
    });

    // Set initial route
    const path = window.location.pathname;
    const route = this.routes.find(r => r.path === path);
    if (route) {
      this.currentRoute = route;
    } else {
      // If initial path doesn't match, set to null and let listeners handle it
      this.currentRoute = null;
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentRoute));
  }
}

// Create global router instance
export const router = new Router();
