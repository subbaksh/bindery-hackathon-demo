import { createHash } from "node:crypto";
import { extname } from "node:path";
import { pathToFileURL } from "node:url";
import { artifactMediaType } from "../src/server/capability-artifacts.js";
import { listCapabilityTypes, validateCapabilityAgainstType } from "../src/server/capability-types.js";
import { listCapabilities, recordCapability, removeCapability } from "../src/server/capabilities.js";
import { appendAudit, appendCapabilityVersion } from "../src/server/state.js";
import {
  capabilityRecordSchema,
  type CapabilityArtifactDefinition,
  type CapabilityRecord,
  type CapabilityTypeDefinition,
  type CapabilityValueDefinition
} from "../src/shared/contracts.js";
import type { CapabilityArtifactFile } from "../src/server/store/state-store.js";

const DEMO_METADATA_KEY = "bindery.demo";
const DEMO_THEME_METADATA_KEY = "bindery.demo.theme";
const DEMO_VERSION = "1.0.0";
const COLLECTION_TYPE = "native/collection";

type DemoIdentity = Pick<CapabilityRecord, "id" | "name" | "description" | "tags">;
type DemoTheme = { id: "documentation" | "testing" | "code-review"; label: string };
type DemoExample = { identity: DemoIdentity; theme: DemoTheme };
type SeededItem = { id: string; name: string; type: string };
type SkippedType = { type: string; reason: string };

export type DemoSeedResult = {
  created: SeededItem[];
  existing: SeededItem[];
  skipped: SkippedType[];
};

const DEMO_THEMES: DemoTheme[] = [
  { id: "documentation", label: "Documentation" },
  { id: "testing", label: "Testing" },
  { id: "code-review", label: "Code Review" }
];

export async function seedDemoData(): Promise<DemoSeedResult> {
  const definitions = (await listCapabilityTypes()).filter((definition) => definition.enabled);
  if (definitions.length === 0) {
    throw new Error("No Capability Types are available. Import the Capability Type GitHub source before seeding demo data.");
  }

  const current = await listCapabilities();
  const existingIds = new Set(current.map((capability) => capability.id));
  const created: SeededItem[] = [];
  const existing: SeededItem[] = [];
  const skipped: SkippedType[] = [];

  const installableTypes = definitions
    .filter((definition) => definition.id !== COLLECTION_TYPE)
    .sort((left, right) => demoPriority(left.id) - demoPriority(right.id) || left.label.localeCompare(right.label));

  for (const definition of installableTypes) {
    for (const example of demoExamples(definition)) {
      if (existingIds.has(example.identity.id)) {
        existing.push({ id: example.identity.id, name: example.identity.name, type: definition.id });
        continue;
      }

      const candidate = buildDemoCapability(definition, example);
      if (!candidate.ok) {
        skipped.push({ type: definition.id, reason: `${example.theme.label}: ${candidate.reason}` });
        continue;
      }

      const stored = await appendCapabilityVersion(candidate.record, candidate.files, JSON.stringify(definition));
      if (!stored) {
        skipped.push({ type: definition.id, reason: `${example.theme.label}: Capability Type changed while demo data was being generated` });
        continue;
      }
      created.push({ id: stored.id, name: stored.name, type: stored.type });
      existingIds.add(stored.id);
    }
  }

  const collectionDefinition = definitions.find((definition) => definition.id === COLLECTION_TYPE);
  if (collectionDefinition) {
    for (const collection of demoCollectionExamples()) {
      if (existingIds.has(collection.identity.id)) {
        existing.push({ id: collection.identity.id, name: collection.identity.name, type: COLLECTION_TYPE });
      } else {
        const members = (await listCapabilities())
          .filter((capability) => capability.type !== COLLECTION_TYPE && isDemoCapability(capability) && capability.metadata?.[DEMO_THEME_METADATA_KEY] === collection.theme.id)
          .sort((left, right) => demoPriority(left.type) - demoPriority(right.type) || left.name.localeCompare(right.name))
          .slice(0, 4);
        if (members.length > 0) {
          const outcome = await recordCapability({
            ...collection.identity,
            owner: "Platform Engineering",
            metadata: { [DEMO_METADATA_KEY]: "true", [DEMO_THEME_METADATA_KEY]: collection.theme.id },
            type: COLLECTION_TYPE,
            values: { members: Object.fromEntries(members.map((member) => [member.id, member.version])) },
            artifacts: {},
            version: DEMO_VERSION
          });
          if (outcome.ok) {
            created.push({ id: outcome.capability.id, name: outcome.capability.name, type: outcome.capability.type });
            existingIds.add(outcome.capability.id);
          } else {
            skipped.push({ type: COLLECTION_TYPE, reason: `${collection.identity.name}: ${outcome.errors.map((issue) => issue.message).join("; ")}` });
          }
        } else {
          skipped.push({ type: COLLECTION_TYPE, reason: `${collection.identity.name}: No matching demo capabilities were available to include` });
        }
      }
    }
  } else {
    skipped.push({ type: COLLECTION_TYPE, reason: "Capability Type is not imported" });
  }

  await appendAudit("demo-data.seeded", {
    created: created.map((item) => item.id),
    existing: existing.map((item) => item.id),
    skipped: skipped.map((item) => item.type)
  });
  return { created, existing, skipped };
}

export async function clearDemoData(): Promise<string[]> {
  const demoCapabilities = (await listCapabilities()).filter(isDemoCapability);
  const ordered = demoCapabilities.sort((left, right) => Number(left.type !== COLLECTION_TYPE) - Number(right.type !== COLLECTION_TYPE));
  const removed: string[] = [];
  for (const capability of ordered) {
    if (await removeCapability(capability.id)) removed.push(capability.id);
  }
  await appendAudit("demo-data.cleared", { removed });
  return removed;
}

function buildDemoCapability(
  definition: CapabilityTypeDefinition,
  example: DemoExample
): { ok: true; record: CapabilityRecord; files: CapabilityArtifactFile[] } | { ok: false; reason: string } {
  const { identity, theme } = example;
  const values = Object.fromEntries(definition.values.map((value) => [value.key, demoValue(value, identity)]));
  const files = definition.artifacts.flatMap((artifact) => demoArtifactFiles(definition, artifact, identity));
  const artifacts = Object.fromEntries(definition.artifacts.map((artifact) => {
    const entries = files
      .filter((file) => file.slot === artifact.key)
      .map(({ path, mediaType, size, sha256 }) => ({ path, mediaType, size, sha256 }));
    return [artifact.key, { type: "fileTree" as const, entries }];
  }));

  const parsed = capabilityRecordSchema.safeParse({
    ...identity,
    owner: "Platform Engineering",
    metadata: { [DEMO_METADATA_KEY]: "true", [DEMO_THEME_METADATA_KEY]: theme.id },
    type: definition.id,
    values,
    artifacts,
    version: DEMO_VERSION,
    enabled: true
  });
  if (!parsed.success) return { ok: false, reason: parsed.error.issues[0]?.message ?? "Generated record is invalid" };

  const issues = validateCapabilityAgainstType(definition, parsed.data);
  if (issues.length > 0) return { ok: false, reason: issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ") };
  return { ok: true, record: parsed.data, files };
}

function demoArtifactFiles(
  definition: CapabilityTypeDefinition,
  artifact: CapabilityArtifactDefinition,
  identity: DemoIdentity
): CapabilityArtifactFile[] {
  const paths = new Set(artifact.requiredFiles);
  const referencedSources = definition.implementations.flatMap((implementation) => implementation.operations.flatMap((operation) => {
    if (operation.type !== "copyFiles" || operation.details.from.artifact !== artifact.key || operation.details.from.path === ".") return [];
    return [operation.details.from.path];
  }));
  for (const source of referencedSources) paths.add(sourceFilePath(source, artifact));

  const minimum = Math.max(artifact.required ? 1 : 0, artifact.minFiles ?? 0);
  while (paths.size < minimum) paths.add(defaultArtifactPath(definition, artifact, paths.size + 1));
  if (paths.size === 0) paths.add(defaultArtifactPath(definition, artifact, 1));

  return [...paths].map((path) => {
    const bytes = new TextEncoder().encode(demoFileContent(path, identity));
    return {
      slot: artifact.key,
      path,
      mediaType: artifactMediaType(path),
      size: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes
    };
  });
}

function demoValue(definition: CapabilityValueDefinition, identity: DemoIdentity): unknown {
  const scalar = demoScalar(definition, identity);
  if (definition.type === "string") return scalar;
  if (definition.type === "list") return definition.key.toLowerCase().includes("arg") ? ["-y", "@bindery/demo-mcp"] : [scalar];
  if (definition.key.toLowerCase().includes("header")) return { "X-Bindery-Demo": "true" };
  if (definition.key.toLowerCase().includes("env")) return { BINDERY_DEMO: "true" };
  return { example: scalar };
}

function demoScalar(definition: CapabilityValueDefinition, identity: DemoIdentity): string {
  if (definition.validateAs === "httpUrl") return `https://example.com/${identity.id}`;
  if (definition.validateAs === "fqdn") return "demo.example.com";
  if (definition.validateAs === "semver") return DEMO_VERSION;
  if (definition.validateAs === "pathSegment") return identity.id;

  const key = definition.key.toLowerCase();
  if (key.includes("url") || key.includes("endpoint")) return `https://example.com/${identity.id}`;
  if (key.includes("command")) return "npx";
  if (key === "name" || key.includes("slug") || key.endsWith("id") || key.includes("key")) return identity.id;
  if (key.includes("version")) return DEMO_VERSION;
  if (key.includes("description")) return identity.description ?? `Demo ${identity.name}`;
  return definition.multiline ? `Demo value for ${definition.label}.\nThis content is for the hackathon walkthrough.` : `Demo ${definition.label}`;
}

function sourceFilePath(source: string, artifact: CapabilityArtifactDefinition): string {
  if (looksLikeFile(source, artifact.allowedExtensions)) return source;
  return `${source}/${defaultArtifactFilename(artifact, 1)}`;
}

function defaultArtifactPath(definition: CapabilityTypeDefinition, artifact: CapabilityArtifactDefinition, index: number): string {
  if (definition.id === "agentskills/skill" && index === 1) return "SKILL.md";
  return defaultArtifactFilename(artifact, index);
}

function defaultArtifactFilename(artifact: CapabilityArtifactDefinition, index: number): string {
  const extension = artifact.allowedExtensions[0] ?? ".md";
  const stem = artifact.key.toLowerCase().includes("rule") ? "example-rule" : artifact.key.toLowerCase().includes("agent") ? "example-agent" : "demo-content";
  return `${stem}${index === 1 ? "" : `-${index}`}${extension}`;
}

function looksLikeFile(path: string, allowedExtensions: string[]): boolean {
  const extension = extname(path).toLowerCase();
  return Boolean(extension) && (allowedExtensions.length === 0 || allowedExtensions.includes(extension));
}

function demoFileContent(path: string, identity: DemoIdentity): string {
  const extension = extname(path).toLowerCase();
  if (path.endsWith("SKILL.md")) {
    return `---\nname: ${identity.id}\ndescription: ${identity.description ?? `Demo ${identity.name}`}\n---\n\n# ${identity.name}\n\nThis is demo content for the Bindery hackathon walkthrough.\n`;
  }
  if (extension === ".mdc") {
    return `---\ndescription: ${identity.description ?? `Demo ${identity.name}`}\nglobs: ["**/*"]\nalwaysApply: false\n---\n\n# ${identity.name}\n\nFollow the project guidance described by this example rule.\n`;
  }
  if (extension === ".json") return `${JSON.stringify({ name: identity.id, demo: true }, null, 2)}\n`;
  if (extension === ".yaml" || extension === ".yml") return `name: ${identity.id}\ndemo: true\n`;
  if (extension === ".toml") return `name = "${identity.id}"\ndemo = true\n`;
  if (extension === ".py") return `"""Demo content for ${identity.name}."""\n`;
  if (extension === ".sh") return `#!/usr/bin/env sh\necho "Demo content for ${identity.name}"\n`;
  return `# ${identity.name}\n\n${identity.description ?? "Demo capability content."}\n`;
}

function demoExamples(definition: CapabilityTypeDefinition): DemoExample[] {
  const typeSlug = definition.id.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return DEMO_THEMES.map((theme) => ({
    theme,
    identity: {
      id: demoCapabilityId(definition.id, typeSlug, theme.id),
      name: demoCapabilityName(definition, theme),
      description: demoCapabilityDescription(definition, theme),
      tags: ["demo", theme.id, typeSlug]
    }
  }));
}

function demoCapabilityId(type: string, typeSlug: string, theme: DemoTheme["id"]): string {
  if (type === "agentskills/skill") return `demo-${theme}-skill`;
  if (type === "mcp/remote-server") return `demo-${theme}-remote-mcp`;
  if (type === "mcp/stdio-server") return `demo-${theme}-local-mcp`;
  return `demo-${theme}-${typeSlug}`;
}

function demoCapabilityName(definition: CapabilityTypeDefinition, theme: DemoTheme): string {
  if (definition.id === "agentskills/skill") return `${theme.label} Skill`;
  if (definition.id === "mcp/remote-server") return `${theme.label} MCP`;
  if (definition.id === "mcp/stdio-server") return `Local ${theme.label} MCP`;
  return `${theme.label} ${definition.label}`;
}

function demoCapabilityDescription(definition: CapabilityTypeDefinition, theme: DemoTheme): string {
  const subject = theme.label.toLowerCase();
  if (definition.id === "agentskills/skill") return `Instructions and examples for ${subject} tasks.`;
  if (definition.id === "mcp/remote-server") return `A mock remote MCP server for ${subject} tools.`;
  if (definition.id === "mcp/stdio-server") return `A mock local MCP server for ${subject} tools.`;
  return `Example ${definition.label.toLowerCase()} for ${subject} workflows.`;
}

function demoCollectionExamples(): DemoExample[] {
  return DEMO_THEMES.map((theme) => ({
    theme,
    identity: {
      id: `demo-${theme.id}-toolkit`,
      name: `${theme.label} Toolkit`,
      description: `A demo collection of capabilities for ${theme.label.toLowerCase()} workflows.`,
      tags: ["demo", theme.id, "collection"]
    }
  }));
}

function demoPriority(type: string): number {
  if (type === "agentskills/skill") return 0;
  if (type === "mcp/remote-server") return 1;
  if (type === "mcp/stdio-server") return 2;
  if (type.includes("rule")) return 3;
  return 10;
}

function isDemoCapability(capability: CapabilityRecord): boolean {
  return capability.metadata?.[DEMO_METADATA_KEY] === "true";
}

function printSeedResult(result: DemoSeedResult): void {
  console.log("Bindery demo data");
  for (const item of result.created) console.log(`+ ${item.name} (${item.type})`);
  for (const item of result.existing) console.log(`= ${item.name} already exists`);
  for (const item of result.skipped) console.log(`! ${item.type}: ${item.reason}`);
  console.log(`\nCreated ${result.created.length}; existing ${result.existing.length}; skipped ${result.skipped.length}.`);
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? "seed";
  if (command === "seed") {
    printSeedResult(await seedDemoData());
    return;
  }
  if (command === "clear") {
    const removed = await clearDemoData();
    console.log(removed.length ? `Removed demo data:\n${removed.map((id) => `- ${id}`).join("\n")}` : "No demo data found.");
    return;
  }
  throw new Error("Usage: tsx scripts/demo-data.ts [seed|clear]");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
