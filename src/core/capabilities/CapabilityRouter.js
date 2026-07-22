export default class CapabilityRouter {
  constructor({ registry } = {}) {
    this.registry = registry;
    this.routes = new Map();
  }

  register(capabilityId, { authority, action = "run" }) {
    if (!capabilityId || !authority) throw new Error("Capability route requires capabilityId and authority.");
    if (this.routes.has(capabilityId)) throw new Error(`Capability route already exists: ${capabilityId}`);
    this.routes.set(capabilityId, Object.freeze({ authority, action }));
    return this;
  }

  resolve(capabilityId) {
    const route = this.routes.get(capabilityId);
    if (!route) {
      const error = new Error(`Unknown capability: ${capabilityId}`);
      error.code = "CAPABILITY_NOT_FOUND";
      throw error;
    }
    if (!this.registry?.has(route.authority)) throw new Error(`Capability ${capabilityId} routes to unavailable authority ${route.authority}.`);
    return route;
  }

  list() {
    return [...this.routes.entries()].map(([id, route]) => ({ id, ...route }));
  }

  health() {
    const unavailable = this.list().filter(({ authority }) => !this.registry?.has(authority));
    return { healthy: unavailable.length === 0, routes: this.routes.size, unavailable };
  }
}
