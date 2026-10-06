import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCodexAuthorityProjection as normalize } from "../src/codex-authority-executor.mjs";

const authorityRoot = "C:/work/fixture";
function fixture(overrides = {}) {
  return {
    started: { activePermissionProfile: null, cwd: authorityRoot,
      runtimeWorkspaceRoots: [authorityRoot], sandbox: { type: "readOnly" } },
    effectiveConfig: { sandboxMode: "read-only", approvalPolicy: "never" },
    allowedProfiles: new Set([":read-only", ":workspace"]), authorityRoot,
    ...overrides,
  };
}

test("inherit fails closed when legacy read-only config cannot prove an active profile", () => {
  assert.throws(() => normalize(fixture()), /neither explicit default_permissions nor supported/);
});
test("explicit read-only provenance proves the fixture ceiling without broadening it", () => {
  assert.deepEqual(normalize(fixture({ effectiveConfig: { defaultPermissions: ":read-only" } })),
    { profileId: ":read-only", provenance: "config/read:default_permissions" });
});
test("supported legacy workspace/on-request provenance still requires matching projection", () => {
  const input = fixture({ effectiveConfig: { sandbox_mode: "workspace-write", approval_policy: "on-request" } });
  input.started.sandbox.type = "workspaceWrite";
  assert.equal(normalize(input).profileId, ":workspace");
  input.effectiveConfig.approval_policy = "never";
  assert.throws(() => normalize(input), /neither explicit default_permissions nor supported/);
});
test("explicit provenance rejects conflicting values, root/cwd mismatch and sandbox mismatch", () => {
  for (const mutate of [
    (x) => { x.effectiveConfig.default_permissions = ":workspace"; },
    (x) => { x.started.runtimeWorkspaceRoots = ["C:/work/foreign"]; },
    (x) => { x.started.cwd = "C:/work/foreign"; },
    (x) => { x.started.sandbox.type = "workspaceWrite"; },
  ]) {
    const input = fixture({ effectiveConfig: { defaultPermissions: ":read-only" } });
    mutate(input);
    assert.throws(() => normalize(input), /failed closed/);
  }
});
test("custom or disallowed profiles cannot be inferred from a legacy sandbox", () => {
  const custom = fixture({ effectiveConfig: { defaultPermissions: "custom" }, allowedProfiles: ["custom"] });
  assert.throws(() => normalize(custom), /cannot be proven equivalent/);
  assert.throws(() => normalize(fixture({ effectiveConfig: { defaultPermissions: ":danger-full-access" } })), /not currently allowed/);
});
test("malformed active profile never falls back to explicit config", () => {
  const input = fixture({ effectiveConfig: { defaultPermissions: ":read-only" } });
  input.started.activePermissionProfile = {};
  assert.throws(() => normalize(input), /present without a usable id/);
});
test("trusted read-only downscope requires an explicit caller opt-in and root binding", () => {
  assert.equal(normalize(fixture({ allowTrustedReadOnlyDownscope: true })).profileId, ":read-only");
  for (const mutate of [
    (x) => { x.started.cwd = "C:/work/foreign"; },
    (x) => { x.started.runtimeWorkspaceRoots = ["C:/work/foreign"]; },
    (x) => { x.allowedProfiles = [":workspace"]; },
  ]) {
    const input = fixture({ allowTrustedReadOnlyDownscope: true });
    mutate(input);
    assert.throws(() => normalize(input), /failed closed/);
  }
});
test("active profile evidence must be currently allowed", () => {
  const input = fixture();
  input.started.activePermissionProfile = { id: ":read-only" };
  assert.deepEqual(normalize(input), { profileId: ":read-only", provenance: "activePermissionProfile" });
  input.started.activePermissionProfile.id = ":danger-full-access";
  assert.throws(() => normalize(input), /not currently allowed/);
});
