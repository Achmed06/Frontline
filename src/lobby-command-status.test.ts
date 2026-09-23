import assert from "node:assert/strict";
import test from "node:test";
import { lobbyCommandStatus } from "./lobby-command-status";

const base = {
  completedMissions: 2,
  totalMissions: 12,
  stars: 5,
  maxStars: 36,
  headquartersName: "Feldlager",
  readyProjects: 0,
  learningDone: 1,
  learningTotal: 4,
  dailyCompleted: false,
  dailyAttempts: 0,
  seriesActive: false,
  seriesWins: 0,
  seriesLosses: 0,
};

test("ready HQ project gets first command-center attention", () => {
  const status = lobbyCommandStatus({ ...base, readyProjects: 2 });
  assert.equal(status.attention, "headquarters");
  assert.equal(status.headquarters.value, "2 BEREIT");
  assert.equal(status.headquarters.ready, true);
});

test("open daily front is prioritized when HQ has nothing ready", () => {
  const status = lobbyCommandStatus(base);
  assert.equal(status.attention, "daily");
  assert.equal(status.daily.value, "OFFEN");
  assert.equal(status.daily.complete, false);
});

test("campaign becomes focus after daily is secured", () => {
  const status = lobbyCommandStatus({ ...base, dailyCompleted: true });
  assert.equal(status.attention, "campaign");
  assert.equal(status.campaign.value, "2/12");
});

test("fully completed command center settles into no urgent focus", () => {
  const status = lobbyCommandStatus({
    ...base,
    completedMissions: 12,
    stars: 36,
    dailyCompleted: true,
    learningDone: 4,
  });
  assert.equal(status.attention, "none");
  assert.equal(status.campaign.value, "GESICHERT");
  assert.equal(status.daily.value, "GESICHERT");
});

test("active series is surfaced as daily detail without overriding attention rules", () => {
  const status = lobbyCommandStatus({
    ...base,
    dailyCompleted: true,
    seriesActive: true,
    seriesWins: 2,
    seriesLosses: 1,
  });
  assert.equal(status.daily.detail, "Serie 2/3 · 1 Leben");
  assert.equal(status.attention, "campaign");
});

test("malformed counts clamp safely", () => {
  const status = lobbyCommandStatus({
    ...base,
    completedMissions: Number.NaN,
    totalMissions: 0,
    stars: -5,
    maxStars: 0,
    learningDone: -2,
    learningTotal: 0,
    dailyAttempts: -1,
  });
  assert.equal(status.campaign.value, "0/1");
  assert.equal(status.campaign.detail, "0/1 ★");
  assert.equal(status.headquarters.detail, "0/1 Ausbildung");
  assert.equal(status.daily.value, "OFFEN");
});
