import { readFile, writeFile } from "node:fs/promises";

const USERNAME = "Hikari-Tsai";
const PROFILE_REPO = `${USERNAME}/${USERNAME}`;
const README_PATH = process.env.GITHUB_ACTIVITY_README_PATH ?? "README.md";
const API_HEADERS = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? ""}`,
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "profile-activity-updater",
};

function taipeiParts(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(value));
  return Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
}

function localDate(value) {
  const { year, month, day } = taipeiParts(value);
  return `${year}-${month}-${day}`;
}

function updatedAt(value) {
  const { year, month, day, hour, minute } = taipeiParts(value);
  return `<p align="right"><sub>Last updated: ${year}-${month}-${day} ${hour}:${minute} (UTC+8)</sub></p>`;
}

function markdownText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim().replace(/([\\[\]])/g, "\\$1");
}

function repoLink(name) {
  return `[${name}](https://github.com/${name})`;
}

function summarize(events) {
  const summaries = [];
  const pushes = new Map();
  for (const event of events) {
    const repo = event?.repo?.name;
    const timestamp = event?.created_at;
    if (!repo || !timestamp || repo.toLowerCase() === PROFILE_REPO.toLowerCase()) continue;
    const date = localDate(timestamp);
    if (event.type === "PushEvent") {
      const key = `${repo}|${date}`;
      const count = event.payload?.commits?.length ?? event.payload?.size ?? null;
      const existing = pushes.get(key);
      const combinedCount = existing && existing.count !== null && count !== null ? existing.count + count : (existing ? null : count);
      pushes.set(key, { repo, date, count: combinedCount, timestamp: existing?.timestamp > timestamp ? existing.timestamp : timestamp });
    } else if (event.type === "PullRequestEvent" && event.payload?.action === "closed" && event.payload?.pull_request?.merged) {
      const pr = event.payload.pull_request;
      summaries.push({ timestamp, text: `- **${date}** — Merged [${repo}#${pr.number}](${pr.html_url}): ${markdownText(pr.title)}.` });
    } else if (event.type === "CreateEvent" && event.payload?.ref_type === "repository") {
      summaries.push({ timestamp, text: `- **${date}** — Created ${repoLink(repo)}.` });
    } else if (event.type === "ReleaseEvent" && event.payload?.action === "published") {
      const release = event.payload.release;
      summaries.push({ timestamp, text: `- **${date}** — Published [${markdownText(release?.tag_name ?? "release")}](${release?.html_url}) in ${repoLink(repo)}.` });
    }
  }
  for (const push of pushes.values()) {
    const description = push.count === null ? "updates" : `${push.count} ${push.count === 1 ? "commit" : "commits"}`;
    summaries.push({ timestamp: push.timestamp, text: `- **${push.date}** — Pushed ${description} to ${repoLink(push.repo)}.` });
  }
  return summaries.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 6).map(({ text }) => text).join("\n") || "- No recent public activity found.";
}

async function getJson(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...API_HEADERS, ...options.headers } });
  if (!response.ok) throw new Error(`GitHub API request failed (${response.status}): ${url}`);
  const json = await response.json();
  if (json.errors?.length) throw new Error(`GitHub GraphQL request failed: ${json.errors.map((error) => error.message).join("; ")}`);
  return json;
}

async function fetchData(now) {
  if (!API_HEADERS.Authorization.replace("Bearer ", "")) throw new Error("GITHUB_TOKEN or GH_TOKEN is required");
  const to = now.toISOString();
  const fromDate = new Date(now);
  fromDate.setUTCFullYear(fromDate.getUTCFullYear() - 1);
  const query = `query($login:String!,$from:DateTime!,$to:DateTime!,$searchQuery:String!){user(login:$login){contributionsCollection(from:$from,to:$to){contributionCalendar{totalContributions}}}search(query:$searchQuery,type:ISSUE){issueCount}}`;
  const [user, graph, ...pages] = await Promise.all([
    getJson(`https://api.github.com/users/${USERNAME}`),
    getJson("https://api.github.com/graphql", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, variables: { login: USERNAME, from: fromDate.toISOString(), to, searchQuery: `author:${USERNAME} is:pr is:merged` } }) }),
    ...[1, 2, 3].map((page) => getJson(`https://api.github.com/users/${USERNAME}/events/public?per_page=100&page=${page}`)),
  ]);
  return {
    publicRepos: user.public_repos,
    totalContributions: graph.data?.user?.contributionsCollection?.contributionCalendar?.totalContributions,
    mergedPullRequests: graph.data?.search?.issueCount,
    events: pages.flat(),
  };
}

function replaceSection(readme, name, content) {
  const start = `<!-- ${name}_START -->`;
  const end = `<!-- ${name}_END -->`;
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
  if (!pattern.test(readme)) throw new Error(`Missing README markers: ${name}`);
  return readme.replace(pattern, `${start}\n${content}\n${end}`);
}

const now = new Date(process.env.GITHUB_ACTIVITY_NOW ?? Date.now());
if (Number.isNaN(now.valueOf())) throw new Error("GITHUB_ACTIVITY_NOW is invalid");
const data = process.env.GITHUB_ACTIVITY_DATA_JSON ? JSON.parse(process.env.GITHUB_ACTIVITY_DATA_JSON) : await fetchData(now);
for (const key of ["publicRepos", "totalContributions", "mergedPullRequests"]) {
  if (!Number.isInteger(data[key]) || data[key] < 0) throw new Error(`Invalid ${key}`);
}
if (!Array.isArray(data.events)) throw new Error("Invalid events");

let readme = await readFile(README_PATH, "utf8");
const statsSection = readme.match(/<!-- GITHUB_STATS_START -->([\s\S]*?)<!-- GITHUB_STATS_END -->/)?.[1] ?? "";
const achievements = statsSection.match(/^Current achievements\s+.*$/m)?.[0];
const highlight = statsSection.match(/^Highlight\s+.*$/m)?.[0];
if (!achievements || !highlight) throw new Error("Manual achievements or highlight line is missing");
const stats = `\`\`\`text\nPublic repositories    ${data.publicRepos}\nLast-year activity     ${data.totalContributions} contributions\nMerged pull requests   ${data.mergedPullRequests} public PRs\n${achievements}\n${highlight}\n\`\`\``;
readme = replaceSection(readme, "GITHUB_RECENT_ACTIVITY", summarize(data.events));
readme = replaceSection(readme, "GITHUB_STATS", stats);
readme = replaceSection(readme, "GITHUB_UPDATED_AT", updatedAt(now));
await writeFile(README_PATH, readme);
