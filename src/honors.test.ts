import test from "node:test";
import assert from "node:assert/strict";
import { MISSIONS } from "./campaign";
import { baseHonors } from "./honors";

test("base honors reflect chapters, daily clears, mastery and stars without changing combat", () => {
  const campaign = Object.fromEntries(
    MISSIONS.slice(0, 6).map((mission) => [
      mission.id,
      { stars: 3, bestTime: 100 },
    ]),
  );
  const daily = Array.from({ length: 7 }, (_, index) => ({
    key: `2026-09-${String(index + 1).padStart(2, "0")}`,
    attempts: 1,
    completed: true,
    bestTime: 120,
    bestCore: 80,
    bestPoints: 6,
  }));
  const mastery = {
    units: { vanguard: 15, ranger: 15, medic: 15 },
    lastMatch: "x",
  };

  const honors = baseHonors(campaign, daily, mastery);
  assert.equal(honors.find((honor) => honor.id === "chapter-1")?.unlocked, true);
  assert.equal(honors.find((honor) => honor.id === "chapter-2")?.unlocked, false);
  assert.equal(honors.find((honor) => honor.id === "daily-7")?.unlocked, true);
  assert.equal(honors.find((honor) => honor.id === "gold-cadre")?.unlocked, true);
  assert.equal(honors.find((honor) => honor.id === "stars-48")?.unlocked, false);
});

test("base honors clamp visible progress to each goal", () => {
  const campaign = Object.fromEntries(
    MISSIONS.map((mission) => [mission.id, { stars: 3, bestTime: 90 }]),
  );
  const daily = Array.from({ length: 12 }, (_, index) => ({
    key: `2026-08-${String(index + 1).padStart(2, "0")}`,
    attempts: 2,
    completed: true,
    bestTime: 100,
    bestCore: 90,
    bestPoints: 7,
  }));
  const mastery = {
    units: {
      vanguard: 15,
      ranger: 15,
      medic: 15,
      bulwark: 15,
    },
    lastMatch: "y",
  };
  const honors = baseHonors(campaign, daily, mastery);
  for (const honor of honors) assert.ok(honor.current <= honor.goal);
  assert.equal(honors.find((honor) => honor.id === "stars-48")?.current, 48);
});
