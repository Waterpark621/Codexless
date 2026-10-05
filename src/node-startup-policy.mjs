export function assertQualifiedNodeStartupEnvironment(env = process.env) {
  const nodeOptions = typeof env?.NODE_OPTIONS === "string" ? env.NODE_OPTIONS.trim() : "";
  if (nodeOptions) {
    throw new Error("CODEXLESS_UNQUALIFIED_NODE_OPTIONS: NODE_OPTIONS must be unset for the qualified runtime path.");
  }
  return Object.freeze({ nodeOptions: "absent" });
}
