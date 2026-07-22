export default class ProviderRouter {
  constructor({ registry, eventBus = null } = {}) {
    this.registry = registry;
    this.eventBus = eventBus;
  }

  async execute({ capability, model, payload = {}, metadata = {}, signal } = {}) {
    if (!capability) throw new Error("Provider routing requires a capability.");
    const candidates = this.registry.candidates({ capability, model });
    if (!candidates.length) {
      const error = new Error(`No provider supports capability: ${capability}`);
      error.code = "PROVIDER_NOT_FOUND";
      throw error;
    }
    const attempts = [];
    for (const entry of candidates) {
      const providerId = entry.descriptor.id;
      if (signal?.aborted) throw signal.reason || new Error("Provider request aborted.");
      try {
        this.eventBus?.publish("provider.request.started", { providerId, capability, model });
        const data = await entry.instance.execute({ capability, model, payload, metadata, signal });
        this.registry.record(providerId, true);
        this.eventBus?.publish("provider.request.completed", { providerId, capability, model });
        return { providerId, data, attempts };
      } catch (error) {
        this.registry.record(providerId, false, error);
        attempts.push({ providerId, error: error.message });
        this.eventBus?.publish("provider.request.failed", { providerId, capability, error: error.message });
      }
    }
    const error = new Error(`All providers failed for capability: ${capability}`);
    error.code = "PROVIDER_EXHAUSTED";
    error.attempts = attempts;
    throw error;
  }

  health() { return this.registry.health(); }
}
