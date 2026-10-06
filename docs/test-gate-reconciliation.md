# Public candidate test-gate reconciliation

Baseline: `1bc8b5f6f45b88cc4bc311604178407992bcc9d2`.

The public export contract in EXPORT_SYNC.md deliberately excludes developer
export machinery and private household integrations. The shipping release
manifest and npm-shrinkwrap.json govern the installable payload.

* **public-contract.mjs — harness assumption.** Its inherited authority request
  expected success with an ambient legacy read-only configuration. Native CLI
  0.160.0 returns a null activePermissionProfile for that configuration. The
  authority resolver correctly rejects unknown provenance. The fixture now owns
  a disposable home with explicit `default_permissions = ":read-only"` and a
  synthetic approval-required call profile. It prepares and declines consent;
  it never starts a model turn. Legacy-variable poisoning remains. Authority
  implementation is unchanged; eight deterministic cases preserve rejection
  of ambiguous, conflicting, foreign-root and disallowed profile evidence.
* **release-discovery.mjs — product defect.** The maintained package repository
  and homepage identify Waterpark621/Codexless, but discovery still identified
  liyana31811/Codexless. Only the fixed publisher owner changes. Discovery does
  not consult local Git remotes or retained fork history. Artifact digest,
  product/version/build identity, host contract and transport checks remain.
* **installer-dual-insurance.mjs — invalid development-tree assumptions.**
  Overlay patches and public-export-policy.json belong to the wider export
  pipeline; package-lock.json is replaced by the shipping npm-shrinkwrap.json.
  Seven cases now inspect actual shipping installers/Doctor and manifest-bound
  payload files. Installer readiness, no silent fallback, rollback, platform
  pins and user-state preservation checks remain.
* **managed-runtime-surface.mjs — invalid private-frontdoor assumption.**
  mcp-stdio-household.mjs and process/receipt capabilities are intentionally
  absent from the public payload. The case now uses the shipping public
  frontdoor, verifies exactly 44 tools and rejects the excluded private route.
  Model-free commands, account preflight, project context, file reads, nested
  Codex exec/review rejection and Managed Agent hard-blocks remain covered.

These exclusions are intentional, not incomplete export. No private entrypoint
or export pipeline is added to make tests pass. The source correction requires
a new release manifest and sourceRevision; the Preview version stays unchanged.
