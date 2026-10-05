export function buildPublicHealthMetadata({ runtime, releaseIdentity } = {}) {
  if (!runtime || typeof runtime !== "object") throw new TypeError("runtime is required");
  if (!releaseIdentity || typeof releaseIdentity !== "object") throw new TypeError("releaseIdentity is required");
  const version = requireString(runtime.version, "runtime.version");
  const surfaceVersion = requireString(runtime.surfaceVersion, "runtime.surfaceVersion");
  const buildId = requireBuildId(releaseIdentity.buildId);
  const sourceRevision = normalizeSourceRevision(releaseIdentity.sourceRevision);
  const toolCount = Array.isArray(runtime.toolAllowlist) ? runtime.toolAllowlist.length : null;
  return {
    ok: true,
    service: "codexless-public",
    transport: "streamable-http",
    publicPreview: true,
    version,
    surfaceVersion,
    buildId,
    sourceRevision,
    toolCount,
  };
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

function requireBuildId(value) {
  const text = requireString(value, "releaseIdentity.buildId").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(text)) throw new TypeError("releaseIdentity.buildId must be sha256");
  return text;
}

function normalizeSourceRevision(value) {
  if (value === null || value === undefined) return null;
  return requireString(value, "releaseIdentity.sourceRevision");
}
