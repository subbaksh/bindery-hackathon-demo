# Proposal: Hackathon and Limited Availability Roadmap

Status: **One-week scope approved and frozen on 2026-08-06. Day 1 and the Day 2
planner/shared-preview slice are complete. Target demo and invitation-only Limited
Availability: 2026-08-13.**

## Index

- [Outcome](#outcome)
- [Launch Contract](#launch-contract)
- [Supported Capability Types](#supported-capability-types)
- [Golden Demo](#golden-demo)
- [Seven-Day Plan](#seven-day-plan)
- [Acceptance Gates](#acceptance-gates)
- [Limited Availability Operations](#limited-availability-operations)
- [Cuts and Stop Rules](#cuts-and-stop-rules)
- [Current Baseline](#current-baseline)
- [Next Approval](#next-approval)

## Outcome

Bindery launches from the hackathon as a small, usable package manager for local AI
agents—not only as a prototype video.

An invited engineer can:

1. install the private CLI;
2. sign in to a deployed Bindery;
3. discover a Capability;
4. preview exact local changes;
5. install an Agent Skill or MCP server into a supported client;
6. safely upgrade, remove, or replace it.

Admins define visible Capability Type contracts. Publishers supply values and real
files through the UI. The CLI resolves and executes only the two approved operations in
the [Capability system model](../specs/capability-model.md).

## Launch Contract

### Must ship

1. **Data, artifacts, and upload**
   - clean-slate `values` + named `fileTree` artifact model;
   - `copyFiles` + `updateConfig` only;
   - multipart file/folder upload; publisher ZIPs remain opaque binary files;
   - bounded SQLite BLOB storage, manifests, media types, and server-generated SHA-256;
   - atomic publication and no legacy contracts or development databases.
2. **Admin and publisher UI**
   - Admin can create and inspect Types, their content contracts, client/version
     implementations, and resolved previews;
   - publishers get guided fields, artifact upload, normalized tree/config previews,
     and publish-time validation;
   - Agent Skill, remote MCP, stdio MCP, and Cursor Rules have usable publisher paths.
3. **Packaged Ink CLI and installation**
   - private npm package published through GitHub Packages;
   - Ink covers sign-in, discover, details, install preview/confirmation, status, and
     removal for the Limited Availability journey;
   - non-interactive commands remain available and render without Ink control codes;
   - Codex and Claude Code are the first install clients.
4. **Compatibility and safety**
   - npm SemVer validation, client-version detection, and implementation matching;
   - project/user scope where offered;
   - file and structured-entry ownership, snapshots, drift prompts, and removal;
   - explicit conflict replacement;
   - existing equivalent MCP configuration discovery and scoped cleanup.
5. **Container, Helm, and deployment**
   - production container image;
   - single-replica Helm chart with SQLite on a persistent volume;
   - probes, resources, configuration/secret mounts, service, and optional ingress;
   - one deployed, stable Bindery instance using the existing approved auth path.
6. **Limited Availability readiness**
   - invitation-only access for a few dozen people;
   - seeded Capabilities, five-minute quickstart, support matrix, limitations, and
     feedback route;
   - automated checks, a rehearsed live demo, and a backup recording.

### Quality bar

- No fake install step in the demo.
- Admin, publisher, and CLI previews resolve to the same plan.
- No hidden client path or installation behavior.
- Risky changes name the affected owner and require distinct confirmation.
- UI and CLI state changes remain stable and readable; no remount-like flashing.

## Supported Capability Types

| Type | Admin/publisher support | Launch consumer support |
| --- | --- | --- |
| Agent Skill | Tree upload, `SKILL.md` validation, Capability-ID destination preview | Install in Codex and Claude Code |
| Remote MCP server | Name, Streamable HTTP URL, optional headers, resolved config preview | Install and detect equivalent config in Codex and Claude Code |
| Stdio MCP server | Name, command, ordered args, optional environment, resolved config preview | Install and detect equivalent config in Codex and Claude Code |
| Cursor Rules | Flat `.mdc` tree upload and `.cursor/rules` preview | Install into a Cursor project; not part of the primary live demo |

`AGENTS.md` is dropped from the hackathon and Limited Availability scope. MCP server
origin does not create another Type: a Bindery-hosted server and an externally hosted
server are both remote MCP servers from the client and publisher contract.

Collections continue to group exact Capability-version pins through their system-owned,
non-editable Type and dedicated publisher picker. The built-in MCPB Type is omitted for
this release. The generic artifact API can retain an opaque `.mcpb` as one file, but
MCPB validation and installation are not launch claims.

## Golden Demo

The primary story is five minutes or less:

1. **Admin:** inspect the Agent Skill Type—required content, Codex/Claude compatibility,
   scope, and exact `copyFiles` operations.
2. **Publisher:** create `hello-bindery`, upload `SKILL.md` plus supporting files, inspect
   the normalized tree and destinations, then publish.
3. **Consumer:** install the private CLI, sign in, discover the skill, preview the exact
   project paths, and install it for Codex.
4. **Agent:** show Codex using the installed skill.
5. **MCP:** select a remote MCP Capability. The CLI discovers a similar unmanaged Claude
   Code entry and asks whether to clean it up.
6. **Transparency:** show the exact old config entry and proposed managed entry; choose
   **Clean up and install** and complete the install.
7. **Lifecycle:** show status, then either upgrade the skill or replace a deterministic
   path conflict with **Uninstall conflict and install**.
8. **Launch:** show the deployed URL, Helm chart, quickstart, and invitation-only access.

The demo proves both launch claims: engineers can install Skills and MCP servers. Cursor
Rules are a model pressure test and backup demo, not required live-stage content.

## Seven-Day Plan

### Day 1 — Atomic model, artifact storage, and upload — complete

- Replace contracts with `values`, artifacts, `copyFiles`, and `updateConfig`.
- Add artifact rows and atomic Capability publication.
- Add bounded multipart file/folder upload and internal archive/path safety.
- Add configurable upload limits with defaults for request bytes, file bytes, artifact
  bytes, entries, compression ratio, and artifacts per Capability.
- Replace built-in Type documents and migrate Collection values to the ordinary pinned
  `values.members` map.
- Omit the built-in MCPB Type.
- Delete old server development databases. CLI state is handled with the Day 3 rewrite.
- Add contract, storage, upload, and validation tests.

The CLI installer remains intentionally unavailable after this server migration and until Day 3. The authenticated shell (`login`, `logout`, `whoami`) is now rebuilt; Day 1
does not partially migrate its executor or ledger. The server model and API must still
be designed against the approved install plan so Day 3 does not need to reinterpret
current Type documents.

**Gate:** publish and read an Agent Skill version with verified real bytes.

Completed 2026-08-07. Verified by the multipart/raw/ZIP/artifact/version tests and the
full 93-test suite. The production UI build also passes.

### Day 2 — Admin and publisher experience

- First remove Capability `typeVersion` pins and Type version management. Store one
  current Type per ID; before replacing it, validate every retained Capability version
  using that Type and reject the complete save with an impact report on any issue. Use
  Type-digest plus Capability-catalog-revision compare-and-swap, and make Capability
  publication commit only against the Type digest it validated.
- Update the Admin Type editor for values, artifact slots, operations, SemVer ranges,
  and template/resolved previews.
- Replace singular implementation operations with an ordered non-empty operation list;
  preflight the complete list, show execution order, and compensate completed writes in
  reverse order on failure.
- Build Copy files guidance around explicit artifact paths (`"."` for root),
  non-root project/user alternatives with `defaultScope`, one optional path-safe
  directory value, and resolved path previews without generic filesystem controls.
- Build Update configuration guidance around explicit `at: []`/literal segments, one
  value-derived key, a JSON-e object editor, target-format resolved preview, and strict
  refusal of unsafe shared-file rewrites. Treat fixed keys and broader mutation shapes
  as feedback-driven post-MVP expansion.
- Treat JSON, YAML, and TOML as equal first-class formats: syntax-highlight every source
  and resolved preview, show line/column parse diagnostics, validate and reparse rendered
  output authoritatively, and block invalid executable configuration. Keep diagnostics
  on ordinary artifact files non-blocking because they may be intentional snippets.
- Keep JSON-e as the bounded object renderer with deterministic context, no functions
  or time-dependent features, bounded evaluation, and server-authoritative validation;
  do not add Jsonnet or CUE runtimes for the MVP.
- Replace semantic pseudo-types with three value shapes (`string`, string `list`, and
  string `map`). Show optional closed **Validate as** rules separately and expose
  multiline content explicitly for strings, list items, and map values.
- Replace the left Type list with a card grid: New first, then current Types; selecting a
  card enters its editor directly.
- Make every existing Type save a two-click flow: first Save analyses all retained
  Capability versions; success collapses to an expandable green summary and re-arms a
  green Save button; the second Save reruns the guard and replaces the Type. Failures
  stay expanded with exact reasons.
- Add publisher fields and file/folder upload.
- Add the staged artifact tree/content editor with syntax-aware Markdown, JSON, YAML,
  TOML, and plain-text editing; unsupported binary files remain inspectable metadata.
  Keep drafts browser-side for the current session, highlight without auto-formatting,
  and derive folder nodes from editable file paths rather than building folder actions.
- Ship usable editors for Agent Skill, remote MCP, stdio MCP, and Cursor Rules.
- Drive client choices from a small internal known-client registry while retaining a
  Custom Client ID escape, forced all-version compatibility, and a visible warning that
  the CLI cannot detect versions for unregistered clients.
- Validate every implementation with real publisher data before publication.
- Keep the otherwise ordinary imported `native/collection` Type out of Admin Type editing
  and publish `values.members` ID-to-exact-SemVer pins through its dedicated picker.
- Extract one browser/CLI installation planner that resolves real Capability values,
  artifact targets, JSON-e config entries, client implementation, and selected scope
  without reading local state.
- Replace publisher inline client recipes with a compact **Supported clients** list and
  a large shared preview modal. Show one client/version/scope at a time, touched paths
  under a symbolic sample project/home, a file tree with safe content inspection, and
  structured config samples. Do not mock values when a real draft exists.
- Reuse the same modal on the published Capability page and keep raw operations/templates
  in Admin Type review only.

Planner and shared-preview slices completed 2026-08-11: one pure shared planner resolves
implementation ranges, scope, ordered artifact targets, JSON-e configuration entries,
and reparsed JSON/YAML/TOML samples. Publisher review and published inspection now use
one compact supported-client list and one target-tree/content modal. Draft files stay
in memory; retained bytes load only when selected. Collection member expansion remains
the one approved preview gap before CLI integration.

**Owner test drive:** publish one Capability of each Type and inspect exact client
outputs. No local installation is expected yet.

### Day 3 — Packaged Ink CLI and core execution

- Compile and package the CLI for the private GitHub npm registry.
- Build the Ink shell for sign-in, discover, details, preview, confirmation, status,
  and removal.
- Download and verify artifact bytes.
- Execute `copyFiles` and `updateConfig`.
- Use the same JSON/YAML/TOML codec contract as server validation and web preview. Make
  keyed edits preserve unrelated configuration content, comments, and format-native
  constructs or refuse before writing; validate the final document before atomic write.
  JSON and YAML implementations are built and covered alongside the guarded TOML
  adapter. The planner already consumes the shared codec; Day 3 wires the same plan into
  execution and must not call format libraries directly.
- Replace the ledger with installation identity, digests, structured targets, and
  snapshot references.
- Reconcile previous ledger targets against every replacement plan. Preview retired,
  updated, and new targets; restore/remove stale targets safely; replace ownership only
  after the complete transition succeeds.
- Restore Collection resolution, health, repair, and removal.

**Owner test drive:** run the source CLI, install a skill into a temporary project,
inspect the exact files and ledger, then install and inventory an MCP entry. Private
package installation and clean removal follow in the next cuts.

Core execution completed 2026-08-12: the real CLI resolves exact Capability/Type
documents, detects Claude Code/Codex, verifies artifact bytes, previews real paths,
writes files and JSON/YAML/TOML entries atomically, records exact ownership/snapshots,
and compensates failures. A 21-case real-process acceptance matrix exercises emulated
Claude/Codex project and user layouts, Skills, both MCP transports, preservation,
cleanup, snapshots, integrity failures, and non-interactive guardrails. Packaging
remains open. The lifecycle cut now reverses clean installs,
restores pre-Bindery files/config values, handles local drift explicitly, reverses
approved unmanaged MCP cleanup, upgrades retained targets, retires removed targets,
preserves first snapshots, and releases ledger/snapshot ownership only on success.

### Day 4 — SemVer, scopes, MCP discovery, and conflicts

- Add npm SemVer validation and bounded Codex/Claude version detectors.
- Select the one compatible Type implementation.
- Add install-wide scope selection.
- Detect equivalent unmanaged remote and stdio MCP entries.
- Add previewed **Clean up and install**, including restoration on failure.
- Add ownership/drift prompts, snapshots, and **Uninstall conflict and install**.
- Enforce one declared config format per absolute file across all ledger owners and
  literal, format-safe config path/key segments.
- Add explicit non-interactive flag coverage.

**Owner test drive:** install MCP configurations into Codex and Claude Code, exercise
unmanaged cleanup, upgrade v1 to v2, edit a managed target, and replace a conflict.

SemVer detection, scope selection, MCP inventory, active-Bindery session headers,
managed/drift labels, and reversible unmanaged cleanup completed with Slice 3 on
2026-08-12. Uninstall and its keep/restore/cancel drift decisions are complete. Upgrade
reconciliation now atomically updates, adds, and retires file/config targets with the
same decisions and reverse compensation. Explicit conflict replacement shows and
removes complete displaced owners, then performs a visible fresh install, supports
multiple owners, and changes ledger ownership only after both phases succeed.

### Day 5 — Container, Helm, deployment, and package access

- Build and smoke-test the production image.
- Add the single-replica SQLite/PVC Helm chart and deployment checks.
- Deploy one stable instance through the approved auth path.
- Publish the private npm package through GitHub Packages.
- Write access/bootstrap instructions for invited users.

**Owner test drive:** join as an invited user on a clean machine/profile, install the
CLI package, sign in, and install from the deployed Bindery.

### Day 6 — Hardening and rehearsal

- Fix friction in the complete journey; add no model features.
- Seed Skills, remote MCP, stdio MCP, Cursor Rules, and deterministic conflicts.
- Finish quickstart, support matrix, limitations, backup, and feedback instructions.
- Run isolated CLI E2E and rehearse the timed demo.

**Owner test drive:** perform the full demo without developer intervention.

### Day 7 — Freeze and Limited Availability launch

- Make no architecture or feature changes.
- Test clean server state, clean CLI state, and clean projects.
- Run the complete automated and deployment suite.
- Record the backup demo and prepare the submission.
- Invite the initial users and fix only launch blockers.

## Acceptance Gates

### Product

- A publisher uploads files without writing file bodies in YAML.
- Admin and publisher previews match the CLI plan.
- Skills install into Codex and Claude Code and are visible to those agents.
- Remote and stdio MCP entries install into Codex and Claude Code.
- A similar unmanaged MCP entry is detected before mutation; cleanup shows and removes
  only that logical entry and restores it if the new install fails.
- Cursor Rules publish and install into `.cursor/rules`.
- Upgrade, drift, replacement, removal, and restoration behave as previewed.

### Engineering

- `npm test`, typecheck, and UI build pass.
- CLI E2E uses isolated temporary project and home directories.
- Binary and text artifacts verify against server-generated SHA-256.
- Upload caps and ZIP traversal/bomb defenses have tests.
- No legacy `content`, `writeFiles`, or format-specific update operation remains in the
  active server, shared contract, or Admin/publisher surfaces. The old CLI is not a
  supported compatibility path and is replaced in one pass on Day 3.
- No old local database or ledger is required for startup.
- `docs/specs/codebase-diagram.md` matches the implementation.

### Distribution and deployment

- The private npm package installs from GitHub Packages using documented access.
- The deployed Bindery is reachable by an invited user and has a stable URL.
- The container runs as non-root with working health probes.
- `helm lint` and `helm template` pass.
- Chart defaults enforce one replica and persistent SQLite storage.
- Backup and restore instructions cover the SQLite volume.
- The support matrix names exact supported Types, clients, scopes, and known limits.

## Limited Availability Operations

- Audience: invitation-only, a few dozen users.
- Distribution: private npm package through GitHub Packages.
- Deployment: one Bindery replica with persistent SQLite.
- Support: one documented feedback/issue route and an owner for launch week.
- Change policy: analyse and explicitly confirm propagated Type changes; record document
  digests in future install plans and never silently reinterpret them.
- Data safety: back up the SQLite volume before upgrades.
- Availability claim: useful early access, not production SLA or multi-replica service.

Postgres remains the intended shared/multi-replica store, but implementing it this week
would displace user-visible install safety. It is required before removing the
single-replica constraint, not before this invitation-only release.

## Cuts and Stop Rules

### Explicitly out

- `AGENTS.md` Type.
- Public signup or public npm distribution.
- Postgres adapter or multiple Bindery replicas.
- Every-client support or version detection.
- Live MCP endpoint/process health checks during install.
- Full CLI command migration beyond the Limited Availability journey.
- Audit implementation and Capability Type history browser.
- MCPB installation.
- Built-in MCPB Type and MCPB-specific validation.
- Artifact linking, deduplication, OCI, S3, or another blob service.
- Rules compilation, generic transforms, shell installers, or new operations.
- Full transactional rollback beyond scoped snapshots and replacement/cleanup recovery.

### GitHub source work

- Support repository-wide or repository-subpath sources.
- Support four explicit interpretations: Capability Types, native Bindery
  Capabilities, established Skills repositories, and flat Cursor Rules repositories.
- Skills receive direct, read-only import and automatic source versions shaped as
  `0.0.0-<commit-unix-time>.g<short-sha>` only when their directory digest changes.
- Cursor Rules receive the same automatic version behavior per direct `.mdc` file.
- Imported Capabilities and Types reserve metadata `source` and `path` as trusted import
  provenance. They show **From GitHub**, are read-only, and use the pair to correlate
  later manual syncs; regular authoring cannot set or change those keys.
- Store GitHub sources in a minimal `githubSources` map keyed by stable source ID. Each
  entry has `type`, canonical repository `source`, and optional `path` and `ref`;
  credentials remain server-level deployment configuration for the hackathon.
- Keep sync one-way and previewed. One generic discovery engine reads a typed internal
  registry of file/directory candidates, filename patterns or exact markers, and
  bounded locations. Semantic import remains source-specific.
- Treat GitHub as an explicit importer for the hackathon, not a lifecycle owner.
  Matching source/path provenance allows refresh, while upstream removal never mutates
  catalog content. Explicit confirmed source deletion removes its imported resources;
  automatic reconciliation and detachment are post-hackathon work.
- One Import or manual Sync discovers everything and imports every valid candidate.
  Results show added, updated, unchanged, and failed resources. Each resource remains
  atomic, but successful imports are not rolled back when a later candidate fails.
  There is no polling, scheduled sync, or editable staging workflow.
- Public repositories work anonymously; one optional server-only
  `BINDERY_GITHUB_TOKEN` supports private repositories and higher limits. OAuth,
  GitHub Apps, browser login, and per-source credentials are deferred.

### Stop rules

- If the atomic model migration is not green by the end of Day 2, cut Cursor Rules UI
  polish and all non-launch visual work.
- If packaged Skill installation is not reliable by the end of Day 3, reduce Ink to the
  install journey and keep secondary commands in the existing renderer.
- If MCP cleanup is not safe by the end of Day 4, still ship MCP installation but block
  on detected equivalents; do not silently install duplicates.
- If deployment is not reachable by the end of Day 5, freeze UI polish and spend Day 6
  only on deployment and the two launch install paths.
- Freeze features after Day 5. Days 6–7 are reliability and launch work.

## Current Baseline

| Area | Exists | Required change |
| --- | --- | --- |
| Capability Types | One current document, retained-catalog guarded save, four-step guided/YAML wizard, Agent Skill/MCP/Cursor Rules | Owner visual validation; CLI execution on Day 3 |
| Publisher | Three-step Details/Content/Review flow, exact Capability SemVer, Type-driven values, file/folder staging/editing, Collection pins, and the shared Supported-clients/installation-preview modal | Collection plan expansion; actual local preflight remains Day 3 CLI work |
| Consumer | React 19.2/Ink 7 auth/catalog plus direct install/upgrade/uninstall, visible progress, per-Type local cache, exact previews, atomic execution, strict ledger/snapshots, drift choices, explicit conflict replacement, and `show mcp` | Private package distribution |
| Compatibility | npm SemVer ranges plus bounded Codex/Claude detection and exact implementation selection | Add clients only after a tested launch need |
| MCP safety | Structured edits, active-server auth enrichment, known-location inventory, exact ownership/drift labels, reversible equivalent cleanup, and managed-owner replacement | Later login-driven token refresh |
| GitHub sources | Source/result contracts, reserved read-only provenance, bounded transport, registry discovery, four interpreters, guarded catalog import, persisted complete latest result, and manual Admin add/edit/import/sync/delete UI | Owner test drive; import history and post-hackathon reconciliation remain intentionally deferred |
| Storage | Local SQLite with bounded artifact BLOB rows and atomic guarded publication | Postgres remains deferred |
| Deployment | Local Node process | Container, single-replica SQLite/PVC Helm chart, deployed instance |
| Distribution | Private source package through `tsx` | Compiled private npm package through GitHub Packages |

The Day 1 server/model migration is complete; remaining gaps are listed in the
canonical document's Current Implementation Status. This roadmap does not describe the
removed vocabulary as an alternative path.

## Next Approval

After the GitHub-source UI test drive, approve the deployment slice: a production
container plus a single-replica SQLite/PVC Helm chart. Source-driven reconciliation,
removal, rollback, polling, and expanded authentication remain post-hackathon work.
