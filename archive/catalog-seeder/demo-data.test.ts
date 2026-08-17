import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearDemoData, seedDemoData } from "../scripts/demo-data.js";
import { getCapabilityArtifactFile } from "../src/server/state.js";
import { listCapabilities, recordCapability } from "../src/server/capabilities.js";
import { seedTestCapabilityTypes } from "./fixtures/capability-types.js";

const originalCwd = process.cwd();
let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "bindery-demo-data-"));
  await mkdir(directory, { recursive: true });
  process.chdir(directory);
  seedTestCapabilityTypes();
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(directory, { recursive: true, force: true });
});

describe.sequential("hackathon demo data", () => {
  it("seeds three neutral examples per imported Type and three collections", async () => {
    const result = await seedDemoData();
    expect(result.created.map((item) => item.type)).toEqual(expect.arrayContaining([
      "agentskills/skill",
      "mcp/remote-server",
      "mcp/stdio-server",
      "cursor/rules",
      "native/collection"
    ]));
    for (const type of ["agentskills/skill", "mcp/remote-server", "mcp/stdio-server", "cursor/rules", "native/collection"]) {
      expect(result.created.filter((item) => item.type === type)).toHaveLength(3);
    }

    const capabilities = await listCapabilities();
    expect(capabilities.find((capability) => capability.id === "demo-documentation-toolkit")).toMatchObject({
      values: { members: expect.objectContaining({ "demo-documentation-skill": "1.0.0", "demo-documentation-remote-mcp": "1.0.0" }) }
    });
    expect(await getCapabilityArtifactFile("demo-documentation-skill", "1.0.0", "skill", "SKILL.md")).toBeDefined();
    expect(capabilities.some((capability) => /sre|incident|production/i.test(`${capability.id} ${capability.name} ${capability.description}`))).toBe(false);
  });

  it("is idempotent and clears only marked demo records", async () => {
    await recordCapability({
      id: "real-capability",
      name: "Real Capability",
      version: "1.0.0",
      type: "mcp/remote-server",
      values: { name: "real-capability", url: "https://example.com/mcp" },
      artifacts: {}
    });
    const first = await seedDemoData();
    const second = await seedDemoData();
    expect(first.created.length).toBeGreaterThan(0);
    expect(second.created).toEqual([]);

    const removed = await clearDemoData();
    expect(removed).toEqual(expect.arrayContaining(["demo-documentation-toolkit", "demo-testing-toolkit", "demo-code-review-toolkit"]));
    expect((await listCapabilities()).map((capability) => capability.id)).toEqual(["real-capability"]);
  });
});
