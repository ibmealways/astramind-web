export default class AstraMindKernel {
  constructor({ manifest, registry, executor, diagnostics, eventBus, healthMonitor, capabilityRouter, missionRuntime, autonomousRuntime, providerRegistry, providerRouter }) {
    this.manifest = manifest;
    this.registry = registry;
    this.executor = executor;
    this.diagnostics = diagnostics;
    this.eventBus = eventBus;
    this.healthMonitor = healthMonitor;
    this.capabilityRouter = capabilityRouter;
    this.missionRuntime = missionRuntime;
    this.autonomousRuntime = autonomousRuntime;
    this.providerRegistry = providerRegistry;
    this.providerRouter = providerRouter;
    this.startedAt = Date.now();
  }

  async executeMission({ mission = "general", input = {}, plan, user = {}, context = {}, preferences = {}, constraints = {}, metadata = {}, timeoutMs } = {}) {
    if (!mission || typeof mission !== "string") throw new Error("Mission must be a non-empty string.");
    this.diagnostics?.missionStarted?.({ mission, metadata });
    try {
      const { mission: missionRecord, execution } = await this.missionRuntime.execute({ mission, input, plan, user, context, preferences, constraints, metadata, timeoutMs });
      this.diagnostics?.missionCompleted?.({ mission, requestId: execution.requestId });
      return { ...execution, mission: missionRecord };
    } catch (error) {
      this.diagnostics?.missionFailed?.({ mission }, error);
      throw error;
    }
  }

  getMission(id) { return this.missionRuntime.get(id); }
  listMissions(options) { return this.missionRuntime.list(options); }
  cancelMission(id) { return this.missionRuntime.cancel(id); }
  executeAutonomousMission(request) { return this.autonomousRuntime.start(request); }
  approveAutonomousMission(id, approval) { return this.autonomousRuntime.approve(id, approval); }
  cancelAutonomousMission(id, userId) { return this.autonomousRuntime.cancel(id, userId); }
  pauseAutonomousMission(id, userId) { return this.autonomousRuntime.pause(id, userId); }
  resumeAutonomousMission(id, userId) { return this.autonomousRuntime.resume(id, userId); }
  executeProvider(request) { return this.providerRouter.execute(request); }
  listProviders() {
    return this.providerRegistry.list().map(({ configuration, ...provider }) => provider);
  }

  async health() {
    return this.healthMonitor.run();
  }

  info() {
    return {
      name: this.manifest.metadata.name,
      osVersion: this.manifest.metadata.osVersion,
      kernelVersion: this.manifest.metadata.kernelVersion,
      manifestVersion: this.manifest.metadata.manifestVersion,
      uptimeMs: Date.now() - this.startedAt,
    };
  }
}
