import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const cardUrl = process.env.LEETCODE_CARD_URL ??
  "https://leetcard.jacoblin.cool/Hikari-Tsai?theme=dark&font=Inter&ext=heatmap";
const output = process.env.LEETCODE_BADGE_OUTPUT ?? "assets/leetcode-badge.json";

const response = await fetch(cardUrl);
if (!response.ok) {
  throw new Error(`LeetCode card request failed with HTTP ${response.status}`);
}

const svg = await response.text();
const match = svg.match(/<text[^>]*id="total-solved-text"[^>]*>([\d,]+)<\/text>/);
if (!match) {
  throw new Error("Could not find the total solved count in the LeetCode card");
}

const solved = Number.parseInt(match[1].replaceAll(",", ""), 10);
const badge = {
  schemaVersion: 1,
  label: "LeetCode Solved",
  message: solved.toLocaleString("en-US"),
  color: "FFA116",
  namedLogo: "leetcode",
  logoColor: "white",
};

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(badge, null, 2)}\n`);
console.log(`Updated LeetCode badge: ${badge.message} solved`);
