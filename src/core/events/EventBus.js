/**
 * ============================================================================
 * AstraMind Technologies
 * AstraMind OS 3.0
 * ----------------------------------------------------------------------------
 * File: EventBus.js
 *
 * Description:
 * Enterprise event system for AstraMind OS.
 *
 * The Event Bus enables loose coupling between all platform capabilities.
 * Instead of modules calling each other directly, they publish and subscribe
 * to events.
 *
 * This architecture allows CreatorBrain, Finance OS, Research OS,
 * Content OS, Business OS, Publishing, Robotics, and future plugins
 * to communicate without introducing hard dependencies.
 *
 * Sprint:
 * Sprint 1 – Kernel Foundation
 *
 * Version:
 * 3.0.0-alpha.1
 * ============================================================================
 */

class EventBus {
  constructor() {
    /**
     * Map<EventName, Set<Listener>>
     */
    this.listeners = new Map();

    /**
     * Event history for diagnostics
     */
    this.history = [];

    /**
     * Maximum events retained
     */
    this.maxHistory = 500;

    console.info("🛰 EventBus initialized.");
  }

  /**
   * ----------------------------------------------------
   * Subscribe
   * ----------------------------------------------------
   * @param {string} event
   * @param {Function} listener
   * @returns {Function} unsubscribe
   */
  subscribe(event, listener) {
    if (!event || typeof listener !== "function") {
      throw new Error(
        "EventBus.subscribe() requires an event name and callback."
      );
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event).add(listener);

    return () => this.unsubscribe(event, listener);
  }

  /**
   * ----------------------------------------------------
   * Unsubscribe
   * ----------------------------------------------------
   */
  unsubscribe(event, listener) {
    const set = this.listeners.get(event);

    if (!set) return;

    set.delete(listener);

    if (set.size === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * ----------------------------------------------------
   * Publish
   * ----------------------------------------------------
   * @param {string} event
   * @param {*} payload
   */
  publish(event, payload = {}) {
    if (!event) {
      throw new Error("EventBus.publish() requires an event.");
    }

    const timestamp = new Date().toISOString();

    const record = {
      event,
      payload,
      timestamp,
    };

    this.history.push(record);

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    const listeners = this.listeners.get(event);

    if (!listeners) return;

    for (const callback of listeners) {
      try {
        callback(payload);
      } catch (err) {
        console.error(
          `❌ EventBus listener failed for "${event}"`,
          err
        );
      }
    }
  }

  /**
   * ----------------------------------------------------
   * Publish Once
   * ----------------------------------------------------
   */
  once(event, listener) {
    const unsubscribe = this.subscribe(event, (payload) => {
      unsubscribe();
      listener(payload);
    });
  }

  /**
   * ----------------------------------------------------
   * Clear Event
   * ----------------------------------------------------
   */
  clear(event) {
    this.listeners.delete(event);
  }

  /**
   * ----------------------------------------------------
   * Remove Everything
   * ----------------------------------------------------
   */
  clearAll() {
    this.listeners.clear();
    this.history = [];
  }

  /**
   * ----------------------------------------------------
   * Listener Count
   * ----------------------------------------------------
   */
  listenerCount(event) {
    return this.listeners.get(event)?.size || 0;
  }

  /**
   * ----------------------------------------------------
   * Registered Events
   * ----------------------------------------------------
   */
  getEvents() {
    return [...this.listeners.keys()];
  }

  /**
   * ----------------------------------------------------
   * History
   * ----------------------------------------------------
   */
  getHistory(limit = 100) {
    return this.history.slice(-limit);
  }

  /**
   * ----------------------------------------------------
   * Statistics
   * ----------------------------------------------------
   */
  getStats() {
    let totalListeners = 0;

    for (const listeners of this.listeners.values()) {
      totalListeners += listeners.size;
    }

    return {
      events: this.listeners.size,
      listeners: totalListeners,
      history: this.history.length,
    };
  }

  /**
   * ----------------------------------------------------
   * Health Check
   * ----------------------------------------------------
   */
  health() {
    return {
      healthy: true,
      stats: this.getStats(),
    };
  }
}

/**
 * ============================================================
 * Singleton Instance
 * ============================================================
 *
 * AstraMind should only ever have ONE EventBus.
 */

const eventBus = new EventBus();

export default eventBus;