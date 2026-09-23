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
const info = readFileSync("ios/App/App/Info.plist", "utf8");
const storePlugin = readFileSync(
  "ios/App/App/FrontlineStorePlugin.swift",
  "utf8",
);
const cloudSign = readFileSync("scripts/ios-cloud-sign.sh", "utf8");

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


test("StoreKit release configuration is embedded and defaults fail-safe to sandbox", () => {
  assert.match(info, /FrontlineStoreProductID/);
  assert.match(info, /FrontlineStoreMode/);
  assert.equal((project.match(/FRONTLINE_STORE_MODE = sandbox;/g) ?? []).length, 2);
  assert.equal(
    (project.match(/FRONTLINE_STORE_PRODUCT_ID = frontline\.supporter;/g) ?? [])
      .length,
    2,
  );
});

test("native StoreKit bridge reads build configuration and only labels explicit production as live", () => {
  assert.match(storePlugin, /FrontlineStoreProductID/);
  assert.match(storePlugin, /FrontlineStoreMode/);
  assert.match(storePlugin, /storeMode == "production"/);
  assert.match(storePlugin, /"testOnly": !productionStoreEnabled/);
});

test("signed export passes and verifies StoreKit mode and product id", () => {
  assert.match(ipa, /FRONTLINE_STORE_MODE/);
  assert.match(ipa, /FRONTLINE_STORE_PRODUCT_ID/);
  assert.match(ipa, /FrontlineStoreMode/);
  assert.match(ipa, /FrontlineStoreProductID/);
  assert.match(cloudSign, /Missing FRONTLINE_STORE_PRODUCT_ID/);
  assert.match(workflow, /IOS_STORE_PRODUCT_ID/);
  assert.match(workflow, /store_mode/);
});

test("unsigned iPhone build proves sandbox StoreKit defaults in the compiled app", () => {
  assert.match(workflow, /Verify unsigned StoreKit defaults/);
  assert.match(workflow, /test "\$MODE" = "sandbox"/);
});
