import { readFile, writeFile } from "node:fs/promises";

const username = "Hikari-Tsai";
const readmePath = process.env.LEETCODE_README_PATH ?? "README.md";
const startMarker = "<!-- LEETCODE_BADGES_START -->";
const endMarker = "<!-- LEETCODE_BADGES_END -->";
const featuredColumns = 4;

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
const hiddenBadges = sortedBadges.filter((badge) => !featuredIds.has(badge.id));
const section = renderFeaturedGrid(featuredBadges, hiddenBadges);

function renderBadgeImage(badge) {
  const name = escapeHtml(badge.displayName);
  const icon = escapeHtml(new URL(badge.icon, "https://leetcode.com").href);
  return `  <a href="https://leetcode.com/u/${username}/"><img src="${icon}" alt="${name}" title="${name}" width="90"></a>`;
}

function renderFeaturedGrid(featuredBadges, hiddenBadges) {
  const rows = [];
  for (let index = 0; index < featuredBadges.length; index += featuredColumns) {
    const cells = featuredBadges.slice(index, index + featuredColumns).map((badge) => {
      const name = escapeHtml(badge.displayName);
      return `    <td align="center" valign="top" width="140">\n${renderBadgeImage(badge)}<br>\n      <sub><strong>${name}</strong></sub>\n    </td>`;
    });
    rows.push(`  <tr>\n${cells.join("\n")}\n  </tr>`);
  }

  if (hiddenBadges.length > 0) {
    const badgeLabel = hiddenBadges.length === 1 ? "badge" : "badges";
    rows.push([
      "  <tr>",
      `    <td align="right" colspan="${featuredColumns}">`,
      "<details>",
      `<summary align="right"><strong>Show ${hiddenBadges.length} more ${badgeLabel}</strong></summary>`,
      "<br>",
      '<p align="center">',
      hiddenBadges.map(renderBadgeImage).join("\n"),
      "</p>",
      "</details>",
      "    </td>",
      "  </tr>",
    ].join("\n"));
  }

  return `<table align="center">\n${rows.join("\n")}\n</table>`;
}

const readme = await readFile(readmePath, "utf8");
const markerPattern = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
if (!markerPattern.test(readme)) {
  throw new Error("README is missing the LeetCode badge markers");
}

const updatedReadme = readme.replace(markerPattern, `${startMarker}\n${section}\n${endMarker}`);
await writeFile(readmePath, updatedReadme);
console.log(`Updated README with ${sortedBadges.length} LeetCode badges`);

function selectFeaturedBadges(allBadges) {
  return allBadges
    .map((badge) => ({ badge, rank: featuredBadgeRank(badge.displayName) }))
    .filter(({ rank }) => rank > 0)
    .sort((left, right) => right.rank - left.rank || right.badge.creationDate.localeCompare(left.badge.creationDate))
    .map(({ badge }) => badge);
}

function featuredBadgeRank(name) {
  if (name === "500 Days Badge") return 10000;

  const romanMatch = name.match(/\b([IVXLCDM]+)$/);
  const romanLevel = romanMatch ? romanToNumber(romanMatch[1]) : 0;
  if (romanLevel >= 2) return 9000 + romanLevel;

  const levelMatch = name.match(/^Level (\d+)$/);
  const numericLevel = Number(levelMatch?.[1]);
  if (numericLevel >= 2) return 8000 + numericLevel;

  if (name === "LeetCode 75") return 7000;
  if (name === "Graph Theory I") return 6000;
  return 0;
}

function romanToNumber(roman) {
  const values = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  return [...roman].reduce((total, character, index, characters) => {
    const value = values[character];
    return total + (value < (values[characters[index + 1]] ?? 0) ? -value : value);
  }, 0);
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
