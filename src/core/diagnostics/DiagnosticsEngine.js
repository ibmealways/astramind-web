/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File: DiagnosticsEngine.js
 *
 * Description:
 * Enterprise diagnostics engine responsible for recording runtime activity,
 * mission execution, routing decisions, performance metrics, warnings,
 * failures, and system events.
 *
 * This serves as AstraMind OS's "Black Box Recorder."
 *
 * Version:
 * 3.0.0-alpha.1
 *
 * Sprint:
 * Sprint 1 – Kernel Foundation
 * ============================================================================
 */

class DiagnosticsEngine {
  constructor({ eventBus = null } = {}) {
    this.eventBus = eventBus;

    this.logs = [];

    this.maxLogs = 1000;

    this.metrics = {
      missions: 0,
      completed: 0,
      failed: 0,
      warnings: 0,
      errors: 0,
      routing: 0,
      providers: 0,
      capabilities: 0,
    };

    console.info("🩺 Diagnostics Engine initialized.");
  }

  /**
   * =====================================================
   * Internal Logger
   * =====================================================
   */

  record(level, category, message, metadata = {}) {
    const entry = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,

      timestamp: new Date().toISOString(),

      level,

      category,

      message,

      metadata,
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (this.eventBus) {
      this.eventBus.publish("diagnostics.recorded", entry);
    }

    return entry;
  }

  /**
   * =====================================================
   * Mission Events
   * =====================================================
   */

  missionStarted(mission) {
    this.metrics.missions++;

    return this.record(
      "info",
      "mission",
      "Mission started",
      mission
    );
  }

  missionCompleted(mission) {
    this.metrics.completed++;

    return this.record(
      "success",
      "mission",
      "Mission completed",
      mission
    );
  }

  missionFailed(mission, error) {
    this.metrics.failed++;

    return this.record(
      "error",
      "mission",
      "Mission failed",
      {
        mission,
        error:
          error?.message ||
          String(error),
      }
    );
  }

  /**
   * =====================================================
   * Routing
   * =====================================================
   */

  routingDecision(route) {
    this.metrics.routing++;

    return this.record(
      "info",
      "routing",
      "Capability routing",
      route
    );
  }

  /**
   * =====================================================
   * Capability Events
   * =====================================================
   */

  capabilityRegistered(capability) {
    this.metrics.capabilities++;

    return this.record(
      "info",
      "capability",
      "Capability registered",
      capability
    );
  }

  capabilityExecuted(capability) {
    return this.record(
      "success",
      "capability",
      "Capability executed",
      capability
    );
  }

  /**
   * =====================================================
   * Provider Events
   * =====================================================
   */

  providerSelected(provider) {
    this.metrics.providers++;

    return this.record(
      "info",
      "provider",
      "AI provider selected",
      provider
    );
  }

  providerFailure(provider, error) {
    return this.record(
      "warning",
      "provider",
      "Provider failure",
      {
        provider,
        error:
          error?.message ||
          String(error),
      }
    );
  }

  /**
   * =====================================================
   * Warning
   * =====================================================
   */

  warning(message, metadata = {}) {
    this.metrics.warnings++;

    return this.record(
      "warning",
      "system",
      message,
      metadata
    );
  }

  /**
   * =====================================================
   * Error
   * =====================================================
   */

  error(message, metadata = {}) {
    this.metrics.errors++;

    return this.record(
      "error",
      "system",
      message,
      metadata
    );
  }

  /**
   * =====================================================
   * Information
   * =====================================================
   */

  info(message, metadata = {}) {
    return this.record(
      "info",
      "system",
      message,
      metadata
    );
  }

  /**
   * =====================================================
   * Success
   * =====================================================
   */

  success(message, metadata = {}) {
    return this.record(
      "success",
      "system",
      message,
      metadata
    );
  }

  /**
   * =====================================================
   * Queries
   * =====================================================
   */

  getLogs(limit = 100) {
    return this.logs.slice(-limit);
  }

  getMetrics() {
    return {
      ...this.metrics,
    };
  }

  getErrors() {
    return this.logs.filter(
      (l) => l.level === "error"
    );
  }

  getWarnings() {
    return this.logs.filter(
      (l) => l.level === "warning"
    );
  }

  clear() {
    this.logs = [];

    Object.keys(this.metrics).forEach((k) => {
      this.metrics[k] = 0;
    });
  }

  /**
   * =====================================================
   * Health
   * =====================================================
   */

  health() {
    return {
      healthy: true,

      metrics: this.getMetrics(),

      totalLogs: this.logs.length,
    };
  }
}

/**
 * ============================================================
 * Singleton
 * ============================================================
 */

const diagnostics = new DiagnosticsEngine();

export default diagnostics;