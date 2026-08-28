import { readFile, writeFile } from "node:fs/promises";

const username = "Hikari-Tsai";
const readmePath = process.env.LEETCODE_README_PATH ?? "README.md";
const startMarker = "<!-- LEETCODE_BADGES_START -->";
const endMarker = "<!-- LEETCODE_BADGES_END -->";

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
const badgeImages = sortedBadges.map((badge) => {
  const name = escapeHtml(badge.displayName);
  const icon = escapeHtml(new URL(badge.icon, "https://leetcode.com").href);
  return `  <a href="https://leetcode.com/u/${username}/"><img src="${icon}" alt="${name}" title="${name}" width="90"></a>`;
}).join("\n");
const section = [
  "<details>",
  `<summary><strong>View all ${sortedBadges.length} LeetCode badges</strong></summary>`,
  "<br>",
  '<p align="center">',
  badgeImages,
  "</p>",
  "</details>",
].join("\n");

const readme = await readFile(readmePath, "utf8");
const markerPattern = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
if (!markerPattern.test(readme)) {
  throw new Error("README is missing the LeetCode badge markers");
}

const updatedReadme = readme.replace(markerPattern, `${startMarker}\n${section}\n${endMarker}`);
await writeFile(readmePath, updatedReadme);
console.log(`Updated README with ${sortedBadges.length} LeetCode badges`);

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
