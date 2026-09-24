import assert from "node:assert/strict";
import test from "node:test";
import { Sound, soundCueSpec, type SoundCue } from "./audio";

const cues: SoundCue[] = [
  "select",
  "deployFast",
  "deploy",
  "deployHeavy",
  "capture",
  "contact",
  "heavyContact",
  "kill",
  "heavyKill",
  "coreImpact",
  "coreCriticalImpact",
  "coreBreak",
  "coreLost",
  "warning",
  "opportunity",
  "overtime",
  "lastPush",
  "error",
  "win",
  "lose",
  "draw",
  "ability",
  "commander",
  "enemyCommander",
  "start",
  "unlock",
];

test("every tactical audio cue has safe finite synthesis layers", () => {
  for (const cue of cues) {
    const spec = soundCueSpec(cue);
    assert.ok(spec.tones.length > 0, cue);
    for (const layer of spec.tones) {
      assert.ok(Number.isFinite(layer.from) && layer.from >= 20, cue);
      assert.ok(Number.isFinite(layer.to) && layer.to >= 20, cue);
      assert.ok(layer.delay >= 0 && layer.delay <= 1, cue);
      assert.ok(layer.duration > 0 && layer.duration <= 0.6, cue);
      assert.ok(layer.gain > 0 && layer.gain <= 0.08, cue);
    }
    if (spec.noise) {
      assert.ok(spec.noise.delay >= 0 && spec.noise.delay <= 1, cue);
      assert.ok(spec.noise.duration > 0 && spec.noise.duration <= 0.25, cue);
      assert.ok(spec.noise.gain > 0 && spec.noise.gain <= 0.05, cue);
      assert.ok(spec.noise.lowpass >= 100 && spec.noise.lowpass <= 5000, cue);
    }
  }
});

test("high-value battlefield states have distinct cue signatures", () => {
  assert.notDeepEqual(soundCueSpec("commander"), soundCueSpec("enemyCommander"));
  assert.notDeepEqual(soundCueSpec("warning"), soundCueSpec("opportunity"));
  assert.notDeepEqual(soundCueSpec("win"), soundCueSpec("lose"));
  assert.notDeepEqual(soundCueSpec("draw"), soundCueSpec("lose"));
  assert.notDeepEqual(soundCueSpec("start"), soundCueSpec("deploy"));
  assert.notDeepEqual(soundCueSpec("deployFast"), soundCueSpec("deploy"));
  assert.notDeepEqual(soundCueSpec("deployHeavy"), soundCueSpec("deploy"));
  assert.notDeepEqual(soundCueSpec("unlock"), soundCueSpec("win"));
  assert.notDeepEqual(soundCueSpec("contact"), soundCueSpec("deploy"));
  assert.notDeepEqual(soundCueSpec("heavyContact"), soundCueSpec("contact"));
  assert.notDeepEqual(soundCueSpec("kill"), soundCueSpec("deploy"));
  assert.notDeepEqual(soundCueSpec("heavyKill"), soundCueSpec("kill"));
  assert.notDeepEqual(soundCueSpec("coreImpact"), soundCueSpec("kill"));
  assert.notDeepEqual(soundCueSpec("coreCriticalImpact"), soundCueSpec("coreImpact"));
  assert.notDeepEqual(soundCueSpec("coreBreak"), soundCueSpec("coreCriticalImpact"));
  assert.notDeepEqual(soundCueSpec("coreLost"), soundCueSpec("coreBreak"));
});

test("disabled sound remains safe in non-browser test environments", () => {
  const sound = new Sound();
  assert.doesNotThrow(() => sound.unlock());
  assert.doesNotThrow(() => sound.play("capture"));
});

test("enabled sound gracefully tolerates missing AudioContext", () => {
  const sound = new Sound();
  sound.enabled = true;
  assert.doesNotThrow(() => sound.unlock());
  assert.doesNotThrow(() => sound.play("warning"));
});
