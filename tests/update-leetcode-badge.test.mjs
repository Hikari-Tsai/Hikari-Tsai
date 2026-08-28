import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("features advanced algorithm badges with visible titles and hides routine badges", () => {
  const directory = mkdtempSync(join(tmpdir(), "leetcode-badge-"));
  const readme = join(directory, "README.md");
  writeFileSync(readme, "# Profile\n\n<!-- LEETCODE_BADGES_START -->\nold\n<!-- LEETCODE_BADGES_END -->\n");
  const response = {
    data: {
      matchedUser: {
        badges: [
          { id: "1", displayName: "May LeetCoding Challenge", icon: "/monthly.png", creationDate: "2025-05-31" },
          { id: "2", displayName: "100 Days Badge 2025", icon: "/100-2025.png", creationDate: "2025-05-01" },
          { id: "3", displayName: "500 Days Badge", icon: "/500.png", creationDate: "2025-04-01" },
          { id: "4", displayName: "365 Days Badge", icon: "/365.png", creationDate: "2025-03-01" },
          { id: "5", displayName: "Annual Badge 2024", icon: "/annual.png", creationDate: "2025-02-01" },
          { id: "6", displayName: "200 Days Badge 2024", icon: "/200.png", creationDate: "2024-10-01" },
          { id: "7", displayName: "100 Days Badge 2024", icon: "/100-2024.png", creationDate: "2024-05-01" },
          { id: "8", displayName: "LeetCode 75", icon: "/leetcode-75.png", creationDate: "2024-04-01" },
          { id: "9", displayName: "Dynamic Programming II", icon: "/dp-2.png", creationDate: "2023-04-01" },
          { id: "10", displayName: "Algorithm II", icon: "/algorithm-2.png", creationDate: "2023-03-01" },
          { id: "11", displayName: "Data Structure II", icon: "/data-structure-2.png", creationDate: "2023-02-01" },
          { id: "12", displayName: "Programming Skills II", icon: "/programming-skills-2.png", creationDate: "2023-01-01" },
          { id: "13", displayName: "Graph Theory I", icon: "/graph-1.png", creationDate: "2022-12-01" },
          { id: "14", displayName: "Level 3", icon: "/level-3.png", creationDate: "2022-11-01" },
          { id: "15", displayName: "Algorithm III", icon: "/algorithm-3.png", creationDate: "2026-01-01" },
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
  const detailsStart = output.indexOf("<details>");
  assert.match(output, /<summary align="right"><strong>Show 6 more badges<\/strong><\/summary>/);
  assert.equal((output.slice(0, detailsStart).match(/width="90"/g) ?? []).length, 9);
  assert.equal((output.slice(detailsStart).match(/width="90"/g) ?? []).length, 6);
  for (const name of ["500 Days Badge", "LeetCode 75", "Dynamic Programming II", "Algorithm II", "Data Structure II", "Programming Skills II", "Graph Theory I", "Level 3", "Algorithm III"]) {
    assert.ok(output.indexOf(name) < detailsStart, `${name} should be featured`);
    assert.match(output.slice(0, detailsStart), new RegExp(`<sub><strong>${name}<\\/strong><\\/sub>`));
  }
  assert.ok(output.indexOf("May LeetCoding Challenge") > detailsStart);
  assert.ok(output.indexOf("100 Days Badge 2024") > detailsStart);
  assert.ok(output.indexOf("365 Days Badge") > detailsStart);
  assert.doesNotMatch(output, /\nold\n/);
});
