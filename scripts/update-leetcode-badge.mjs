import { readFile, writeFile } from "node:fs/promises";

const username = "Hikari-Tsai";
const readmePath = process.env.LEETCODE_README_PATH ?? "README.md";
const startMarker = "<!-- LEETCODE_BADGES_START -->";
const endMarker = "<!-- LEETCODE_BADGES_END -->";
const visibleBadgeCount = 8;
const studyPlanPriority = [
  "LeetCode 75",
  "Dynamic Programming II",
  "Algorithm II",
  "Graph Theory I",
  "Data Structure II",
  "Programming Skills II",
];

const payload = process.env.LEETCODE_BADGES_JSON
  ? JSON.parse(process.env.LEETCODE_BADGES_JSON)
  : await fetchBadges();
const badges = payload?.data?.matchedUser?.badges;

if (!Array.isArray(badges)) {
  throw new Error("LeetCode response did not include a badges array");
}

const sortedBadges = [...badges].sort((left, right) =>
  right.creationDate.localeCompare(left.creationDate),
);
const featuredBadges = selectFeaturedBadges(sortedBadges);
const featuredIds = new Set(featuredBadges.map((badge) => badge.id));
const orderedBadges = [
  ...featuredBadges,
  ...sortedBadges.filter((badge) => !featuredIds.has(badge.id)),
];
const badgeImages = orderedBadges.map((badge) => {
  const name = escapeHtml(badge.displayName);
  const icon = escapeHtml(new URL(badge.icon, "https://leetcode.com").href);
  return `  <a href="https://leetcode.com/u/${username}/"><img src="${icon}" alt="${name}" title="${name}" width="90"></a>`;
});
const visibleBadges = badgeImages.slice(0, visibleBadgeCount);
const hiddenBadges = badgeImages.slice(visibleBadgeCount);
const sectionLines = [
  '<p align="center">',
  visibleBadges.join("\n"),
  "</p>",
];

if (hiddenBadges.length > 0) {
  const badgeLabel = hiddenBadges.length === 1 ? "badge" : "badges";
  sectionLines.push(
    "<details>",
    `<summary align="right"><strong>Show ${hiddenBadges.length} more ${badgeLabel} ▾</strong></summary>`,
    "<br>",
    '<p align="center">',
    hiddenBadges.join("\n"),
    "</p>",
    "</details>",
  );
}

const section = sectionLines.join("\n");

const readme = await readFile(readmePath, "utf8");
const markerPattern = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
if (!markerPattern.test(readme)) {
  throw new Error("README is missing the LeetCode badge markers");
}

const updatedReadme = readme.replace(markerPattern, `${startMarker}\n${section}\n${endMarker}`);
await writeFile(readmePath, updatedReadme);
console.log(`Updated README with ${sortedBadges.length} LeetCode badges`);

function selectFeaturedBadges(allBadges) {
  const milestones = new Map();
  for (const badge of allBadges) {
    const match = badge.displayName.match(/^(\d+) Days Badge/);
    const days = Number(match?.[1]);
    if (days >= 100 && !milestones.has(days)) milestones.set(days, badge);
  }

  const milestoneEntries = [...milestones.entries()].sort(([left], [right]) => right - left);
  const highMilestones = milestoneEntries.filter(([days]) => days >= 365).map(([, badge]) => badge);
  const lowerMilestones = milestoneEntries.filter(([days]) => days < 365).map(([, badge]) => badge);
  const annualBadge = allBadges.find((badge) => badge.displayName.startsWith("Annual Badge"));
  const studyPlans = studyPlanPriority
    .map((name) => allBadges.find((badge) => badge.displayName === name))
    .filter(Boolean);

  return [...highMilestones, annualBadge, ...lowerMilestones, ...studyPlans]
    .filter(Boolean)
    .slice(0, visibleBadgeCount);
}

async function fetchBadges() {
  const response = await fetch("https://leetcode.com/graphql/", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      referer: `https://leetcode.com/u/${username}/`,
    },
    body: JSON.stringify({
      query: "query userBadges($username: String!) { matchedUser(username: $username) { badges { id displayName icon creationDate } } }",
      variables: { username },
    }),
  });

  if (!response.ok) {
    throw new Error(`LeetCode request failed with HTTP ${response.status}`);
  }
  return response.json();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
