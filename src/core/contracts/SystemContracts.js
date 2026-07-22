export class ContractViolationError extends Error {
  constructor(contract, violations) {
    super(`${contract} contract violation: ${violations.join(" ")}`);
    this.name = "ContractViolationError";
    this.code = "CONTRACT_VIOLATION";
    this.contract = contract;
    this.violations = violations;
  }
}

function requireFields(value, fields) {
  return fields.filter((field) => value?.[field] === undefined || value?.[field] === null || value?.[field] === "").map((field) => `${field} is required.`);
}

function assertContract(name, violations) {
  if (violations.length) throw new ContractViolationError(name, violations);
  return true;
}

export const AuthorityContract = Object.freeze({
  assert(descriptor, instance) {
    const violations = requireFields(descriptor, ["id", "name", "version", "status"]);
    if (instance && typeof instance.execute !== "function") violations.push("instance.execute must be a function.");
    return assertContract("Authority", violations);
  },
});

export const CapabilityContract = Object.freeze({
  assert(descriptor) {
    const violations = requireFields(descriptor, ["id", "name", "version", "status"]);
    if (descriptor?.status === "active" && !descriptor.authority) violations.push("active capabilities require an authority.");
    if (descriptor?.permissions && !Array.isArray(descriptor.permissions)) violations.push("permissions must be an array.");
    return assertContract("Capability", violations);
  },
});

export const ProviderContract = Object.freeze({
  assert(descriptor, instance) {
    const violations = requireFields(descriptor, ["id", "type", "version", "status"]);
    if (!Array.isArray(descriptor?.supportedCapabilities)) violations.push("supportedCapabilities must be an array.");
    if (instance && typeof instance.execute !== "function") violations.push("instance.execute must be a function.");
    if (instance?.health && typeof instance.health !== "function") violations.push("instance.health must be a function when provided.");
    return assertContract("Provider", violations);
  },
});

export const ServiceContract = Object.freeze({
  assert(descriptor, instance) {
    const violations = requireFields(descriptor, ["id", "name", "version", "status"]);
    if (instance?.start && typeof instance.start !== "function") violations.push("instance.start must be a function when provided.");
    if (instance?.health && typeof instance.health !== "function") violations.push("instance.health must be a function when provided.");
    return assertContract("Service", violations);
  },
});

export function successEnvelope({ requestId, data, metadata = {} }) {
  return Object.freeze({ ok: true, requestId, data, metadata, timestamp: new Date().toISOString() });
}

export function errorEnvelope({ requestId, error, metadata = {} }) {
  return Object.freeze({ ok: false, requestId, error: { code: error.code || "INTERNAL_ERROR", message: error.message }, metadata, timestamp: new Date().toISOString() });
}
