import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("creates a Shields badge payload from the live-card solved count", () => {
  const directory = mkdtempSync(join(tmpdir(), "leetcode-badge-"));
  const output = join(directory, "badge.json");
  const svg = '<svg><text id="total-solved-text">1,299</text></svg>';
  const result = spawnSync(process.execPath, ["scripts/update-leetcode-badge.mjs"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    env: {
      ...process.env,
      LEETCODE_BADGE_OUTPUT: output,
      LEETCODE_CARD_URL: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(readFileSync(output, "utf8")), {
    schemaVersion: 1,
    label: "LeetCode Solved",
    message: "1,299",
    color: "FFA116",
    namedLogo: "leetcode",
    logoColor: "white",
  });
});
