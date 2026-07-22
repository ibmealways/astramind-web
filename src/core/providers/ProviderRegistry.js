import { ProviderContract } from "../contracts/SystemContracts.js";

export default class ProviderRegistry {
  constructor({ eventBus = null } = {}) {
    this.eventBus = eventBus;
    this.providers = new Map();
  }

  register(descriptor, instance) {
    ProviderContract.assert(descriptor, instance);
    if (this.providers.has(descriptor.id)) throw new Error(`Provider already registered: ${descriptor.id}`);
    const entry = {
      descriptor: Object.freeze({ ...descriptor, supportedCapabilities: [...descriptor.supportedCapabilities], supportedModels: [...(descriptor.supportedModels || [])] }),
      instance, failures: 0, executions: 0, lastError: null,
    };
    this.providers.set(descriptor.id, entry);
    this.eventBus?.publish("provider.registered", { providerId: descriptor.id });
    return entry;
  }

  get(id) { return this.providers.get(id) || null; }
  has(id) { return this.providers.has(id); }
  list() { return [...this.providers.values()].map(({ descriptor, failures, executions, lastError }) => ({ ...descriptor, failures, executions, lastError })); }

  candidates({ capability, model } = {}) {
    return [...this.providers.values()]
      .filter(({ descriptor }) => descriptor.status === "active")
      .filter(({ descriptor }) => !capability || descriptor.supportedCapabilities.includes(capability))
      .filter(({ descriptor }) => !model || descriptor.supportedModels.length === 0 || descriptor.supportedModels.includes(model))
      .sort((left, right) => (left.descriptor.priority ?? 100) - (right.descriptor.priority ?? 100));
  }

  record(id, success, error = null) {
    const entry = this.get(id);
    if (!entry) return;
    entry.executions++;
    if (!success) { entry.failures++; entry.lastError = error?.message || String(error); }
  }

  async health() {
    const providers = {};
    let healthy = true;
    for (const [id, entry] of this.providers) {
      try {
        providers[id] = entry.instance.health ? await entry.instance.health() : { healthy: true };
      } catch (error) {
        providers[id] = { healthy: false, error: error.message };
      }
      if (entry.descriptor.required && providers[id].healthy === false) healthy = false;
    }
    return { healthy, registered: this.providers.size, providers };
  }
}
