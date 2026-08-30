import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("updates stats and six meaningful activities while preserving achievements", () => {
  const directory = mkdtempSync(join(tmpdir(), "github-activity-"));
  const readme = join(directory, "README.md");
  writeFileSync(readme, `# Profile

<!-- GITHUB_RECENT_ACTIVITY_START -->
old activity
<!-- GITHUB_RECENT_ACTIVITY_END -->

<!-- GITHUB_STATS_START -->
\`\`\`text
Public repositories    1
Last-year activity     2 contributions
Merged pull requests   3 public PRs
Current achievements   Keep This Sentinel
Highlight              Keep This Highlight
\`\`\`
<!-- GITHUB_STATS_END -->

<!-- GITHUB_UPDATED_AT_START -->
old timestamp
<!-- GITHUB_UPDATED_AT_END -->
`);

  const events = [
    { id: "1", type: "PullRequestEvent", created_at: "2026-08-30T16:30:00Z", repo: { name: "Hikari-Tsai/tool" }, payload: { action: "closed", pull_request: { merged: true, number: 12, title: "Improve [parser]", html_url: "https://github.com/Hikari-Tsai/tool/pull/12" } } },
    { id: "2", type: "PushEvent", created_at: "2026-08-30T10:00:00Z", repo: { name: "Hikari-Tsai/app" }, payload: { commits: [{}, {}] } },
    { id: "3", type: "PushEvent", created_at: "2026-08-30T08:00:00Z", repo: { name: "Hikari-Tsai/app" }, payload: { commits: [{}] } },
    { id: "4", type: "CreateEvent", created_at: "2026-08-29T06:00:00Z", repo: { name: "Hikari-Tsai/new-repo" }, payload: { ref_type: "repository" } },
    { id: "5", type: "ReleaseEvent", created_at: "2026-08-28T06:00:00Z", repo: { name: "Hikari-Tsai/lib" }, payload: { action: "published", release: { tag_name: "v1.0.0", html_url: "https://github.com/Hikari-Tsai/lib/releases/tag/v1.0.0" } } },
    { id: "6", type: "PushEvent", created_at: "2026-08-27T06:00:00Z", repo: { name: "Hikari-Tsai/one" }, payload: { commits: [{}] } },
    { id: "7", type: "PushEvent", created_at: "2026-08-26T06:00:00Z", repo: { name: "Hikari-Tsai/two" }, payload: { before: "abc", head: "def" } },
    { id: "8", type: "PushEvent", created_at: "2026-08-25T06:00:00Z", repo: { name: "Hikari-Tsai/three" }, payload: { commits: [{}] } },
    { id: "9", type: "PushEvent", created_at: "2026-08-31T06:00:00Z", repo: { name: "Hikari-Tsai/Hikari-Tsai" }, payload: { commits: Array(9).fill({}) } },
    { id: "10", type: "WatchEvent", created_at: "2026-08-31T07:00:00Z", repo: { name: "someone/ignored" }, payload: {} },
  ];
  const result = spawnSync(process.execPath, ["scripts/update-github-activity.mjs"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_ACTIVITY_DATA_JSON: JSON.stringify({ publicRepos: 26, totalContributions: 300, mergedPullRequests: 42, events }),
      GITHUB_ACTIVITY_README_PATH: readme,
      GITHUB_ACTIVITY_NOW: "2026-08-31T01:30:00.000Z",
    },
  });

  assert.equal(result.status, 0, result.stderr);
  const output = readFileSync(readme, "utf8");
  assert.doesNotMatch(output, /old activity|old timestamp/);
  assert.match(output, /Public repositories    26/);
  assert.match(output, /Last-year activity     300 contributions/);
  assert.match(output, /Merged pull requests   42 public PRs/);
  assert.match(output, /Current achievements   Keep This Sentinel/);
  assert.match(output, /Highlight              Keep This Highlight/);
  assert.ok(output.includes("Merged [Hikari-Tsai/tool#12](https://github.com/Hikari-Tsai/tool/pull/12): Improve \\[parser\\]."));
  assert.match(output, /Pushed 3 commits to \[Hikari-Tsai\/app\]/);
  assert.match(output, /Pushed updates to \[Hikari-Tsai\/two\]/);
  assert.match(output, /Created \[Hikari-Tsai\/new-repo\]/);
  assert.match(output, /Published \[v1\.0\.0\].*in \[Hikari-Tsai\/lib\]/);
  assert.doesNotMatch(output, /Hikari-Tsai\/Hikari-Tsai/);
  assert.doesNotMatch(output, /Hikari-Tsai\/three/);
  assert.equal((output.match(/^- \*\*2026-/gm) ?? []).length, 6);
  assert.match(output, /<p align="right"><sub>Last updated: 2026-08-31 09:30 \(UTC\+8\)<\/sub><\/p>/);
});
