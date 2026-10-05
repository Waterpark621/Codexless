import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildReleaseManifest, readReleaseManifest, serializeReleaseManifest } from "../src/release-identity.mjs";
import { PUBLIC_SERVER_VERSION, PUBLIC_SURFACE_VERSION } from "../src/surface-contracts.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = await readReleaseManifest(root);
const current = await buildReleaseManifest({
  root,
  serverVersion: PUBLIC_SERVER_VERSION,
  hostContractVersion: PUBLIC_SURFACE_VERSION,
  sourceRevision: manifest.sourceRevision,
});
const head = git(["rev-parse", "HEAD"]);
const parent = git(["rev-parse", "HEAD^"]);
const status = git(["status", "--porcelain"]);
const diffNames = git(["diff", "--name-only", manifest.sourceRevision ?? "HEAD", "HEAD"])
  .split(/\r?\n/)
  .filter(Boolean);
const sourceRevisionFormat = typeof manifest.sourceRevision === "string" && /^[0-9a-f]{40}$/.test(manifest.sourceRevision);
const sourceRevisionIsParent = sourceRevisionFormat && manifest.sourceRevision === parent;
const manifestOnlyIdentityCommit =
  diffNames.length === 1 && diffNames[0] === "config/release-manifest.json";
const manifestCurrent = serializeReleaseManifest(current) === serializeReleaseManifest(manifest);
const strayTracked = git(["ls-files", "node_modules", "_work", "NUL", "nul"])
  .split(/\r?\n/)
  .filter(Boolean);
const clean = status.length === 0;

const receipt = {
  ok: manifestCurrent && clean && sourceRevisionIsParent && manifestOnlyIdentityCommit && strayTracked.length === 0,
  version: manifest.version,
  buildId: manifest.buildId,
  sourceRevision: manifest.sourceRevision,
  head,
  manifestCurrent,
  clean,
  sourceRevisionIsParent,
  manifestOnlyIdentityCommit,
  strayTracked,
};
process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
if (!receipt.ok) process.exitCode = 1;

function git(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
  if (result.status !== 0) {
    throw new Error("git release gate command failed");
  }
  return result.stdout.trim();
}
