import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import test from "node:test";

test("updates stats and six meaningful activities while preserving achievements", () => {
  const directory = mkdtempSync(join(tmpdir(), "github-activity-"));
  const readme = join(directory, "README.md");
  writeFileSync(readme, `# Profile

<!-- GITHUB_RECENT_ACTIVITY_START -->
old activity
<!-- GITHUB_RECENT_ACTIVITY_END -->

<!-- GITHUB_RECENT_UPDATED_AT_START -->
old recent timestamp
<!-- GITHUB_RECENT_UPDATED_AT_END -->

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
    { id: "11", type: "PushEvent", created_at: "2026-08-29T12:00:00Z", repo: { name: "Hikari-Tsai/app" }, payload: { commits: [{}] } },
    { id: "12", type: "PushEvent", created_at: "2026-08-28T12:00:00Z", repo: { name: "Hikari-Tsai/app" }, payload: { commits: [{}] } },
    { id: "13", type: "PushEvent", created_at: "2026-08-27T12:00:00Z", repo: { name: "Hikari-Tsai/app" }, payload: { commits: [{}] } },
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
  assert.doesNotMatch(output, /old activity|old recent timestamp|old timestamp/);
  assert.match(output, /Public repositories    26/);
  assert.match(output, /Last-year activity     300 contributions/);
  assert.match(output, /Merged pull requests   42 public PRs/);
  assert.match(output, /Current achievements   Keep This Sentinel/);
  assert.match(output, /Highlight              Keep This Highlight/);
  assert.ok(output.includes("Merged [Hikari-Tsai/tool#12](https://github.com/Hikari-Tsai/tool/pull/12): Improve \\[parser\\]."));
  assert.match(output, /Pushed 3 commits to \[Hikari-Tsai\/app\]/);
  assert.match(output, /Created \[Hikari-Tsai\/new-repo\]/);
  assert.match(output, /Published \[v1\.0\.0\].*in \[Hikari-Tsai\/lib\]/);
  assert.doesNotMatch(output, /Hikari-Tsai\/Hikari-Tsai/);
  assert.doesNotMatch(output, /Hikari-Tsai\/three/);
  assert.equal((output.match(/^- \*\*2026-/gm) ?? []).length, 6);
  assert.equal((output.match(/\[Hikari-Tsai\/app\]/g) ?? []).length, 2);
  assert.equal((output.match(/<p align="right"><sub>Last updated: 2026-08-31 09:30 \(UTC\+8\)<\/sub><\/p>/g) ?? []).length, 2);
  assert.ok(output.indexOf("GITHUB_RECENT_UPDATED_AT_START") < output.indexOf("GITHUB_STATS_START"));
});

test("summarizes a push diff with the configured OpenAI model", async (context) => {
  const directory = mkdtempSync(join(tmpdir(), "github-activity-llm-"));
  const readme = join(directory, "README.md");
  writeFileSync(readme, `# Profile

<!-- GITHUB_RECENT_ACTIVITY_START -->
old
<!-- GITHUB_RECENT_ACTIVITY_END -->
<!-- GITHUB_RECENT_UPDATED_AT_START -->
old recent timestamp
<!-- GITHUB_RECENT_UPDATED_AT_END -->
<!-- GITHUB_STATS_START -->
\`\`\`text
Current achievements   Keep This Sentinel
Highlight              Keep This Highlight
\`\`\`
<!-- GITHUB_STATS_END -->
<!-- GITHUB_UPDATED_AT_START -->
old
<!-- GITHUB_UPDATED_AT_END -->
`);

  const responseRequests = [];
  const server = createServer(async (request, response) => {
    if (request.url?.startsWith("/repos/Hikari-Tsai/") && request.url.includes("/compare/")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ files: Array.from({ length: 20 }, (_, index) => ({ filename: index === 0 ? "src/filter.ts" : `src/file-${index}.ts`, status: "modified", additions: 12, deletions: 3, patch: index === 0 ? "@@ -1 +1 @@\n-old filter\n+add salary range filter" : "x".repeat(1500) })) }));
      return;
    }
    if (request.url === "/v1/responses" && request.method === "POST") {
      let body = "";
      for await (const chunk of request) body += chunk;
      const responseRequest = JSON.parse(body);
      responseRequests.push(responseRequest);
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(responseRequest.max_output_tokens < 500
        ? { status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output: [] }
        : { status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "Added salary-range filtering and updated related tests." }] }] }));
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => server.close());
  const { port } = server.address();
  const data = {
    publicRepos: 26,
    totalContributions: 300,
    mergedPullRequests: 42,
    events: ["app", "repo-2", "repo-3", "repo-4", "repo-5", "repo-6", "repo-7"].map((repo, index) => ({
      id: `push-${index + 1}`,
      type: "PushEvent",
      created_at: `2026-08-${30 - index}T10:00:00Z`,
      repo: { name: `Hikari-Tsai/${repo}` },
      payload: { before: `before-${index}`, head: `head-${index}` },
    })),
  };
  const result = await new Promise((resolve) => {
    const child = spawn(process.execPath, ["scripts/update-github-activity.mjs"], {
      cwd: new URL("..", import.meta.url),
      env: {
        ...process.env,
        GITHUB_ACTIVITY_DATA_JSON: JSON.stringify(data),
        GITHUB_ACTIVITY_README_PATH: readme,
        GITHUB_ACTIVITY_NOW: "2026-08-31T01:30:00.000Z",
        GITHUB_API_URL: `http://127.0.0.1:${port}`,
        OPENAI_BASE_URL: `http://127.0.0.1:${port}/v1`,
        OPENAI_API_KEY: "test-key",
        OPENAI_MODEL: "test-model",
      },
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => stderr += chunk);
    child.on("close", (status) => resolve({ status, stderr }));
  });

  assert.equal(result.status, 0, result.stderr);
  const output = readFileSync(readme, "utf8");
  assert.match(output, /Updated \[Hikari-Tsai\/app\].*Added salary-range filtering and updated related tests\./);
  assert.equal(responseRequests.length, 6);
  const [responseRequest] = responseRequests;
  assert.equal(responseRequest.model, "test-model");
  assert.equal(responseRequest.store, false);
  assert.equal(responseRequest.max_output_tokens, 500);
  assert.ok(responseRequest.input.length > 20_000, "diff input should exceed the former 12,000-character limit");
  assert.match(JSON.stringify(responseRequest.input), /src\/filter\.ts/);
  assert.doesNotMatch(JSON.stringify(responseRequest.input), /test-key/);
});
