export default class MissionStore {
  constructor({ limit = 500 } = {}) {
    this.limit = limit;
    this.missions = new Map();
  }

  create(mission) {
    this.missions.set(mission.id, structuredClone(mission));
    this.trim();
    return this.get(mission.id);
  }

  update(id, changes) {
    const current = this.missions.get(id);
    if (!current) return null;
    this.missions.set(id, { ...current, ...structuredClone(changes), updatedAt: new Date().toISOString() });
    return this.get(id);
  }

  get(id) {
    const mission = this.missions.get(id);
    return mission ? structuredClone(mission) : null;
  }

  list({ limit = 50, status } = {}) {
    return [...this.missions.values()]
      .filter((mission) => !status || mission.status === status)
      .slice(-Math.min(Math.max(limit, 1), 100))
      .reverse()
      .map((mission) => structuredClone(mission));
  }

  trim() {
    while (this.missions.size > this.limit) this.missions.delete(this.missions.keys().next().value);
  }

  count() { return this.missions.size; }
}
