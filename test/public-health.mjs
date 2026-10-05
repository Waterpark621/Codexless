import assert from "node:assert/strict";
import { buildPublicHealthMetadata } from "../src/public-health.mjs";

const runtime = {
  version: "0.1.2-preview.1",
  surfaceVersion: "codexless-public-preview-v1",
  toolAllowlist: ["one", "two"],
  authorityValidation: { defaultCwd: "C:\\private\\project" },
};
const releaseIdentity = {
  buildId: "a".repeat(64),
  sourceRevision: "b".repeat(40),
};

const health = buildPublicHealthMetadata({ runtime, releaseIdentity });
assert.deepEqual(health, {
  ok: true,
  service: "codexless-public",
  transport: "streamable-http",
  publicPreview: true,
  version: "0.1.2-preview.1",
  surfaceVersion: "codexless-public-preview-v1",
  buildId: "a".repeat(64),
  sourceRevision: "b".repeat(40),
  toolCount: 2,
});
assert.equal(Object.hasOwn(health, "defaultCwd"), false);
assert.equal(JSON.stringify(health).includes("private"), false);
assert.throws(() => buildPublicHealthMetadata({ runtime, releaseIdentity: { ...releaseIdentity, buildId: "bad" } }), /sha256/);

console.log("public health release identity/privacy PASS");
