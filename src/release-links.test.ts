import assert from "node:assert/strict";
import test from "node:test";
import { privacyPolicyUrl } from "./release-links";

test("privacy policy accepts public HTTPS document URLs", () => {
  assert.equal(
    privacyPolicyUrl(" https://frontline.example/privacy "),
    "https://frontline.example/privacy",
  );
  assert.equal(
    privacyPolicyUrl("https://frontline.example/legal/privacy?lang=de"),
    "https://frontline.example/legal/privacy?lang=de",
  );
});

test("privacy policy rejects missing, local, insecure and credential URLs", () => {
  for (const value of [
    undefined,
    "",
    "http://frontline.example/privacy",
    "https://localhost/privacy",
    "https://127.0.0.1/privacy",
    "https://user:secret@frontline.example/privacy",
    "https://frontline.example/privacy#private",
    "javascript:alert(1)",
  ])
    assert.equal(privacyPolicyUrl(value), null);
});
