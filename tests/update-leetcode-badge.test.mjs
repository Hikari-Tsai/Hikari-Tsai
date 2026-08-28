import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("updates the README with every LeetCode badge in newest-first order", () => {
  const directory = mkdtempSync(join(tmpdir(), "leetcode-badge-"));
  const readme = join(directory, "README.md");
  writeFileSync(readme, "# Profile\n\n<!-- LEETCODE_BADGES_START -->\nold\n<!-- LEETCODE_BADGES_END -->\n");
  const response = {
    data: {
      matchedUser: {
        badges: [
          { id: "1", displayName: "Older Badge", icon: "/static/older.png", creationDate: "2024-01-01" },
          { id: "2", displayName: "Newer Badge", icon: "https://assets.leetcode.com/newer.png", creationDate: "2025-01-01" },
        ],
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
  assert.match(output, /View all 2 LeetCode badges/);
  assert.match(output, /https:\/\/leetcode\.com\/static\/older\.png/);
  assert.match(output, /https:\/\/assets\.leetcode\.com\/newer\.png/);
  assert.ok(output.indexOf("Newer Badge") < output.indexOf("Older Badge"));
  assert.doesNotMatch(output, /\nold\n/);
});
