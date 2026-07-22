import AstraMindKernel from "./AstraMindKernel.js";
import KernelExecutor from "./KernelExecutor.js";
import KernelRegistry, { AUTHORITY_TYPES } from "./KernelRegistry.js";
import EventBus from "../events/EventBus.js";
import Diagnostics from "../diagnostics/DiagnosticsEngine.js";
import HealthMonitor from "../diagnostics/HealthMonitor.js";
import ManifestLoader from "../manifest/ManifestLoader.js";
import defaultManifest from "../manifest/defaultManifest.js";
import CapabilityRouter from "../capabilities/CapabilityRouter.js";
import MissionRuntime from "../mission/MissionRuntime.js";
import BoundedAutonomousRuntime from "../mission/BoundedAutonomousRuntime.js";
import MissionStore from "../mission/MissionStore.js";
import ProviderRegistry from "../providers/ProviderRegistry.js";
import ProviderRouter from "../providers/ProviderRouter.js";
import { AuthorityContract, CapabilityContract } from "../contracts/SystemContracts.js";

export class KernelBootstrap {
  constructor({ manifest = defaultManifest, workflowHandler = null, authorityFactories = {}, providerFactories = {}, missionStore = null } = {}) {
    this.manifestSource = manifest;
    this.workflowHandler = workflowHandler;
    this.authorityFactories = { ...authorityFactories };
    this.providerFactories = { ...providerFactories };
    this.missionStore = missionStore;
    this.initialized = false;
    this.bootPromise = null;
    this.kernel = null;
  }

  configure({ manifest, workflowHandler, authorityFactories, providerFactories, missionStore } = {}) {
    if (this.initialized || this.bootPromise) throw new Error("Cannot configure Kernel after boot has started.");
    if (manifest) this.manifestSource = manifest;
    if (workflowHandler) this.workflowHandler = workflowHandler;
    if (authorityFactories) this.authorityFactories = { ...this.authorityFactories, ...authorityFactories };
    if (providerFactories) this.providerFactories = { ...this.providerFactories, ...providerFactories };
    if (missionStore) this.missionStore = missionStore;
    return this;
  }

  async boot() {
    if (this.initialized) return this.kernel;
    if (this.bootPromise) return this.bootPromise;
    this.bootPromise = this.initialize();
    try { return await this.bootPromise; }
    catch (error) { this.bootPromise = null; throw error; }
  }

  async initialize() {
    const manifest = new ManifestLoader().load(this.manifestSource);
    const registry = KernelRegistry.create({ kernelName: manifest.metadata.name });
    const healthMonitor = new HealthMonitor({ diagnostics: Diagnostics });
    const providerRegistry = new ProviderRegistry({ eventBus: EventBus });
    const requiredProviders = new Set(manifest.boot.requiredProviders || []);
    for (const provider of manifest.providers) {
      if (provider.status !== "active") continue;
      const factory = this.providerFactories[provider.id];
      if (!factory) throw new Error(`No provider factory registered for manifest provider: ${provider.id}`);
      const instance = await factory({ manifest, provider, diagnostics: Diagnostics, eventBus: EventBus });
      providerRegistry.register({ ...provider, required: requiredProviders.has(provider.id) }, instance);
    }
    const providerRouter = new ProviderRouter({ registry: providerRegistry, eventBus: EventBus });
    const workflowHandler = this.workflowHandler || (async ({ mission, input }) => ({ mission, input }));
    const factories = {
      workflow: () => ({
        execute: ({ action, payload, metadata }) => {
          if (action !== "run") throw new Error(`Unsupported workflow action: ${action}`);
          return workflowHandler(payload, metadata);
        },
      }),
      ...this.authorityFactories,
    };

    const createContractAuthority = (authority) => ({
      execute: async ({ action, payload, metadata, requestId }) => ({
        ok: true,
        routed: true,
        authority: authority.id,
        capabilityAction: action,
        requestId,
        payload,
        metadata,
        executionBoundary: "contract",
      }),
    });

    for (const authority of manifest.authorities) {
      if (authority.status !== "active") continue;
      const factory = factories[authority.id] || (authority.entryPoint === "builtin-contract" ? () => createContractAuthority(authority) : null);
      if (!factory) throw new Error(`No authority factory registered for manifest authority: ${authority.id}`);
      const instance = await factory({ manifest, authority, registry, providerRegistry, providerRouter, diagnostics: Diagnostics, eventBus: EventBus });
      AuthorityContract.assert(authority, instance);
      registry.register({
        id: authority.id,
        name: authority.name,
        type: authority.id === "workflow" ? AUTHORITY_TYPES.WORKFLOW : AUTHORITY_TYPES.AUTHORITY,
        version: authority.version,
        dependencies: authority.dependencies || [],
        instance,
        metadata: { entryPoint: authority.entryPoint, requiredCapabilities: authority.requiredCapabilities || [] },
      });
    }

    const executor = KernelExecutor.create({ registry, eventBus: EventBus });
    const capabilityRouter = new CapabilityRouter({ registry });
    for (const capability of manifest.capabilities) {
      if (capability.status !== "active") continue;
      CapabilityContract.assert(capability);
      if (!capability.authority) throw new Error(`Active capability requires an authority route: ${capability.id}`);
      capabilityRouter.register(capability.id, { authority: capability.authority, action: capability.action || "run" });
    }
    const missionStore = this.missionStore || new MissionStore({ limit: 500 });
    const missionRuntime = new MissionRuntime({ executor, capabilityRouter, store: missionStore, eventBus: EventBus });
    const autonomousRuntime = new BoundedAutonomousRuntime({ executor, capabilityRouter, store: missionStore, eventBus: EventBus });
    healthMonitor
      .register("manifest", () => ({ healthy: Object.isFrozen(manifest), version: manifest.metadata.manifestVersion }))
      .register("registry", () => registry.health())
      .register("executor", () => executor.health())
      .register("capabilities", () => capabilityRouter.health())
      .register("missions", () => missionRuntime.health())
      .register("bounded-autonomy", () => autonomousRuntime.health());
    healthMonitor.register("providers", () => providerRegistry.health());

    this.kernel = new AstraMindKernel({ manifest, registry, executor, diagnostics: Diagnostics, eventBus: EventBus, healthMonitor, capabilityRouter, missionRuntime, autonomousRuntime, providerRegistry, providerRouter });
    const health = await this.kernel.health();
    if (!health.healthy) throw new Error("Kernel failed its startup health check.");
    this.initialized = true;
    EventBus.publish("kernel.initialized", this.kernel.info());
    return this.kernel;
  }

  getKernel() { return this.kernel; }
}

const bootstrap = new KernelBootstrap();
export default bootstrap;
