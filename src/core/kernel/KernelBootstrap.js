/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File: KernelBootstrap.js
 * Purpose:
 * Boots AstraMind OS by initializing the Kernel, registering core services,
 * verifying platform health, and exposing a singleton Kernel instance.
 * ----------------------------------------------------------------------------
 * Version: 3.0.0-alpha.1
 * Sprint: 1 - Kernel Foundation
 * ============================================================================
 */

import AstraMindKernel from "./AstraMindKernel.js";
import KernelRegistry from "./KernelRegistry.js";
import EventBus from "./EventBus.js";
import HealthMonitor from "./HealthMonitor.js";
import DiagnosticsEngine from "./DiagnosticsEngine.js";

class KernelBootstrap {
  constructor() {
    this.initialized = false;

    this.kernel = null;
    this.registry = null;
    this.eventBus = null;
    this.healthMonitor = null;
    this.diagnostics = null;
  }

  /**
   * --------------------------------------------------------
   * Boot AstraMind
   * --------------------------------------------------------
   */
  async boot() {
    if (this.initialized) {
      console.warn("⚠ AstraMind Kernel already initialized.");
      return this.kernel;
    }

    console.group("🚀 AstraMind OS Boot");

    try {
      console.log("Initializing Event Bus...");
      this.eventBus = new EventBus();

      console.log("Initializing Diagnostics...");
      this.diagnostics = new DiagnosticsEngine({
        eventBus: this.eventBus,
      });

      console.log("Initializing Health Monitor...");
      this.healthMonitor = new HealthMonitor({
        diagnostics: this.diagnostics,
      });

      console.log("Initializing Capability Registry...");
      this.registry = new KernelRegistry({
        diagnostics: this.diagnostics,
      });

      console.log("Initializing Kernel...");
      this.kernel = new AstraMindKernel({
        registry: this.registry,
        diagnostics: this.diagnostics,
        eventBus: this.eventBus,
        healthMonitor: this.healthMonitor,
      });

      await this.registerCoreCapabilities();

      await this.healthCheck();

      this.initialized = true;

      console.log("✅ AstraMind Kernel ONLINE");

      console.groupEnd();

      return this.kernel;
    } catch (err) {
      console.error("❌ Kernel boot failed");

      console.error(err);

      console.groupEnd();

      throw err;
    }
  }

  /**
   * --------------------------------------------------------
   * Register Built-In Capabilities
   * --------------------------------------------------------
   */
  async registerCoreCapabilities() {
    console.log("Registering built-in capabilities...");

    this.registry.register({
      id: "conversation",
      version: "1.0.0",
      description: "Conversation Engine",
      health: "unknown",
    });

    this.registry.register({
      id: "creatorBrain",
      version: "1.0.0",
      description: "Creator Intelligence",
      health: "unknown",
    });

    this.registry.register({
      id: "finance",
      version: "1.0.0",
      description: "Finance OS",
      health: "unknown",
    });

    this.registry.register({
      id: "research",
      version: "1.0.0",
      description: "Research OS",
      health: "unknown",
    });

    this.registry.register({
      id: "content",
      version: "1.0.0",
      description: "Content OS",
      health: "unknown",
    });

    this.registry.register({
      id: "business",
      version: "1.0.0",
      description: "Business OS",
      health: "unknown",
    });

    this.registry.register({
      id: "publishing",
      version: "1.0.0",
      description: "Publishing Layer",
      health: "unknown",
    });

    this.registry.register({
      id: "memory",
      version: "1.0.0",
      description: "Memory System",
      health: "unknown",
    });

    console.log(
      `Registered ${this.registry.getAll().length} capabilities`
    );
  }

  /**
   * --------------------------------------------------------
   * Platform Health Verification
   * --------------------------------------------------------
   */
  async healthCheck() {
    console.log("Running Kernel health check...");

    const report = await this.healthMonitor.run();

    if (!report.healthy) {
      console.warn("⚠ AstraMind booted with warnings.");
    } else {
      console.log("✓ All core systems healthy.");
    }

    return report;
  }

  /**
   * --------------------------------------------------------
   * Get Kernel
   * --------------------------------------------------------
   */
  getKernel() {
    return this.kernel;
  }

  /**
   * --------------------------------------------------------
   * Diagnostics
   * --------------------------------------------------------
   */
  getDiagnostics() {
    return this.diagnostics;
  }

  /**
   * --------------------------------------------------------
   * Registry
   * --------------------------------------------------------
   */
  getRegistry() {
    return this.registry;
  }

  /**
   * --------------------------------------------------------
   * Event Bus
   * --------------------------------------------------------
   */
  getEventBus() {
    return this.eventBus;
  }
}

const bootstrap = new KernelBootstrap();

export default bootstrap;