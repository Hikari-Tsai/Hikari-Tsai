import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

function updateReadme(badges) {
  const directory = mkdtempSync(join(tmpdir(), "leetcode-badge-"));
  const readme = join(directory, "README.md");
  writeFileSync(readme, "# Profile\n\n<!-- LEETCODE_BADGES_START -->\nold\n<!-- LEETCODE_BADGES_END -->\n");
  const payload = { data: { matchedUser: { badges } } };
  const result = spawnSync(process.execPath, ["scripts/update-leetcode-badge.mjs"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    env: {
      ...process.env,
      LEETCODE_BADGES_JSON: JSON.stringify(payload),
      LEETCODE_README_PATH: readme,
    },
  });

  assert.equal(result.status, 0, result.stderr);
  return readFileSync(readme, "utf8");
}

test("features Guardian first, keeps Knight hidden, and preserves advanced badge rules", () => {
  const output = updateReadme([
    { id: "17", displayName: "Guardian", icon: "/guardian.png", creationDate: "2026-03-01" },
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
    { id: "16", displayName: "Knight", icon: "/knight.png", creationDate: "2026-02-01" },
  ]);
  const detailsStart = output.indexOf("<details>");
  const tableEnd = output.indexOf("</table>", detailsStart);

  assert.match(output, /<td align="right" colspan="4">\n<details>/);
  assert.ok(detailsStart < tableEnd, "More should be inside the featured badge table");
  assert.match(output, /<summary align="right"><strong>Show 8 more badges<\/strong><\/summary>/);
  assert.equal((output.slice(0, detailsStart).match(/width="90"/g) ?? []).length, 9);
  assert.equal((output.slice(detailsStart).match(/width="90"/g) ?? []).length, 8);
  assert.match(output.slice(0, detailsStart), /alt="Guardian"[\s\S]*alt="500 Days Badge"/);
  for (const name of ["Guardian", "500 Days Badge", "LeetCode 75", "Dynamic Programming II", "Algorithm II", "Data Structure II", "Programming Skills II", "Graph Theory I", "Algorithm III"]) {
    assert.ok(output.indexOf(name) < detailsStart, `${name} should be featured`);
    assert.match(output.slice(0, detailsStart), new RegExp(`<sub><strong>${name}<\\/strong><\\/sub>`));
  }
  assert.ok(output.indexOf("Knight") > detailsStart);
  assert.ok(output.indexOf("May LeetCoding Challenge") > detailsStart);
  assert.ok(output.indexOf("Level 3") > detailsStart);
  assert.doesNotMatch(output, /\nold\n/);
});

test("falls back to Knight as the first featured badge when Guardian is absent", () => {
  const output = updateReadme([
    { id: "1", displayName: "Routine 1", icon: "/1.png", creationDate: "2026-08-01" },
    { id: "2", displayName: "Knight", icon: "/knight.png", creationDate: "2026-07-01" },
    { id: "3", displayName: "500 Days Badge", icon: "/500.png", creationDate: "2026-06-01" },
    { id: "4", displayName: "Routine 2", icon: "/2.png", creationDate: "2026-05-01" },
    { id: "5", displayName: "Routine 3", icon: "/3.png", creationDate: "2026-04-01" },
    { id: "6", displayName: "Routine 4", icon: "/4.png", creationDate: "2026-03-01" },
    { id: "7", displayName: "Routine 5", icon: "/5.png", creationDate: "2026-02-01" },
    { id: "8", displayName: "Routine 6", icon: "/6.png", creationDate: "2026-01-01" },
  ]);

  assert.match(output, /LEETCODE_BADGES_START[\s\S]*?alt="Knight"[\s\S]*?alt="500 Days Badge"/);
  assert.equal((output.match(/width="90"/g) ?? []).length, 8);
  assert.doesNotMatch(output, /<details>/);
});

test("fills the featured grid to eight badges with the newest routine badges", () => {
  const output = updateReadme([
    { id: "1", displayName: "500 Days Badge", icon: "/500.png", creationDate: "2025-01-01" },
    { id: "2", displayName: "Routine 9", icon: "/9.png", creationDate: "2026-09-01" },
    { id: "3", displayName: "Routine 8", icon: "/8.png", creationDate: "2026-08-01" },
    { id: "4", displayName: "Routine 7", icon: "/7.png", creationDate: "2026-07-01" },
    { id: "5", displayName: "Routine 6", icon: "/6.png", creationDate: "2026-06-01" },
    { id: "6", displayName: "Routine 5", icon: "/5.png", creationDate: "2026-05-01" },
    { id: "7", displayName: "Routine 4", icon: "/4.png", creationDate: "2026-04-01" },
    { id: "8", displayName: "Routine 3", icon: "/3.png", creationDate: "2026-03-01" },
    { id: "9", displayName: "Routine 2", icon: "/2.png", creationDate: "2026-02-01" },
    { id: "10", displayName: "Routine 1", icon: "/1.png", creationDate: "2026-01-01" },
  ]);
  const detailsStart = output.indexOf("<details>");

  assert.equal((output.slice(0, detailsStart).match(/width="90"/g) ?? []).length, 8);
  assert.match(output.slice(0, detailsStart), /alt="500 Days Badge"[\s\S]*alt="Routine 9"/);
  assert.ok(output.indexOf("Routine 3") < detailsStart);
  assert.ok(output.indexOf("Routine 2") > detailsStart);
  assert.ok(output.indexOf("Routine 1") > detailsStart);
  assert.match(output, /Show 2 more badges/);
});
