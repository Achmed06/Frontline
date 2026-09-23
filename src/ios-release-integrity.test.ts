import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const scene = readFileSync("ios/App/App/SceneDelegate.swift", "utf8");
const storyboard = readFileSync(
  "ios/App/App/Base.lproj/Main.storyboard",
  "utf8",
);
const controller = readFileSync(
  "ios/App/App/FrontlineViewController.swift",
  "utf8",
);
const project = readFileSync(
  "ios/App/App.xcodeproj/project.pbxproj",
  "utf8",
);
const ipa = readFileSync("scripts/ios-ipa.sh", "utf8");
const workflow = readFileSync(".github/workflows/ios-test.yml", "utf8");

test("scene lifecycle keeps the custom Capacitor controller that registers StoreKit", () => {
  assert.match(storyboard, /customClass="FrontlineViewController"/);
  assert.match(scene, /FrontlineViewController\(\)/);
  assert.doesNotMatch(
    scene,
    /rootViewController\s*=\s*CAPBridgeViewController\(\)/,
  );
  assert.match(
    controller,
    /registerPluginInstance\(FrontlineStorePlugin\(\)\)/,
  );
});

test("custom controller and StoreKit bridge remain compiled into the app target", () => {
  assert.match(project, /FrontlineViewController\.swift in Sources/);
  assert.match(project, /FrontlineStorePlugin\.swift in Sources/);
});

test("signed export rejects the placeholder bundle id and verifies archive identity", () => {
  assert.match(ipa, /com\.frontlinegame\.app/);
  assert.match(ipa, /CFBundleIdentifier/);
  assert.match(ipa, /PrivacyInfo\.xcprivacy/);
});

test("iPhone CI verifies a bundled privacy manifest before packaging", () => {
  assert.match(workflow, /Verify bundled privacy manifest/);
  assert.match(workflow, /PrivacyInfo\.xcprivacy/);
  assert.match(workflow, /IOS_PRIVACY_URL/);
});
