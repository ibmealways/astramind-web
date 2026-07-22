import ManifestValidator from "./ManifestValidator.js";

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export default class ManifestLoader {
  constructor({ validator = new ManifestValidator() } = {}) {
    this.validator = validator;
    this.manifest = null;
  }

  load(source) {
    const parsed = typeof source === "string" ? JSON.parse(source) : deepClone(source);
    this.validator.assert(parsed);
    this.manifest = deepFreeze(parsed);
    return this.manifest;
  }

  getManifest() {
    if (!this.manifest) throw new Error("System manifest has not been loaded.");
    return this.manifest;
  }
}
