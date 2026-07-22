const ROOT = ["metadata", "kernel", "boot", "security", "capabilities", "providers", "authorities", "services", "plugins", "featureFlags", "diagnostics", "compatibility", "extensions"];
const REQUIRED = ["metadata", "kernel", "boot", "security", "capabilities", "providers", "authorities", "services", "diagnostics", "compatibility"];
const LISTS = ["capabilities", "providers", "authorities", "services", "plugins"];
const SECRET_FIELD = /(^|_)(password|secret|token|api_?key|private_?key|jwt_?secret)$/i;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function findSecretFields(value, path = "manifest", found = []) {
  if (!value || typeof value !== "object") return found;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (SECRET_FIELD.test(key)) found.push(childPath);
    findSecretFields(child, childPath, found);
  }
  return found;
}

function compareVersions(left, right) {
  const parse = (version) => version.split("-")[0].split(".").map(Number);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

export class ManifestValidationError extends Error {
  constructor(errors) {
    super(`System manifest validation failed: ${errors.join(" ")}`);
    this.name = "ManifestValidationError";
    this.errors = errors;
  }
}

export default class ManifestValidator {
  validate(manifest) {
    const errors = [];
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      return { valid: false, errors: ["Manifest must be an object."] };
    }
    for (const section of REQUIRED) if (!(section in manifest)) errors.push(`Missing required section: ${section}.`);
    for (const section of Object.keys(manifest)) if (!ROOT.includes(section)) errors.push(`Unknown root section: ${section}.`);
    for (const section of LISTS) {
      if (section in manifest && !Array.isArray(manifest[section])) errors.push(`${section} must be an array.`);
      const seen = new Set();
      for (const item of Array.isArray(manifest[section]) ? manifest[section] : []) {
        if (!item?.id) errors.push(`${section} entries require an id.`);
        else if (seen.has(item.id)) errors.push(`Duplicate ${section} id: ${item.id}.`);
        seen.add(item?.id);
      }
    }
    for (const field of ["name", "osVersion", "kernelVersion", "manifestVersion", "environment"]) {
      if (!manifest.metadata?.[field]) errors.push(`metadata.${field} is required.`);
    }
    for (const field of ["osVersion", "kernelVersion", "manifestVersion"]) {
      if (manifest.metadata?.[field] && !SEMVER.test(manifest.metadata[field])) errors.push(`metadata.${field} must use semantic versioning.`);
    }
    if (manifest.compatibility?.minimumKernelVersion && !SEMVER.test(manifest.compatibility.minimumKernelVersion)) errors.push("compatibility.minimumKernelVersion must use semantic versioning.");
    if (manifest.compatibility?.minimumManifestVersion && !SEMVER.test(manifest.compatibility.minimumManifestVersion)) errors.push("compatibility.minimumManifestVersion must use semantic versioning.");
    if (SEMVER.test(manifest.metadata?.kernelVersion || "") && SEMVER.test(manifest.compatibility?.minimumKernelVersion || "") && compareVersions(manifest.metadata.kernelVersion, manifest.compatibility.minimumKernelVersion) < 0) errors.push("metadata.kernelVersion is below compatibility.minimumKernelVersion.");
    if (SEMVER.test(manifest.metadata?.manifestVersion || "") && SEMVER.test(manifest.compatibility?.minimumManifestVersion || "") && compareVersions(manifest.metadata.manifestVersion, manifest.compatibility.minimumManifestVersion) < 0) errors.push("metadata.manifestVersion is below compatibility.minimumManifestVersion.");
    for (const path of findSecretFields(manifest)) errors.push(`Manifest must not contain secret field: ${path}.`);

    const ids = Object.fromEntries(["capabilities", "providers", "authorities", "services"].map((section) => [section, new Set((manifest[section] || []).map(({ id }) => id))]));
    for (const capability of manifest.capabilities || []) {
      if (capability.status === "active" && !capability.authority) errors.push(`Active capability ${capability.id} requires an authority.`);
      if (capability.authority && !ids.authorities.has(capability.authority)) errors.push(`Capability ${capability.id} references missing authority ${capability.authority}.`);
    }
    for (const provider of manifest.providers || []) {
      if (!Array.isArray(provider.supportedCapabilities)) errors.push(`Provider ${provider.id} requires supportedCapabilities.`);
      for (const capability of provider.supportedCapabilities || []) if (!ids.capabilities.has(capability)) errors.push(`Provider ${provider.id} references missing capability ${capability}.`);
    }
    for (const authority of manifest.authorities || []) {
      for (const id of authority.requiredCapabilities || []) if (!ids.capabilities.has(id)) errors.push(`Authority ${authority.id} references missing capability ${id}.`);
      for (const id of authority.requiredProviders || []) if (!ids.providers.has(id)) errors.push(`Authority ${authority.id} references missing provider ${id}.`);
      for (const id of authority.dependencies || []) {
        if (!ids.authorities.has(id)) errors.push(`Authority ${authority.id} references missing authority ${id}.`);
        if (id === authority.id) errors.push(`Authority ${authority.id} cannot depend on itself.`);
      }
    }
    for (const [field, section] of [["requiredAuthorities", "authorities"], ["requiredProviders", "providers"], ["requiredServices", "services"]]) {
      for (const id of manifest.boot?.[field] || []) if (!ids[section].has(id)) errors.push(`Boot requires missing ${section.slice(0, -1)} ${id}.`);
    }

    const graph = new Map((manifest.authorities || []).map(({ id, dependencies = [] }) => [id, dependencies]));
    const visiting = new Set();
    const visited = new Set();
    const visit = (id, path = []) => {
      if (visiting.has(id)) { errors.push(`Circular authority dependency: ${[...path, id].join(" -> ")}.`); return; }
      if (visited.has(id)) return;
      visiting.add(id);
      for (const dependency of graph.get(id) || []) if (graph.has(dependency)) visit(dependency, [...path, id]);
      visiting.delete(id);
      visited.add(id);
    };
    for (const id of graph.keys()) visit(id);
    return { valid: errors.length === 0, errors };
  }

  assert(manifest) {
    const result = this.validate(manifest);
    if (!result.valid) throw new ManifestValidationError(result.errors);
    return manifest;
  }
}
