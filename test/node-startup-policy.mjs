import assert from "node:assert/strict";
import { assertQualifiedNodeStartupEnvironment } from "../src/node-startup-policy.mjs";

assert.deepEqual(assertQualifiedNodeStartupEnvironment({}), { nodeOptions: "absent" });
assert.deepEqual(assertQualifiedNodeStartupEnvironment({ NODE_OPTIONS: "   " }), { nodeOptions: "absent" });
assert.throws(
  () => assertQualifiedNodeStartupEnvironment({ NODE_OPTIONS: "--require private-hook.cjs" }),
  /CODEXLESS_UNQUALIFIED_NODE_OPTIONS/,
);
console.log("qualified Node startup environment policy PASS");
