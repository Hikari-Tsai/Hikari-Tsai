import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

test("introduces audio plugin development in English", () => {
  assert.match(readme, /Senior Generative AI R&amp;D Engineer · Audio Plugin Developer · Independent Musician/);
  assert.match(readme, /VST3, AUv2, and AAX/);
  assert.match(readme, /audio plugins/i);
});

test("features current AI, automation, and audio projects without removing existing work", () => {
  for (const project of [
    "music-detection",
    "auto-mr",
    "dc-bot",
    "software-salary",
    "twitch-bot",
    "dc-manager",
    "Humanizer-zh-TW",
    "JS_Inflator",
    "Private RAG / Agent Systems",
    "Web PINN Demo",
  ]) {
    assert.match(readme, new RegExp(project.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
