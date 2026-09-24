import {
  Haptics,
  ImpactStyle,
  NotificationType,
} from "@capacitor/haptics";
import { nativeApp } from "./mobile";

export type HapticCue =
  | "select"
  | "deployFast"
  | "deploy"
  | "deployHeavy"
  | "ability"
  | "capture"
  | "contact"
  | "heavyContact"
  | "kill"
  | "heavyKill"
  | "coreImpact"
  | "coreCriticalImpact"
  | "coreBreak"
  | "coreLost"
  | "warning"
  | "success"
  | "reward"
  | "error";

export type HapticSpec =
  | { kind: "impact"; style: "light" | "medium" | "heavy" }
  | { kind: "notification"; type: "success" | "warning" | "error" };

export function hapticSpec(cue: HapticCue): HapticSpec {
  switch (cue) {
    case "select":
    case "deployFast":
      return { kind: "impact", style: "light" };
    case "deploy":
    case "reward":
    case "contact":
    case "kill":
    case "coreImpact":
      return { kind: "impact", style: "medium" };
    case "ability":
    case "deployHeavy":
    case "heavyContact":
    case "heavyKill":
    case "coreCriticalImpact":
    case "coreBreak":
    case "coreLost":
      return { kind: "impact", style: "heavy" };
    case "capture":
    case "success":
      return { kind: "notification", type: "success" };
    case "warning":
      return { kind: "notification", type: "warning" };
    case "error":
      return { kind: "notification", type: "error" };
  }
}

const impactStyles = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  heavy: ImpactStyle.Heavy,
} as const;

const notificationTypes = {
  success: NotificationType.Success,
  warning: NotificationType.Warning,
  error: NotificationType.Error,
} as const;

let warned = false;

function safely(promise: Promise<void>): void {
  void promise.catch((error) => {
    if (warned) return;
    warned = true;
    console.warn("Native haptics unavailable", error);
  });
}

export const haptics = {
  play(cue: HapticCue): void {
    if (!nativeApp) return;
    const spec = hapticSpec(cue);
    if (spec.kind === "impact") {
      safely(Haptics.impact({ style: impactStyles[spec.style] }));
      return;
    }
    safely(
      Haptics.notification({
        type: notificationTypes[spec.type],
      }),
    );
  },
};
