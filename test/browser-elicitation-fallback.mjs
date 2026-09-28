import assert from "node:assert/strict";
import { createRequire } from "node:module";

import { BrowserElicitationBridge } from "../src/browser-elicitation-bridge.mjs";
import { registerBrowserPreviewTools } from "../src/browser-tools.mjs";

const require = createRequire(import.meta.url);
const { CLIENT_CAPABILITIES_META_KEY } = require("@modelcontextprotocol/server");

function originRequest(origin = "https://example.com") {
  return {
    mode: "form",
    message: "Allow Browser access",
    requestedSchema: { type: "object", properties: {} },
    _meta: {
      codex_approval_kind: "mcp_tool_call",
      connector_id: "browser-use",
      tool_name: "access_browser_origin",
      persist: "always",
      origin,
    },
  };
}

function genericRequest() {
  return {
    mode: "form",
    message: "Generic prompt",
    requestedSchema: { type: "object", properties: {} },
  };
}

function requestOnce(bridge, request, seen) {
  return new Promise((resolve, reject) => {
    const handle = {
      method: "mcpServer/elicitation/request",
      params: { serverName: "node_repl", request },
      settled: false,
      resolve(value) {
        this.settled = true;
        seen.push(value);
        resolve(value);
      },
      reject(value) {
        this.settled = true;
        reject(new Error(JSON.stringify(value)));
      },
    };
    bridge.handleServerRequest(handle);
  });
}

function taskFor(bridge, request, state) {
  return async () => {
    state.taskRuns += 1;
    const response = await requestOnce(bridge, request, state.responses);
    return { ok: true, response };
  };
}

async function fallbackOriginFlow() {
  const bridge = new BrowserElicitationBridge({ continuationTtlMs: 5_000 });
  const state = { taskRuns: 0, responses: [] };
  const input = { tabRef: "browser_tab_a", cwd: "C:/workspace", maxChars: 1_000 };

  const first = await bridge.run({
    toolName: "codex.browser_read",
    input,
    task: taskFor(bridge, originRequest(), state),
  });

  assert.equal(first.isError, false);
  assert.equal(first.structuredContent.status, "permission_required");
  assert.equal(first.structuredContent.operationCompleted, false);
  assert.equal(first.structuredContent.permission.kind, "browser_origin_permission");
  assert.equal(first.structuredContent.permission.origin, "https://example.com");
  assert.equal(first.structuredContent.permission.persistence, "always");
  assert.equal(first.structuredContent.permission.acceptSupported, true);

  const token = first.structuredContent.continuation.requestState;
  assert.equal(typeof token, "string");

  let continuationTaskRan = false;
  const second = await bridge.run({
    toolName: "codex.browser_read",
    input,
    task: async () => {
      continuationTaskRan = true;
      return { bad: true };
    },
    fallbackContinuation: {
      requestState: token,
      response: { action: "accept" },
    },
  });

  assert.deepEqual(second, {
    ok: true,
    response: { action: "accept", content: { persist: "always" } },
  });
  assert.equal(state.taskRuns, 1);
  assert.equal(continuationTaskRan, false);
  assert.deepEqual(state.responses, [
    { action: "accept", content: { persist: "always" } },
  ]);

  await assert.rejects(
    bridge.run({
      toolName: "codex.browser_read",
      input,
      task: async () => ({ bad: true }),
      fallbackContinuation: {
        requestState: token,
        response: { action: "accept" },
      },
    }),
    /expired|already consumed/i
  );

  bridge.close();
}

async function tamperAndForge() {
  const bridge = new BrowserElicitationBridge({ continuationTtlMs: 5_000 });
  const state = { taskRuns: 0, responses: [] };
  const input = { tabRef: "browser_tab_b", cwd: "C:/workspace", maxChars: 1_000 };
  const first = await bridge.run({
    toolName: "codex.browser_read",
    input,
    task: taskFor(bridge, originRequest(), state),
  });
  const token = first.structuredContent.continuation.requestState;

  await assert.rejects(
    bridge.run({
      toolName: "codex.browser_read",
      input: { ...input, maxChars: 1_001 },
      task: async () => ({ bad: true }),
      fallbackContinuation: {
        requestState: token,
        response: { action: "accept" },
      },
    }),
    /exact tool and input/i
  );

  await assert.rejects(
    bridge.run({
      toolName: "codex.browser_read",
      input,
      task: async () => ({ bad: true }),
      fallbackContinuation: {
        requestState: token + "x",
        response: { action: "accept" },
      },
    }),
    /invalid or expired/i
  );

  const done = await bridge.run({
    toolName: "codex.browser_read",
    input,
    task: async () => ({ bad: true }),
    fallbackContinuation: {
      requestState: token,
      response: { action: "accept" },
    },
  });

  assert.equal(done.ok, true);
  assert.equal(state.taskRuns, 1);
  bridge.close();
}

async function unsupportedFallbackAcceptance() {
  const bridge = new BrowserElicitationBridge({ continuationTtlMs: 5_000 });
  const state = { taskRuns: 0, responses: [] };
  const input = { tabRef: "browser_tab_generic" };
  const first = await bridge.run({
    toolName: "codex.browser_read",
    input,
    task: taskFor(bridge, genericRequest(), state),
  });

  assert.equal(first.structuredContent.permission.acceptSupported, false);
  const token = first.structuredContent.continuation.requestState;

  await assert.rejects(
    bridge.run({
      toolName: "codex.browser_read",
      input,
      task: async () => ({ bad: true }),
      fallbackContinuation: {
        requestState: token,
        response: { action: "accept" },
      },
    }),
    /cannot be accepted/i
  );

  bridge.close();
}

async function capabilityModes() {
  for (const [label, caps, expectNative] of [
    ["modern-form", { elicitation: { form: {} } }, true],
    ["legacy-bare", { elicitation: {} }, true],
    ["url-only", { elicitation: { url: {} } }, false],
    ["missing", {}, false],
  ]) {
    const bridge = new BrowserElicitationBridge({ continuationTtlMs: 5_000 });
    const state = { taskRuns: 0, responses: [] };
    const input = { tabRef: "browser_tab_" + label };
    const mcpReq = {
      envelope: {
        [CLIENT_CAPABILITIES_META_KEY]: caps,
      },
    };

    const first = await bridge.run({
      toolName: "codex.browser_read",
      input,
      mcpReq,
      task: taskFor(bridge, originRequest(), state),
    });

    if (expectNative) {
      assert.equal(first.resultType, "input_required", label);
      assert.ok(first.inputRequests?.browser_elicitation, label);
    } else {
      assert.equal(first.structuredContent?.status, "permission_required", label);
    }

    bridge.close();
  }
}

async function schemaAndHandlerBinding() {
  const registered = new Map();
  let captured = null;
  const elicitationBridge = {
    async run(value) {
      captured = value;
      return {
        content: [{ type: "text", text: "{\"status\":\"ok\"}" }],
        structuredContent: { status: "ok" },
      };
    },
  };

  registerBrowserPreviewTools({
    registerTool(name, definition, handler) {
      registered.set(name, { definition, handler });
    },
  }, {}, { elicitationBridge });

  const read = registered.get("codex.browser_read");
  assert.ok(read);

  const continuation = {
    requestState: "signed-state",
    response: { action: "accept" },
  };

  assert.equal(
    read.definition.inputSchema.safeParse({
      tabRef: "browser_tab_schema",
      maxChars: 1_000,
    }).success,
    true
  );
  assert.equal(
    read.definition.inputSchema.safeParse({
      tabRef: "browser_tab_schema",
      maxChars: 1_000,
      _browserContinuation: continuation,
    }).success,
    true
  );
  assert.equal(
    read.definition.inputSchema.safeParse({
      tabRef: "browser_tab_schema",
      randomExtra: true,
    }).success,
    false
  );
  assert.equal(
    read.definition.inputSchema.safeParse({
      tabRef: "browser_tab_schema",
      _browserContinuation: {
        requestState: "signed-state",
        response: { action: "accept", extra: true },
      },
    }).success,
    false
  );

  const mcpReq = { envelope: {} };
  const result = await read.handler({
    tabRef: "browser_tab_schema",
    maxChars: 1_000,
    _browserContinuation: continuation,
  }, { mcpReq });

  assert.equal(result.structuredContent.status, "ok");
  assert.deepEqual(captured.input, {
    tabRef: "browser_tab_schema",
    maxChars: 1_000,
  });
  assert.deepEqual(captured.fallbackContinuation, continuation);
  assert.equal(captured.mcpReq, mcpReq);
}

await fallbackOriginFlow();
await tamperAndForge();
await unsupportedFallbackAcceptance();
await capabilityModes();
await schemaAndHandlerBinding();

console.log("BROWSER_ELICITATION_FALLBACK_OK");
