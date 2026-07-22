export default class HealthMonitor {
  constructor({ diagnostics = null } = {}) {
    this.diagnostics = diagnostics;
    this.checks = new Map();
  }

  register(name, check) {
    if (!name || typeof check !== "function") throw new Error("Health check requires a name and function.");
    this.checks.set(name, check);
    return this;
  }

  async run() {
    const checks = {};
    let healthy = true;
    for (const [name, check] of this.checks) {
      try {
        const result = await check();
        checks[name] = typeof result === "boolean" ? { healthy: result } : result;
        if (checks[name]?.healthy === false) healthy = false;
      } catch (error) {
        healthy = false;
        checks[name] = { healthy: false, error: error.message };
      }
    }
    const report = { healthy, checks, checkedAt: new Date().toISOString() };
    if (!healthy) this.diagnostics?.warning?.("Kernel health check failed", report);
    return report;
  }
}
