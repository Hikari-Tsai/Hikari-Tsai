import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("shows the newest eight badges and places the rest under More", () => {
  const directory = mkdtempSync(join(tmpdir(), "leetcode-badge-"));
  const readme = join(directory, "README.md");
  writeFileSync(readme, "# Profile\n\n<!-- LEETCODE_BADGES_START -->\nold\n<!-- LEETCODE_BADGES_END -->\n");
  const response = {
    data: {
      matchedUser: {
        badges: Array.from({ length: 9 }, (_, index) => ({
          id: String(index + 1),
          displayName: `Badge ${index + 1}`,
          icon: `/static/badge-${index + 1}.png`,
          creationDate: `2025-01-${String(index + 1).padStart(2, "0")}`,
        })),
      },
    },
  };
  const result = spawnSync(process.execPath, ["scripts/update-leetcode-badge.mjs"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    env: {
      ...process.env,
      LEETCODE_BADGES_JSON: JSON.stringify(response),
      LEETCODE_README_PATH: readme,
    },
  });

  assert.equal(result.status, 0, result.stderr);
  const output = readFileSync(readme, "utf8");
  const detailsStart = output.indexOf("<details>");
  assert.match(output, /<summary><strong>More \(1\)<\/strong><\/summary>/);
  assert.equal((output.slice(0, detailsStart).match(/width="90"/g) ?? []).length, 8);
  assert.equal((output.slice(detailsStart).match(/width="90"/g) ?? []).length, 1);
  assert.ok(output.indexOf("Badge 9") < output.indexOf("Badge 8"));
  assert.ok(output.indexOf("Badge 2") < detailsStart);
  assert.ok(output.indexOf("Badge 1") > detailsStart);
  assert.doesNotMatch(output, /\nold\n/);
});
