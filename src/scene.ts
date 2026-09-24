import { ARENA_THEMES, type ArenaThemeId } from "./arena-themes";
import Phaser from "phaser";
import {
  abilityTargetPreview,
  Match,
  CARDS,
  CORE_TURRET_RANGE,
  controlPointPressure,
  coreTurretTarget,
  unitCombatTarget,
  deploymentColumns,
  type Effect,
  type Unit,
} from "./engine";
import { unitSvg } from "./art";
import { MATCH_END_SEQUENCE_MS, matchEndVisual } from "./match-end-visual";
import { matchOvertimeVisual } from "./match-overtime-visual";
import { controlPointVisual } from "./control-point-visual";
import { controlPointSecureVisual } from "./control-point-secure-visual";
import { captureSpecialistVisual } from "./capture-specialist-visual";
import { impactProfile } from "./combat-feedback";
import { deathBurstDirection } from "./death-burst-direction";
import { impactDirectionVisual } from "./impact-direction-visual";
import { shieldImpactVisual } from "./shield-impact-visual";
import { atlasShieldVisual } from "./atlas-shield-visual";
import { breakerShieldVisual } from "./breaker-shield-visual";
import { shieldIntegrityVisual } from "./shield-integrity-visual";
import { combatValuePresentation } from "./combat-value-label";
import { weaponFireDirection, weaponFireFeedback } from "./weapon-fire-feedback";
import { weaponCycleVisual } from "./weapon-cycle-visual";
import { weaponTargetLockVisual } from "./weapon-target-lock-visual";
import { deploymentArrivalVisual } from "./deployment-arrival-visual";
import { corePressure } from "./core-pressure";
import { coreDamageStateVisual } from "./core-damage-state-visual";
import { commanderActivationVisual } from "./commander-activation-visual";
import { unitHitReaction } from "./unit-hit-reaction";
import { coreTurretVisual } from "./core-turret-visual";
import { coreTurretAimVisual } from "./core-turret-aim-visual";
import { coreTargetAcquisitionVisual } from "./core-target-acquisition-visual";
import {
  coreTurretFireFeedback,
  type CoreTurretFireFeedback,
} from "./core-turret-fire";
import {
  coreHitReaction,
  type CoreHitReaction,
} from "./core-hit-reaction";
import { healLinkVisual } from "./heal-link-visual";
import { lyraRepairVisual } from "./lyra-repair-visual";
import { medicCycleVisual } from "./medic-cycle-visual";
import {
  battlefieldScarVisual,
  type BattlefieldScar,
} from "./battlefield-scar";
import { COMMANDERS } from "./commanders";
import {
  sampleUnitVitals,
  type UnitVitalsTrail,
} from "./unit-vitals";
import {
  sampleUnitMotionFrame,
  sampleUnitRenderPosition,
  unitRenderPosition,
  unitTrailPoint,
  type UnitFacing,
  type UnitRenderPositionState,
} from "./unit-motion";
import { movementFootprintVisual } from "./movement-footprint-visual";
import { unitDamageStateVisual } from "./unit-damage-state-visual";
import { slowStatusVisual } from "./slow-status-visual";
import { stasisHitVisual } from "./stasis-hit-visual";
import { stasisCastVisual } from "./stasis-cast-visual";
import {
  repulsorDisplacementPoint,
  repulsorDisplacementVisual,
} from "./repulsor-displacement-visual";
import { repulsorCastVisual } from "./repulsor-cast-visual";
import { pulseStrikeVisual } from "./pulse-strike-visual";
import { mortarBlastVisual } from "./mortar-blast-visual";
import { rallyCastVisual } from "./rally-cast-visual";
import { novaTempoActivationVisual } from "./nova-tempo-activation-visual";
import { pioneerCaptureVisual } from "./pioneer-capture-visual";
import { tempoStatusVisual } from "./tempo-status-visual";
import { effectPresentationBudget } from "./effect-density";

const MINT = 0x41ffc1,
  CORAL = 0xff684f,
  NEUTRAL = 0xffda85;
export type SceneBridge = {
  authoritative?: boolean;
  theme: () => ArenaThemeId;
  match: () => Match;
  running: () => boolean;
  selected: () => string | null;
  deploy: (x: number, y: number) => void;
  tick: () => void;
};
export class ArenaScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private fx!: Phaser.GameObjects.Graphics;
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private unitMotion = new Map<
    number,
    {
      x: number;
      y: number;
      phase: number;
      phaseRate: number;
      facing: UnitFacing;
      moving: boolean;
      stopped: boolean;
      dx: number;
      dy: number;
      moved: number;
      sampledAt: number;
      render: UnitRenderPositionState;
      renderedFrame: number;
      settleUntil: number;
    }
  >();
  private labels: Phaser.GameObjects.Text[] = [];
  private deploymentLaneLabels: Phaser.GameObjects.Text[] = [];
  private combatText = new Map<number, Phaser.GameObjects.Text>();
  private unitVitals = new Map<number, UnitVitalsTrail>();
  private pointer: { x: number; y: number } | null = null;
  private aim: {
    pointerId: number;
    cardId: string | null;
    match: Match;
  } | null = null;
  private deploymentGhosts: Phaser.GameObjects.Image[] = [];
  private aimLabel!: Phaser.GameObjects.Text;
  private endTitle!: Phaser.GameObjects.Text;
  private endSubtitle!: Phaser.GameObjects.Text;
  private overtimeTitle!: Phaser.GameObjects.Text;
  private overtimeSubtitle!: Phaser.GameObjects.Text;
  private endSequenceStartedAt: number | null = null;
  private clock = 0;
  private frameDeltaSeconds = 1 / 60;
  private renderFrame = 0;
  private reactedEffects = new Set<number>();
  private battleScars: BattlefieldScar[] = [];
  private brokenCores = new Set<"player" | "enemy">();
  private coreTargetAcquisition = new Map<
    "player" | "enemy",
    { targetId: number; startedAt: number }
  >();
  private reducedMotion = false;
  private lastMatch: Match | null = null;
  private wasRunning = false;
  constructor(private bridge: SceneBridge) {
    super("arena");
  }
  preload() {
    for (const card of CARDS.filter((c) => c.kind === "unit"))
      for (const team of ["player", "enemy"] as const) {
        // Phaser 3's XHRLoader decodes inline SVG payloads with atob.
        const bytes = new TextEncoder().encode(unitSvg(card.id, team));
        const data = btoa(String.fromCharCode(...bytes));
        this.load.svg(
          `${card.id}-${team}`,
          `data:image/svg+xml;base64,${data}`,
          { width: 96, height: 96 },
        );
      }
  }
  create() {
    this.reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.g = this.add.graphics();
    this.fx = this.add.graphics().setDepth(5);
    const maxDeploymentCount = Math.max(
      1,
      ...CARDS.filter((card) => card.kind === "unit").map(
        (card) => card.count ?? 1,
      ),
    );
    this.deploymentGhosts = Array.from({ length: maxDeploymentCount }, () =>
      this.add
        .image(0, 0, "vanguard-player")
        .setDepth(6)
        .setVisible(false),
    );
    this.aimLabel = this.add
      .text(210, 65, "", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#83ffcf",
        backgroundColor: "#101e21",
        padding: { x: 8, y: 6 },
        wordWrap: { width: 270 },
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(7)
      .setVisible(false);
    this.endTitle = this.add
      .text(210, 250, "", {
        fontFamily: "monospace",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#83ffcf",
        stroke: "#061315",
        strokeThickness: 5,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setVisible(false);
    this.endSubtitle = this.add
      .text(210, 278, "", {
        fontFamily: "monospace",
        fontSize: "9px",
        fontStyle: "bold",
        color: "#e8fff8",
        backgroundColor: "#071416dd",
        padding: { x: 8, y: 5 },
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setVisible(false);
    this.overtimeTitle = this.add
      .text(210, 248, "", {
        fontFamily: "monospace",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#fff0bc",
        stroke: "#061315",
        strokeThickness: 5,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(9)
      .setVisible(false);
    this.overtimeSubtitle = this.add
      .text(210, 274, "", {
        fontFamily: "monospace",
        fontSize: "8px",
        fontStyle: "bold",
        color: "#ffe8bf",
        backgroundColor: "#071416cc",
        padding: { x: 7, y: 4 },
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(9)
      .setVisible(false);

    for (let i = 0; i < 9; i++)
      this.labels.push(
        this.add
          .text(0, 0, `${"ABC"[i % 3]}${Math.floor(i / 3) + 1}`, {
            fontFamily: "monospace",
            fontSize: "9px",
            color: "#9cb0ad",
          })
          .setOrigin(0.5)
          .setDepth(3),
      );
    this.deploymentLaneLabels = Array.from({ length: 3 }, (_, column) =>
      this.add
        .text(0, 0, `EINSATZ ${column + 1}/3`, {
          fontFamily: "monospace",
          fontSize: "8px",
          fontStyle: "bold",
          color: "#83ffcf",
          backgroundColor: "#0b1d1dcc",
          padding: { x: 5, y: 3 },
        })
        .setOrigin(0.5)
        .setDepth(4)
        .setVisible(false),
    );
    this.add.text(27, 26, "SEKTOR 07", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#6e8581",
      letterSpacing: 2,
    });
    this.add
      .text(393, 535, "ATLAS // 01", {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#6e8581",
      })
      .setOrigin(1, 0);
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (
        !this.bridge.running() ||
        this.aim ||
        (!p.wasTouch && !p.leftButtonDown())
      )
        return;
      this.aim = {
        pointerId: p.id,
        cardId: this.bridge.selected(),
        match: this.bridge.match(),
      };
      this.pointer = { x: p.x, y: p.y };
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.aim && this.aim.pointerId !== p.id) return;
      this.pointer = { x: p.x, y: p.y };
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      const aim = this.aim;
      if (!aim || aim.pointerId !== p.id) return;
      this.cancelAim();
      // Phaser routes native touchcancel through pointerup as well.
      if (
        p.event.type === "touchcancel" ||
        !this.bridge.running() ||
        aim.match !== this.bridge.match() ||
        aim.cardId !== this.bridge.selected()
      )
        return;
      this.bridge.deploy(p.x, p.y);
    });
    this.input.on("pointerupoutside", () => this.cancelAim());
    this.input.on("gameout", () => this.cancelAim());
  }
  private cancelAim() {
    this.aim = null;
    this.pointer = null;
    for (const ghost of this.deploymentGhosts) ghost.setVisible(false);
    this.aimLabel.setVisible(false);
  }

  update(_time: number, delta: number) {
    const running = this.bridge.running(),
      match = this.bridge.match();
    if (
      !running ||
      (this.aim &&
        (this.aim.match !== match ||
          this.aim.cardId !== this.bridge.selected()))
    )
      this.cancelAim();
    if (match !== this.lastMatch) {
      this.scale.getParentBounds();
      this.scale.refresh();
      for (const sprite of this.sprites.values()) sprite.destroy();
      this.sprites.clear();
      for (const label of this.combatText.values()) label.destroy();
      this.combatText.clear();
      this.unitMotion.clear();
      this.unitVitals.clear();
      this.reactedEffects.clear();
      this.battleScars = [];
      this.brokenCores.clear();
      this.coreTargetAcquisition.clear();
      this.endSequenceStartedAt = null;
      this.endTitle.setVisible(false);
      this.endSubtitle.setVisible(false);
    }
    if (running) {
      this.frameDeltaSeconds = Math.min(delta, 100) / 1000;
      this.clock += this.frameDeltaSeconds;
      if (!this.bridge.authoritative) match.update(this.frameDeltaSeconds);
    }
    // Lobby and pause screens do not need continuously rebuilt graphics.
    if (running || match !== this.lastMatch || this.wasRunning) this.draw();
    this.lastMatch = match;
    this.wasRunning = running;
    this.bridge.tick();
  }
  private polygon(
    g: Phaser.GameObjects.Graphics,
    pts: number[][],
    fill: number,
    alpha = 1,
    line?: number,
  ) {
    g.fillStyle(fill, alpha);
    g.fillPoints(
      pts.map(([x, y]) => ({ x, y })),
      true,
    );
    if (line !== undefined) {
      g.lineStyle(1, line, 0.6);
      g.strokePoints(
        pts.map(([x, y]) => ({ x, y })),
        true,
      );
    }
  }
  private hex(x: number, y: number, r: number) {
    return Array.from({ length: 6 }, (_, i) => [
      x + Math.cos((i * Math.PI) / 3 - Math.PI / 6) * r,
      y + Math.sin((i * Math.PI) / 3 - Math.PI / 6) * r,
    ]);
  }

  private unitPresentationPoint(
    unit: Unit,
    effects?: readonly Effect[],
  ): { x: number; y: number } {
    const repulsorMove = effects?.find(
      (effect) =>
        effect.type === "repulsor-move" &&
        effect.targetUnitId === unit.id &&
        effect.life > 0,
    );
    const repulsorPoint = repulsorDisplacementPoint(
      repulsorMove,
      this.reducedMotion,
    );
    if (repulsorPoint) return repulsorPoint;

    const motion = this.unitMotion.get(unit.id);
    if (!motion) return { x: unit.x, y: unit.y };
    if (motion.renderedFrame === this.renderFrame)
      return unitRenderPosition(motion.render);
    return sampleUnitRenderPosition(
      motion.render,
      unit.x,
      unit.y,
      this.frameDeltaSeconds,
      this.reducedMotion,
    );
  }

  private drawCoreTargetAcquisition(
    team: "player" | "enemy",
    target?: Unit,
    targetPoint?: { x: number; y: number },
  ) {
    if (!target) {
      this.coreTargetAcquisition.delete(team);
      return;
    }

    let state = this.coreTargetAcquisition.get(team);
    if (!state || state.targetId !== target.id) {
      state = {
        targetId: target.id,
        startedAt: this.clock,
      };
      this.coreTargetAcquisition.set(team, state);
    }

    const visual = coreTargetAcquisitionVisual(
      this.clock - state.startedAt,
      target.radius,
    );
    if (!visual.active) return;

    const targetX = targetPoint?.x ?? target.x;
    const targetY = targetPoint?.y ?? target.y;
    const fx = this.fx;
    const color = team === "player" ? MINT : CORAL;
    const bright = team === "player" ? 0xd9fff1 : 0xffe4d8;
    const coreX = 210;
    const coreY = team === "player" ? 525 : 35;
    const dx = targetX - coreX;
    const dy = targetY - coreY;
    const distance = Math.max(0.001, Math.hypot(dx, dy));
    const nx = dx / distance;
    const ny = dy / distance;
    const px = -ny;
    const py = nx;

    fx.lineStyle(1.4, color, visual.alpha * 0.62);
    fx.strokeCircle(
      targetX,
      targetY,
      visual.ringRadius,
    );
    fx.lineStyle(1, bright, visual.alpha * 0.48);
    fx.strokeCircle(
      targetX,
      targetY,
      visual.innerRadius,
    );

    const rotation = this.reducedMotion
      ? 0
      : visual.progress * Math.PI * 0.9;
    for (let sweep = 0; sweep < visual.sweepCount; sweep++) {
      const angle =
        rotation +
        (sweep * Math.PI * 2) /
          visual.sweepCount;
      const sx =
        targetX +
        Math.cos(angle) *
          visual.ringRadius;
      const sy =
        targetY +
        Math.sin(angle) *
          visual.ringRadius;
      const tx = -Math.sin(angle);
      const ty = Math.cos(angle);
      fx.lineStyle(
        sweep === 0 ? 1.8 : 1.1,
        sweep === 0 ? bright : color,
        visual.alpha * (sweep === 0 ? 0.82 : 0.52),
      );
      fx.lineBetween(
        sx - tx * visual.sweepLength * 0.5,
        sy - ty * visual.sweepLength * 0.5,
        sx + tx * visual.sweepLength * 0.5,
        sy + ty * visual.sweepLength * 0.5,
      );
    }

    const bracket = visual.ringRadius * 0.72;
    const arm = visual.bracketReach;
    fx.lineStyle(1.25, bright, visual.alpha * 0.72);
    for (const forward of [-1, 1]) {
      for (const side of [-1, 1]) {
        const bx =
          targetX +
          nx * forward * bracket +
          px * side * bracket;
        const by =
          targetY +
          ny * forward * bracket +
          py * side * bracket;
        fx.lineBetween(
          bx,
          by,
          bx - nx * forward * arm,
          by - ny * forward * arm,
        );
        fx.lineBetween(
          bx,
          by,
          bx - px * side * arm,
          by - py * side * arm,
        );
      }
    }

    fx.lineStyle(1, color, visual.alpha * 0.3);
    fx.lineBetween(coreX, coreY, targetX, targetY);

    if (!this.reducedMotion) {
      const scanX = coreX + dx * visual.scanT;
      const scanY = coreY + dy * visual.scanT;
      fx.fillStyle(bright, visual.alpha * 0.9);
      fx.fillCircle(scanX, scanY, 2.2);
      fx.lineStyle(1.2, color, visual.alpha * 0.68);
      fx.lineBetween(
        scanX - px * 4 - nx * 3,
        scanY - py * 4 - ny * 3,
        scanX + px * 4 + nx * 3,
        scanY + py * 4 + ny * 3,
      );
    }
  }

  private syncCombatText(
    effects: readonly Effect[],
    units: readonly Unit[],
  ): void {
    const visible = effects
      .filter((effect) => combatValuePresentation(effect))
      .sort((a, b) => b.id - a.id)
      .slice(0, 5);
    const visibleIds = new Set(visible.map((effect) => effect.id));

    for (const [id, label] of this.combatText)
      if (!visibleIds.has(id)) {
        label.destroy();
        this.combatText.delete(id);
      }

    for (const effect of visible) {
      const info = combatValuePresentation(effect)!;
      const progress = 1 - effect.life / effect.maxLife;
      const alpha = Math.max(0, effect.life / effect.maxLife);
      const targetUnit =
        effect.targetUnitId !== undefined
          ? units.find((unit) => unit.id === effect.targetUnitId)
          : undefined;
      const targetPoint = targetUnit
        ? this.unitPresentationPoint(targetUnit, effects)
        : undefined;
      const useTarget =
        (effect.type === "heal" || effect.type === "frontline") &&
        effect.targetX !== undefined &&
        effect.targetY !== undefined;
      const x =
        targetPoint?.x ?? (useTarget ? effect.targetX! : effect.x);
      const baseY =
        targetPoint?.y ?? (useTarget ? effect.targetY! : effect.y);
      let label = this.combatText.get(effect.id);
      if (!label) {
        label = this.add
          .text(
            x + info.xOffset,
            baseY - 18 + info.yOffset,
            info.text,
            {
            fontFamily: "monospace",
            fontSize: "9px",
            fontStyle: "bold",
            color: info.color,
            stroke: "#071416",
            strokeThickness: 3,
            },
          )
          .setOrigin(0.5)
          .setDepth(8);
        this.combatText.set(effect.id, label);
      }
      label
        .setText(info.text)
        .setColor(info.color)
        .setPosition(
          x + info.xOffset,
          baseY -
            18 +
            info.yOffset -
            (this.reducedMotion ? 0 : progress * 18),
        )
        .setAlpha(Math.min(1, alpha * 1.35))
        .setScale(
          this.reducedMotion
            ? 1
            : 0.9 + Math.sin(Math.min(1, progress * 2) * Math.PI) * 0.1,
        );
    }
  }
  private statusPips(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    seconds: number,
    color: number,
    startAngle: number,
  ) {
    const count = Math.max(0, Math.min(6, Math.ceil(seconds - 1e-6)));
    if (!count) return;
    g.fillStyle(color, 0.9);
    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * 0.24;
      g.fillCircle(
        x + Math.cos(angle) * 26,
        y + Math.sin(angle) * 26,
        1.35,
      );
    }
  }
  private drawThemeAtmosphere(
    g: Phaser.GameObjects.Graphics,
    themeId: ArenaThemeId,
    accent: number,
  ) {
    const t = this.clock;
    if (themeId === "coast") {
      g.lineStyle(1, accent, 0.14);
      for (let i = 0; i < 6; i++) {
        const y = 72 + i * 88 + Math.sin(t * 1.4 + i) * 5;
        const reach = 20 + ((i * 7) % 15);
        g.lineBetween(0, y, reach, y + 2);
        g.lineBetween(420 - reach, y - 3, 420, y);
      }
      g.fillStyle(0xd7fff1, 0.2);
      for (let i = 0; i < 8; i++) {
        const x = (i * 61 + t * (6 + (i % 3))) % 420;
        const y = 38 + ((i * 83) % 485);
        g.fillEllipse(x, y, 5, 1.5);
      }
    } else if (themeId === "frost") {
      g.fillStyle(0xe8fbff, 0.32);
      for (let i = 0; i < 15; i++) {
        const x = (i * 79 + t * (2 + (i % 2))) % 420;
        const y = (i * 47 + t * (8 + (i % 4))) % 560;
        const r = 1 + (i % 3) * 0.45;
        g.fillCircle(x, y, r);
      }
      g.lineStyle(1, accent, 0.12);
      for (let i = 0; i < 4; i++) {
        const y = 90 + i * 125;
        g.lineBetween(3, y, 26, y - 12);
        g.lineBetween(394, y + 16, 417, y + 4);
      }
    } else if (themeId === "ember") {
      for (let i = 0; i < 12; i++) {
        const drift = Math.sin(t * 1.6 + i) * 8;
        const x = 9 + ((i * 97) % 402) + drift;
        const y = 555 - ((i * 53 + t * (15 + (i % 4) * 3)) % 540);
        g.fillStyle(i % 3 === 0 ? 0xffe09a : accent, 0.18 + (i % 3) * 0.07);
        g.fillCircle(x, y, 1.3 + (i % 2));
      }
      g.lineStyle(2, accent, 0.11);
      g.lineBetween(0, 180, 24, 194);
      g.lineBetween(396, 365, 420, 349);
      g.lineBetween(4, 470, 26, 452);
    } else {
      const scanY = (t * 28) % 560;
      g.lineStyle(1, accent, 0.1);
      g.lineBetween(0, scanY, 420, scanY);
      g.lineStyle(1, accent, 0.13);
      for (let i = 0; i < 7; i++) {
        const x = 12 + ((i * 67) % 396);
        const y = (i * 101 + t * (7 + (i % 3))) % 560;
        g.strokeCircle(x, y, 2 + (i % 2));
        g.lineBetween(x, y + 4, x, y + 12);
      }
    }
  }

  private drawSectorTexture(
    g: Phaser.GameObjects.Graphics,
    themeId: ArenaThemeId,
    x: number,
    y: number,
    index: number,
    accent: number,
  ) {
    if (themeId === "coast") {
      g.lineStyle(1.5, 0x8de5a2, 0.2);
      for (let i = 0; i < 3; i++) {
        const ox = -36 + i * 7 + (index % 2) * 3;
        const oy = 34 - i * 3;
        g.lineBetween(x + ox, y + oy, x + ox - 2, y + oy - 8);
        g.lineBetween(x + ox, y + oy, x + ox + 4, y + oy - 6);
      }
    } else if (themeId === "frost") {
      g.lineStyle(1, 0xe8fbff, 0.17);
      const ox = x + (index % 2 ? 31 : -31);
      const oy = y + (index % 3 === 0 ? 29 : -29);
      g.lineBetween(ox - 6, oy, ox + 6, oy);
      g.lineBetween(ox, oy - 6, ox, oy + 6);
      g.lineBetween(ox - 4, oy - 4, ox + 4, oy + 4);
      g.lineBetween(ox + 4, oy - 4, ox - 4, oy + 4);
    } else if (themeId === "ember") {
      g.lineStyle(1.5, accent, 0.2);
      const sx = x - 39 + (index % 3) * 4;
      const sy = y + 28 - (index % 2) * 7;
      g.lineBetween(sx, sy, sx + 10, sy - 7);
      g.lineBetween(sx + 10, sy - 7, sx + 16, sy - 2);
      g.lineBetween(sx + 10, sy - 7, sx + 12, sy - 15);
    } else {
      g.lineStyle(1, accent, 0.18);
      const sx = x + (index % 2 ? 28 : -34);
      const sy = y + (index % 3 ? 30 : -31);
      g.lineBetween(sx, sy, sx + 11, sy);
      g.lineBetween(sx + 11, sy, sx + 11, sy - 8);
      g.fillStyle(accent, 0.25);
      g.fillCircle(sx + 11, sy - 8, 1.8);
    }
  }
  private draw() {
    this.renderFrame++;
    const m = this.bridge.match(),
      s = m.state,
      g = this.g,
      fx = this.fx;
    g.clear();
    fx.clear();
    const themeId = this.bridge.theme();
    const theme = ARENA_THEMES[themeId];
    g.fillStyle(theme.water);
    g.fillRect(0, 0, 420, 560);
    // Fine survey grid and faint terrain contours around an angular platform.
    g.lineStyle(1, 0x69d9ec, 0.035);
    for (let x = 0; x < 420; x += 20) g.lineBetween(x, 0, x, 560);
    for (let y = 0; y < 560; y += 20) g.lineBetween(0, y, 420, y);
    for (let k = 0; k < 5; k++) {
      g.lineStyle(1, theme.accent, 0.16);
      g.strokeEllipse(20 - k * 15, 270, 110 + k * 25, 250 + k * 45);
      g.strokeEllipse(420 + k * 12, 300, 90 + k * 25, 300 + k * 45);
    }
    this.drawThemeAtmosphere(g, themeId, theme.accent);
    const boundary = [
      [28, 62],
      [80, 20],
      [340, 20],
      [392, 62],
      [403, 228],
      [386, 292],
      [403, 489],
      [350, 543],
      [70, 543],
      [17, 489],
      [34, 292],
      [17, 228],
    ];
    this.polygon(
      g,
      boundary.map(([x, y]) => [x, y + 6]),
      0x060e12,
      1,
    );
    this.polygon(g, boundary, theme.ground, 1, theme.edge);
    // Six small edge landmarks, with no collision or gameplay footprint.
    for (let i = 0; i < 6; i++) {
      const x = i % 2 === 0 ? 12 : 408;
      const y = 95 + Math.floor(i / 2) * 170;
      if (themeId === "frost") {
        this.polygon(
          g,
          [
            [x - 8, y + 14],
            [x - 5, y - 12],
            [x + 4, y - 22],
            [x + 9, y + 8],
          ],
          0x9eddf2,
          1,
          theme.edge,
        );
        g.lineStyle(2, 0xe7ffff, 0.8);
        g.lineBetween(x + 4, y - 20, x, y + 10);
      } else if (themeId === "ember") {
        g.lineStyle(3, theme.accent, 0.8);
        g.lineBetween(x - 6, y - 18, x + 5, y);
        g.lineBetween(x + 5, y, x - 5, y + 20);
      } else if (themeId === "nexus") {
        this.polygon(g, this.hex(x, y, 11), 0x413269, 1, theme.accent);
        g.fillStyle(theme.accent, 0.8);
        g.fillCircle(x, y, 4);
      } else {
        g.fillStyle(0x398d6b, 1);
        g.fillCircle(x, y, 9);
        g.fillStyle(0x86d58b, 1);
        g.fillCircle(x - 2, y - 4, 6);
      }
    }
    // Nine territory plates communicate the map rather than fixed lanes.
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3; col++) {
        const p = s.points[row * 3 + col],
          x = col * 125 + 85,
          y = row * 130 + 150;
        const color =
          p.owner === "player"
            ? 0x167b63
            : p.owner === "enemy"
              ? 0xa64f42
              : theme.neutral;
        this.polygon(
          g,
          [
            [x - 58, y - 58],
            [x + 39, y - 58],
            [x + 58, y - 38],
            [x + 58, y + 57],
            [x - 39, y + 57],
            [x - 58, y + 37],
          ],
          color,
          p.owner && !p.supplied ? 0.4 : 0.95,
          p.owner === "player"
            ? 0x46d6a8
            : p.owner === "enemy"
              ? 0xff9371
              : 0xd6bd7b,
        );
        g.lineStyle(1, 0xf6dda0, 0.12);
        for (let k = 0; k < 4; k++)
          g.lineBetween(x - 40, y - 44 + k * 24, x + 42, y - 44 + k * 24);
        g.fillStyle(0x101f24, 0.5);
        g.fillRect(x - 51, y - 47, 3, 12);
        g.fillRect(x + 47, y + 35, 3, 12);
        this.drawSectorTexture(g, themeId, x, y, row * 3 + col, theme.accent);
      }
    // Continuous supply boundary, with exact per-column deploy geometry.
    const playerZones = deploymentColumns(s.points, "player");
    const enemyZones = deploymentColumns(s.points, "enemy");
    const front = playerZones.flatMap((zone) => [
      [zone.xMin, zone.edge],
      [zone.xMax, zone.edge],
    ]);
    const enemyFront = enemyZones.flatMap((zone) => [
      [zone.xMin, zone.edge],
      [zone.xMax, zone.edge],
    ]);
    const deploymentCardId = this.bridge.selected();
    const deploymentCard = deploymentCardId
      ? CARDS.find((card) => card.id === deploymentCardId)
      : undefined;
    const unitDeploymentSelected =
      deploymentCard?.kind === "unit" && this.bridge.running();

    this.polygon(g, [...enemyFront, [402, 65], [18, 65]], CORAL, 0.045);
    this.polygon(
      g,
      [...front, [402, 495], [18, 495]],
      MINT,
      unitDeploymentSelected ? 0.09 : 0.045,
    );

    for (const label of this.deploymentLaneLabels) label.setVisible(false);
    if (unitDeploymentSelected) {
      for (const zone of playerZones) {
        const zoneHeight = Math.max(0, 495 - zone.edge);
        g.fillStyle(MINT, 0.045 + zone.depth * 0.012);
        g.fillRect(zone.xMin + 1, zone.edge, zone.xMax - zone.xMin - 2, zoneHeight);

        g.lineStyle(1, MINT, 0.11);
        for (let y = zone.edge + 12; y < 495; y += 18)
          g.lineBetween(zone.xMin + 5, y, zone.xMax - 5, y);

        g.lineStyle(1, 0xffffff, 0.075);
        for (let x = zone.xMin + 16; x < zone.xMax; x += 24)
          g.lineBetween(x, zone.edge + 4, x, 491);

        g.lineStyle(2.6, MINT, 0.82);
        g.lineBetween(zone.xMin + 3, zone.edge, zone.xMax - 3, zone.edge);
        g.lineStyle(1.4, 0xffffff, 0.52);
        for (let x = zone.xMin + 14; x < zone.xMax - 5; x += 22) {
          g.lineBetween(x - 4, zone.edge + 7, x, zone.edge + 11);
          g.lineBetween(x + 4, zone.edge + 7, x, zone.edge + 11);
        }

        const labelY = Math.max(
          92,
          Math.min(466, zone.edge + (zone.edge > 445 ? -15 : 17)),
        );
        this.deploymentLaneLabels[zone.column]
          ?.setText(`EINSATZ ${zone.column + 1}/3 · FRONT ${zone.depth}/3`)
          .setPosition(zone.centerX, labelY)
          .setVisible(true);
      }
    }

    const playerCaptureWave = s.effects.find(
      (effect) => effect.type === "capture" && effect.team === "player",
    );
    const enemyCaptureWave = s.effects.find(
      (effect) => effect.type === "capture" && effect.team === "enemy",
    );
    if (playerCaptureWave) {
      const pulse = playerCaptureWave.life / playerCaptureWave.maxLife;
      g.lineStyle(7, MINT, 0.08 + pulse * 0.16);
      g.strokePoints(front.map(([x, y]) => ({ x, y })), false);
    }
    if (enemyCaptureWave) {
      const pulse = enemyCaptureWave.life / enemyCaptureWave.maxLife;
      g.lineStyle(6, CORAL, 0.06 + pulse * 0.14);
      g.strokePoints(enemyFront.map(([x, y]) => ({ x, y })), false);
    }
    g.lineStyle(2, MINT, playerCaptureWave ? 0.92 : unitDeploymentSelected ? 0.88 : 0.65);
    g.strokePoints(
      front.map(([x, y]) => ({ x, y })),
      false,
    );
    g.lineStyle(1.5, CORAL, enemyCaptureWave ? 0.72 : 0.3);
    g.strokePoints(
      enemyFront.map(([x, y]) => ({ x, y })),
      false,
    );
    // Supply links. Color only when a connected friendly pair owns the link.
    for (let i = 0; i < 9; i++)
      for (const j of [i % 3 < 2 ? i + 1 : -1, i < 6 ? i + 3 : -1]) {
        if (j < 0) continue;
        const a = s.points[i],
          b = s.points[j];
        const color =
          j === i + 3 &&
          a.supplied &&
          b.supplied &&
          a.owner &&
          a.owner === b.owner
            ? a.owner === "player"
              ? MINT
              : CORAL
            : 0x78958d;
        g.lineStyle(2, 0x142025, 0.9);
        g.lineBetween(a.x, a.y, b.x, b.y);
        g.lineStyle(1, color, 0.2);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
    // Hand-placed rubble, ventilation strips and platform bolts.
    for (const [x, y, angle] of [
      [28, 106, 0.2],
      [385, 215, -0.2],
      [31, 372, 0.5],
      [386, 449, 0.8],
      [147, 217, 0.5],
      [272, 347, -0.3],
    ] as number[][]) {
      this.polygon(
        g,
        [
          [x - 10, y - 3],
          [x - 5, y - 10],
          [x + 8, y - 7],
          [x + 12, y + 3],
          [x + 3, y + 8],
          [x - 8, y + 7],
        ],
        0x13252a,
        0.9,
        0x3c4b46,
      );
      g.lineStyle(1, 0x698176, 0.25);
      g.lineBetween(x - 4, y - 5, x + 6, y - 4 + angle * 4);
    }

    this.battleScars = this.battleScars.filter((scar) =>
      battlefieldScarVisual(scar, this.clock),
    );
    for (const scar of this.battleScars) {
      const visual = battlefieldScarVisual(scar, this.clock);
      if (!visual) continue;
      const angle = scar.id * 0.73;
      const accent = 0x738078;
      const teamNeutral = 0x0a1012;

      g.fillStyle(teamNeutral, visual.alpha * 0.72);
      g.fillEllipse(
        scar.x,
        scar.y + 7,
        visual.radius * 2.1,
        visual.radius * 0.68,
      );

      if (
        visual.kind === "explosive" ||
        visual.kind === "heavy" ||
        visual.kind === "rail"
      ) {
        g.lineStyle(
          visual.kind === "explosive" ? 2 : 1.4,
          0x8f735c,
          visual.ringAlpha,
        );
        g.strokeEllipse(
          scar.x,
          scar.y + 4,
          visual.radius * 1.8,
          visual.radius * 0.72,
        );
        g.lineStyle(1, 0xc49b6b, visual.debrisAlpha * 0.62);
        for (let i = 0; i < 5; i++) {
          const a = angle + i * (Math.PI * 2) / 5;
          const inner = visual.radius * 0.34;
          const outer = visual.radius * (0.66 + (i % 2) * 0.12);
          g.lineBetween(
            scar.x + Math.cos(a) * inner,
            scar.y + 4 + Math.sin(a) * inner * 0.42,
            scar.x + Math.cos(a) * outer,
            scar.y + 4 + Math.sin(a) * outer * 0.42,
          );
        }
      } else if (visual.kind === "electric") {
        g.lineStyle(1.4, 0x88d5ff, visual.ringAlpha * 0.72);
        for (let i = 0; i < 4; i++) {
          const a = angle + i * Math.PI * 0.5;
          const r = visual.radius * 0.62;
          const x1 = scar.x + Math.cos(a) * r * 0.35;
          const y1 = scar.y + Math.sin(a) * r * 0.2;
          const x2 = scar.x + Math.cos(a + 0.24) * r;
          const y2 = scar.y + Math.sin(a + 0.24) * r * 0.42;
          g.lineBetween(x1, y1, x2, y2);
        }
        g.fillStyle(0x88d5ff, visual.debrisAlpha * 0.35);
        g.fillCircle(scar.x, scar.y + 4, 2.2);
      } else if (
        visual.kind === "melee" ||
        visual.kind === "breach"
      ) {
        g.lineStyle(
          visual.kind === "breach" ? 1.7 : 1.2,
          visual.kind === "breach" ? 0xc99e57 : 0x77817c,
          visual.ringAlpha * 0.75,
        );
        for (let i = -1; i <= 1; i++) {
          const dx = Math.cos(angle) * visual.radius * 0.72;
          const dy = Math.sin(angle) * visual.radius * 0.36;
          const px = -Math.sin(angle) * i * 4;
          const py = Math.cos(angle) * i * 2;
          g.lineBetween(
            scar.x - dx + px,
            scar.y + 4 - dy + py,
            scar.x + dx + px,
            scar.y + 4 + dy + py,
          );
        }
      } else {
        g.lineStyle(1.2, accent, visual.ringAlpha * 0.72);
        g.strokeEllipse(
          scar.x,
          scar.y + 4,
          visual.radius * 1.25,
          visual.radius * 0.46,
        );
        g.fillStyle(0x8b6d58, visual.debrisAlpha * 0.28);
        g.fillCircle(scar.x, scar.y + 4, Math.max(2, visual.radius * 0.18));
      }

      g.fillStyle(0x0b1012, visual.alpha * 0.48);
      for (let i = 0; i < 3; i++) {
        const a = angle + i * 2.1;
        g.fillRect(
          scar.x + Math.cos(a) * visual.radius * 0.55 - 1.5,
          scar.y + 4 + Math.sin(a) * visual.radius * 0.24 - 1,
          3,
          2,
        );
      }
    }

    for (const p of s.points) {
      const pressure = controlPointPressure(s, p);
      const relayVisual = controlPointVisual(
        p,
        pressure,
        m.controlObjective?.pointIds.includes(p.id) ?? false,
      );
      if (relayVisual) {
        const relayColor =
          relayVisual.team === "player"
            ? MINT
            : relayVisual.team === "enemy"
              ? CORAL
              : NEUTRAL;
        const specialistVisual =
          captureSpecialistVisual(pressure);
        const relayPulse = this.reducedMotion
          ? 0.72
          : 0.55 + 0.3 * Math.sin(this.clock * (relayVisual.critical ? 6 : 3) + p.id);
        const outerRadius = 40 + relayVisual.intensity * 6;

        g.lineStyle(5, relayColor, 0.055 + relayPulse * relayVisual.intensity * 0.12);
        g.strokeRoundedRect(
          p.x - outerRadius,
          p.y - outerRadius,
          outerRadius * 2,
          outerRadius * 2,
          14,
        );
        g.lineStyle(2, relayColor, 0.42 + relayPulse * 0.35);
        g.strokeRoundedRect(p.x - 38, p.y - 38, 76, 76, 12);

        if (relayVisual.stage === "contested") {
          g.lineStyle(3, MINT, 0.72);
          g.beginPath();
          g.arc(p.x, p.y, 44, 0, Math.PI, false);
          g.strokePath();
          g.lineStyle(3, CORAL, 0.72);
          g.beginPath();
          g.arc(p.x, p.y, 44, Math.PI, Math.PI * 2, false);
          g.strokePath();
          for (let i = 0; i < 4; i++) {
            const angle = Math.PI * 0.25 + i * Math.PI * 0.5;
            g.lineStyle(2, NEUTRAL, 0.7 + relayPulse * 0.2);
            g.lineBetween(
              p.x + Math.cos(angle) * 47,
              p.y + Math.sin(angle) * 47,
              p.x + Math.cos(angle) * 54,
              p.y + Math.sin(angle) * 54,
            );
          }
        } else if (
          relayVisual.stage === "capture" ||
          relayVisual.stage === "reverse"
        ) {
          const sweep = Math.max(0.08, relayVisual.progress) * Math.PI * 2;
          const start = -Math.PI / 2;
          const direction = relayVisual.team === "enemy" ? -1 : 1;
          const end = start + sweep * direction;
          g.lineStyle(
            relayVisual.critical ? 4.5 : 3.2,
            relayColor,
            0.66 + relayPulse * 0.28,
          );
          g.beginPath();
          g.arc(p.x, p.y, 44, start, end, direction < 0);
          g.strokePath();
          g.fillStyle(relayColor, 0.92);
          g.fillCircle(
            p.x + Math.cos(end) * 44,
            p.y + Math.sin(end) * 44,
            relayVisual.critical ? 3.5 : 2.6,
          );
          if (relayVisual.stage === "reverse") {
            g.lineStyle(1.8, NEUTRAL, 0.48);
            g.beginPath();
            g.arc(p.x, p.y, 49, end, start, direction < 0);
            g.strokePath();
          }
          if (relayVisual.critical) {
            for (let i = 0; i < 6; i++) {
              const angle =
                i * (Math.PI / 3) +
                (this.reducedMotion ? 0 : this.clock * 0.7 * direction);
              g.lineStyle(2, relayColor, 0.46 + relayPulse * 0.28);
              g.lineBetween(
                p.x + Math.cos(angle) * 49,
                p.y + Math.sin(angle) * 49,
                p.x + Math.cos(angle) * 57,
                p.y + Math.sin(angle) * 57,
              );
            }
          }
        if (specialistVisual.active) {
          const specialistColor =
            pressure.capturer === "player" ? 0x75f0ad : 0xffa986;
          const brightSpecialist =
            pressure.capturer === "player" ? 0xd9ffe9 : 0xffe7db;
          const direction =
            pressure.capturer === "enemy" ? -1 : 1;
          const rotation = this.reducedMotion
            ? -Math.PI / 2
            : -Math.PI / 2 +
              this.clock * specialistVisual.sweepSpeed * direction;
          const pulse = this.reducedMotion
            ? 0.8
            : 0.7 +
              Math.sin(
                this.clock * 5.8 + p.id * 0.71,
              ) *
                0.1;

          g.lineStyle(
            1.6 + specialistVisual.specialistBoost * 0.8,
            specialistColor,
            specialistVisual.alpha * pulse,
          );
          g.strokeCircle(
            p.x,
            p.y,
            specialistVisual.ringRadius,
          );

          for (
            let node = 0;
            node < specialistVisual.nodeCount;
            node++
          ) {
            const angle =
              rotation +
              (node * Math.PI * 2) /
                specialistVisual.nodeCount;
            const nx = Math.cos(angle);
            const ny = Math.sin(angle);
            const x =
              p.x +
              nx *
                specialistVisual.ringRadius;
            const y =
              p.y +
              ny *
                specialistVisual.ringRadius;

            g.fillStyle(
              node % 2 === 0
                ? brightSpecialist
                : specialistColor,
              specialistVisual.alpha *
                (0.56 +
                  specialistVisual.specialistBoost * 0.22),
            );
            g.fillCircle(
              x,
              y,
              1.5 +
                specialistVisual.specialistBoost * 0.8,
            );

            if (node % 2 === 0) {
              const tangentX = -ny;
              const tangentY = nx;
              const half = 2.6 + specialistVisual.specialistBoost * 1.6;
              g.lineStyle(
                1,
                brightSpecialist,
                specialistVisual.alpha * 0.5,
              );
              g.lineBetween(
                x - tangentX * half,
                y - tangentY * half,
                x + tangentX * half,
                y + tangentY * half,
              );
            }
          }

          const advanceY =
            p.y +
            (pressure.capturer === "player" ? 1 : -1) *
              (specialistVisual.ringRadius + 7);
          for (
            let chevron = 0;
            chevron < specialistVisual.chevronCount;
            chevron++
          ) {
            const offset =
              (chevron -
                (specialistVisual.chevronCount - 1) / 2) *
              8;
            const cx = p.x + offset;
            const reach = specialistVisual.chevronReach;
            g.lineStyle(
              chevron ===
                Math.floor(
                  specialistVisual.chevronCount / 2,
                )
                ? 2
                : 1.35,
              specialistColor,
              specialistVisual.alpha * 0.78,
            );
            g.lineBetween(
              cx - reach,
              advanceY -
                direction * reach * 0.6,
              cx,
              advanceY,
            );
            g.lineBetween(
              cx + reach,
              advanceY -
                direction * reach * 0.6,
              cx,
              advanceY,
            );
          }

          g.lineStyle(
            1,
            brightSpecialist,
            specialistVisual.alpha *
              (0.34 +
                specialistVisual.specialistBoost * 0.22),
          );
          g.strokeCircle(
            p.x,
            p.y,
            36 * specialistVisual.pulseScale,
          );
        }

        } else if (relayVisual.stage === "decay") {
          for (let i = 0; i < 8; i++) {
            const angle = i * (Math.PI / 4) - Math.PI / 2;
            const lit = i / 8 <= relayVisual.progress;
            g.lineStyle(2, relayColor, lit ? 0.48 : 0.14);
            g.lineBetween(
              p.x + Math.cos(angle) * 43,
              p.y + Math.sin(angle) * 43,
              p.x + Math.cos(angle) * 49,
              p.y + Math.sin(angle) * 49,
            );
          }
        }
      }
      const color =
        p.owner === "player" ? MINT : p.owner === "enemy" ? CORAL : NEUTRAL;
      g.fillStyle(0x07151a, 0.5);
      g.fillEllipse(p.x, p.y + 8, 60, 29);
      this.polygon(g, this.hex(p.x, p.y + 4, 27), 0x14253c, 1, 0x233f55);
      this.polygon(g, this.hex(p.x, p.y, 25), 0x23445a, 1, color);
      this.polygon(g, this.hex(p.x, p.y, 18), color, 0.36, color);
      g.fillStyle(color, p.owner && !p.supplied ? 0.1 : 0.25);
      g.fillRect(p.x - 4, p.y - 25, 8, 24);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(p.x, p.y - 18, 2);
      if (p.owner && !p.supplied) {
        g.fillStyle(0x0d1720, 0.36);
        g.fillCircle(p.x, p.y, 23);
        g.lineStyle(1.5, 0xe4c17e, 0.6);
        for (let offset = -24; offset <= 16; offset += 8)
          g.lineBetween(
            p.x + offset,
            p.y + 20,
            p.x + offset + 26,
            p.y - 20,
          );
        g.lineStyle(2, 0xf0c978, 0.75);
        g.strokeCircle(p.x, p.y, 29);
      }
      if (p.contested) {
        const warning = 0.6 + 0.35 * Math.sin(this.clock * 7 + p.id);
        g.fillStyle(0xffc64f, 0.04 + warning * 0.05);
        g.fillCircle(p.x, p.y, 35);
        g.lineStyle(3, 0xffdf6b, 0.72 + warning * 0.22);
        g.lineBetween(p.x - 10, p.y - 10, p.x + 10, p.y + 10);
        g.lineBetween(p.x + 10, p.y - 10, p.x - 10, p.y + 10);
        g.strokeCircle(p.x, p.y, 34);
        for (let i = 0; i < 4; i++) {
          const angle = this.clock * 2.5 + i * Math.PI * 0.5;
          g.lineBetween(
            p.x + Math.cos(angle) * 37,
            p.y + Math.sin(angle) * 37,
            p.x + Math.cos(angle) * 43,
            p.y + Math.sin(angle) * 43,
          );
        }
      }
      const r = 8 + Math.sin(this.clock * 2 + p.id) * 0.6;
      this.polygon(
        g,
        [
          [p.x, p.y - r],
          [p.x + r * 0.8, p.y],
          [p.x, p.y + r],
          [p.x - r * 0.8, p.y],
        ],
        color,
        0.85,
      );
      g.lineStyle(2, color, 0.25);
      g.strokeCircle(p.x, p.y, 30);
      if (p.capture > 0.01) {
        const captureColor = p.captureTeam === "player" ? MINT : CORAL;
        const endAngle = -Math.PI / 2 + p.capture * Math.PI * 2;
        const activeCapture = pressure.mode === "capture";
        const captureWidth = activeCapture
          ? 5 + Math.min(2.4, (pressure.captureMultiplier - 1) * 3.2)
          : 4.5;
        g.lineStyle(8, 0x102540, 0.92);
        g.strokeCircle(p.x, p.y, 30);
        g.lineStyle(
          captureWidth,
          captureColor,
          pressure.mode === "decay" ? 0.55 : 0.95,
        );
        g.beginPath();
        g.arc(p.x, p.y, 30, -Math.PI / 2, endAngle, false);
        g.strokePath();
        g.lineStyle(2, 0xffffff, pressure.mode === "decay" ? 0.18 : 0.32);
        g.beginPath();
        g.arc(
          p.x,
          p.y,
          34,
          Math.max(-Math.PI / 2, endAngle - 0.55),
          endAngle,
          false,
        );
        g.strokePath();
        g.fillStyle(0xffffff, pressure.mode === "decay" ? 0.55 : 0.9);
        g.fillCircle(
          p.x + Math.cos(endAngle) * 30,
          p.y + Math.sin(endAngle) * 30,
          2.5,
        );

        if (pressure.mode === "capture" || pressure.mode === "reverse") {
          const pushColor = pressure.capturer === "player" ? MINT : CORAL;
          const pulse = this.reducedMotion
            ? 0.72
            : 0.62 + Math.sin(this.clock * 6 + p.id) * 0.16;
          g.lineStyle(
            pressure.mode === "capture" ? 2.8 : 2,
            pushColor,
            pulse,
          );
          g.beginPath();
          g.arc(
            p.x,
            p.y,
            38,
            -Math.PI * 0.72,
            -Math.PI * 0.28,
            false,
          );
          g.strokePath();
          const direction = pressure.capturer === "player" ? 1 : -1;
          for (let i = 0; i < Math.min(3, pressure.capturer === "player" ? pressure.playerCount : pressure.enemyCount); i++) {
            const px = p.x + (i - 1) * 8;
            const py = p.y + (direction > 0 ? 37 : -37);
            g.fillStyle(pushColor, 0.9);
            g.fillCircle(px, py, 2.4);
          }
        }
      }
      const secured = s.effects.find(
        (effect) =>
          effect.type === "capture" &&
          Math.abs(effect.x - p.x) < 1 &&
          Math.abs(effect.y - p.y) < 1,
      );
      if (secured) {
        const progress = 1 - secured.life / secured.maxLife;
        const secureColor = secured.team === "player" ? MINT : CORAL;
        const radius = 29 + progress * 28;
        g.lineStyle(2.5, secureColor, 0.75 * (1 - progress));
        this.polygon(g, this.hex(p.x, p.y, radius), 0x000000, 0, secureColor);
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3 - Math.PI / 6;
          const inner = 31 + progress * 8;
          const outer = 45 + progress * 20;
          g.lineBetween(
            p.x + Math.cos(angle) * inner,
            p.y + Math.sin(angle) * inner,
            p.x + Math.cos(angle) * outer,
            p.y + Math.sin(angle) * outer,
          );
        }
      }
      const sector = `${"ABC"[p.id % 3]}${Math.floor(p.id / 3) + 1}`;
      const capturePercent = Math.floor(p.capture * 100);
      const seconds = pressure.secondsRemaining
        ? pressure.secondsRemaining.toFixed(1).replace(".", ",")
        : "0,0";
      const pressureCount =
        pressure.capturer === "player"
          ? pressure.playerCount
          : pressure.capturer === "enemy"
            ? pressure.enemyCount
            : 0;
      const pointStatus =
        pressure.mode === "contested"
          ? ` · KAMPF ${pressure.playerCount}:${pressure.enemyCount}`
          : pressure.mode === "capture"
            ? ` · ${capturePercent}% · ${seconds}s · ×${(
                pressure.groupMultiplier * pressure.captureMultiplier
              ).toFixed(2).replace(".", ",")}`
            : pressure.mode === "reverse"
              ? ` · KONTER ${pressureCount} · ${capturePercent}%`
              : pressure.mode === "decay"
                ? ` · VERFÄLLT · ${capturePercent}%`
                : p.owner && !p.supplied
                  ? " · GETRENNT"
                  : "";
      this.labels[p.id]
        ?.setText(`${sector}${pointStatus}`)
        .setPosition(p.x, p.y + 40)
        .setColor(
          p.contested || (p.owner && !p.supplied)
            ? "#f4d896"
            : p.owner === "player"
              ? "#83ffcf"
              : p.owner === "enemy"
                ? "#ffc0a2"
                : "#fff0bc",
        );
    }
    const enemyCoreShot = s.effects
      .filter(
        (effect) =>
          effect.type === "shot" &&
          effect.sourceCardId === "core-turret" &&
          Math.abs(effect.x - s.cores.enemy.x) < 2 &&
          Math.abs(effect.y - s.cores.enemy.y) < 2,
      )
      .sort((a, b) => b.id - a.id)[0];
    const playerCoreShot = s.effects
      .filter(
        (effect) =>
          effect.type === "shot" &&
          effect.sourceCardId === "core-turret" &&
          Math.abs(effect.x - s.cores.player.x) < 2 &&
          Math.abs(effect.y - s.cores.player.y) < 2,
      )
      .sort((a, b) => b.id - a.id)[0];

    const enemyCoreHit = s.effects
      .filter(
        (effect) =>
          effect.type === "core-hit" &&
          Math.abs(effect.x - s.cores.enemy.x) < 2 &&
          Math.abs(effect.y - s.cores.enemy.y) < 2,
      )
      .sort((a, b) => (b.radius ?? 0) - (a.radius ?? 0))[0];
    const playerCoreHit = s.effects
      .filter(
        (effect) =>
          effect.type === "core-hit" &&
          Math.abs(effect.x - s.cores.player.x) < 2 &&
          Math.abs(effect.y - s.cores.player.y) < 2,
      )
      .sort((a, b) => (b.radius ?? 0) - (a.radius ?? 0))[0];
    const enemyCoreTarget = coreTurretTarget(s, "enemy");
    const playerCoreTarget = coreTurretTarget(s, "player");
    const enemyCoreTargetPoint = enemyCoreTarget
      ? this.unitPresentationPoint(enemyCoreTarget, s.effects)
      : undefined;
    const playerCoreTargetPoint = playerCoreTarget
      ? this.unitPresentationPoint(playerCoreTarget, s.effects)
      : undefined;
    const enemyCoreShotTarget =
      enemyCoreShot?.targetUnitId !== undefined
        ? s.units.find((unit) => unit.id === enemyCoreShot.targetUnitId)
        : undefined;
    const playerCoreShotTarget =
      playerCoreShot?.targetUnitId !== undefined
        ? s.units.find((unit) => unit.id === playerCoreShot.targetUnitId)
        : undefined;
    const enemyCoreShotTargetPoint = enemyCoreShotTarget
      ? this.unitPresentationPoint(enemyCoreShotTarget, s.effects)
      : undefined;
    const playerCoreShotTargetPoint = playerCoreShotTarget
      ? this.unitPresentationPoint(playerCoreShotTarget, s.effects)
      : undefined;

    this.drawCoreTargetAcquisition(
      "enemy",
      enemyCoreTarget,
      enemyCoreTargetPoint,
    );
    this.drawCoreTargetAcquisition(
      "player",
      playerCoreTarget,
      playerCoreTargetPoint,
    );
    this.drawCore(
      210,
      35,
      "enemy",
      s.cores.enemy.hp / s.cores.enemy.maxHp,
      enemyCoreHit ? enemyCoreHit.life / enemyCoreHit.maxLife : 0,
      enemyCoreTarget,
      enemyCoreHit?.radius ?? 0,
      m.coreTurretCooldownSeconds("enemy"),
      coreHitReaction(enemyCoreHit),
      coreTurretFireFeedback(
        enemyCoreShot,
        enemyCoreShotTargetPoint?.x,
        enemyCoreShotTargetPoint?.y,
      ),
      enemyCoreTargetPoint,
    );
    this.drawCore(
      210,
      525,
      "player",
      s.cores.player.hp / s.cores.player.maxHp,
      playerCoreHit ? playerCoreHit.life / playerCoreHit.maxLife : 0,
      playerCoreTarget,
      playerCoreHit?.radius ?? 0,
      m.coreTurretCooldownSeconds("player"),
      coreHitReaction(playerCoreHit),
      coreTurretFireFeedback(
        playerCoreShot,
        playerCoreShotTargetPoint?.x,
        playerCoreShotTargetPoint?.y,
      ),
      playerCoreTargetPoint,
    );
    const alive = new Set(s.units.map((u) => u.id));
    for (const [id, sprite] of this.sprites)
      if (!alive.has(id)) {
        sprite.destroy();
        this.sprites.delete(id);
        this.unitMotion.delete(id);
      }
    for (const u of s.units) {
      let sprite = this.sprites.get(u.id);
      if (!sprite) {
        sprite = this.add.image(u.x, u.y, `${u.cardId}-${u.team}`).setDepth(4);
        this.sprites.set(u.id, sprite);
      }
      const size = u.cardId === "bulwark" ? 45 : u.cardId === "swarm" ? 28 : 36;
      const spawnEffect = s.effects.find(
        (effect) =>
          effect.type === "spawn" &&
          effect.team === u.team &&
          (effect.targetUnitId === u.id ||
            (effect.targetUnitId === undefined &&
              Math.abs(effect.x - u.x) < 0.5 &&
              Math.abs(effect.y - u.y) < 0.5)),
      );
      const spawnArrival = deploymentArrivalVisual(spawnEffect);
      const spawnProgress = spawnArrival?.progress ?? 1;
      const spawnScale = spawnArrival?.spriteScale ?? 1;
      const spawnYOffset = spawnArrival?.yOffset ?? 0;
      const firing = s.effects.find(
        (effect) =>
          effect.type === "shot" &&
          effect.team === u.team &&
          (effect.sourceUnitId === u.id ||
            (effect.sourceUnitId === undefined &&
              Math.hypot(effect.x - u.x, effect.y - u.y) < 5)) &&
          effect.targetX !== undefined &&
          effect.targetY !== undefined,
      );
      const firingTarget =
        firing?.targetUnitId !== undefined
          ? s.units.find((unit) => unit.id === firing.targetUnitId)
          : undefined;
      const firingTargetPoint =
        firing?.targetX !== undefined && firing.targetY !== undefined
          ? firingTarget
            ? (() => {
                const targetMotion = this.unitMotion.get(firingTarget.id);
                if (
                  targetMotion &&
                  targetMotion.renderedFrame === this.renderFrame
                )
                  return unitRenderPosition(targetMotion.render);
                return sampleUnitRenderPosition(
                  targetMotion?.render,
                  firingTarget.x,
                  firingTarget.y,
                  this.frameDeltaSeconds,
                  this.reducedMotion,
                );
              })()
            : { x: firing.targetX, y: firing.targetY }
          : undefined;
      const repulsorMove = s.effects.find(
        (effect) =>
          effect.type === "repulsor-move" &&
          effect.targetUnitId === u.id &&
          effect.life > 0,
      );
      const repulsorPoint = repulsorDisplacementPoint(
        repulsorMove,
        this.reducedMotion,
      );
      const previous = this.unitMotion.get(u.id);
      const motion = sampleUnitMotionFrame(
        previous,
        u.x,
        u.y,
        s.time,
        firingTargetPoint?.x ?? firing?.targetX,
      );
      const simulationAdvanced =
        !previous ||
        previous.sampledAt !== motion.sampledAt ||
        Math.abs(previous.x - motion.x) > 1e-6 ||
        Math.abs(previous.y - motion.y) > 1e-6;
      const phaseRate = simulationAdvanced
        ? Math.min(0.9, motion.moved * 0.42) * 30
        : previous?.phaseRate ?? 0;
      const phase =
        (previous?.phase ?? u.id * 0.71) +
        (motion.moving ? phaseRate * this.frameDeltaSeconds : 0);
      const settleUntil =
        simulationAdvanced && motion.stopped
          ? this.clock + 0.18
          : previous?.settleUntil ?? 0;
      const rendered = repulsorPoint
        ? {
            x: repulsorPoint.x,
            y: repulsorPoint.y,
            state: {
              fromX: repulsorPoint.x,
              fromY: repulsorPoint.y,
              targetX: repulsorPoint.x,
              targetY: repulsorPoint.y,
              progress: 1,
            },
          }
        : sampleUnitRenderPosition(
            previous?.render,
            u.x,
            u.y,
            this.frameDeltaSeconds,
            this.reducedMotion,
          );
      this.unitMotion.set(u.id, {
        x: u.x,
        y: u.y,
        phase,
        phaseRate,
        facing: motion.facing,
        moving: motion.moving,
        stopped: motion.stopped,
        dx: motion.dx,
        dy: motion.dy,
        moved: motion.moved,
        sampledAt: s.time,
        render: rendered.state,
        renderedFrame: this.renderFrame,
        settleUntil,
      });
      const settle = this.reducedMotion
        ? 0
        : Math.max(0, Math.min(1, (settleUntil - this.clock) / 0.18));
      const walkBob =
        !this.reducedMotion && motion.moving && !repulsorPoint
          ? Math.sin(phase) * 1.6
          : 0;
      const walkScale =
        !this.reducedMotion && motion.moving && !repulsorPoint
          ? 1 + Math.sin(phase * 2) * 0.018
          : 1;
      const hitImpact = s.effects.find(
        (effect) =>
          effect.type === "impact" &&
          (effect.targetUnitId === u.id ||
            (effect.targetUnitId === undefined &&
              Math.hypot(effect.x - u.x, effect.y - u.y) <= u.radius + 8)),
      );
      const renderX = rendered.x;
      const renderY = rendered.y;
      const hitStrength = hitImpact
        ? Math.max(0, hitImpact.life / hitImpact.maxLife)
        : 0;
      const hitReaction = unitHitReaction(hitImpact);
      const hitScale = 1 + hitStrength * 0.028;
      let recoilX = 0;
      let recoilY = 0;
      let recoilScale = 1;
      let fireWidthScale = 1;
      let fireHeightScale = 1;
      const fireFeedback = firing
        ? weaponFireFeedback(
            firing.sourceCardId,
            firing.life,
            firing.maxLife,
          )
        : null;
      const fireDirection =
        firing && fireFeedback && firingTargetPoint
          ? weaponFireDirection(
              renderX,
              renderY,
              firingTargetPoint.x,
              firingTargetPoint.y,
              motion.facing,
            )
          : null;
      if (fireDirection && fireFeedback) {
        recoilX = fireDirection.nx * fireFeedback.displacement;
        recoilY = fireDirection.ny * fireFeedback.displacement;
        recoilScale = fireFeedback.scale;
        fireWidthScale = fireFeedback.widthScale;
        fireHeightScale = fireFeedback.heightScale;
      }
      const attackPose = fireFeedback?.strength ?? 0;
      const horizontalLean =
        !this.reducedMotion && repulsorMove && repulsorPoint
          ? Math.max(
              -5.5,
              Math.min(
                5.5,
                (((repulsorMove.targetX ?? repulsorPoint.x) -
                  repulsorMove.x) /
                  Math.max(
                    0.01,
                    Math.hypot(
                      (repulsorMove.targetX ?? repulsorPoint.x) -
                        repulsorMove.x,
                      (repulsorMove.targetY ?? repulsorPoint.y) -
                        repulsorMove.y,
                    ),
                  )) *
                  5.5,
              ),
            )
          : !this.reducedMotion && motion.moving && motion.moved > 0.001
            ? Math.max(
                -2.2,
                Math.min(2.2, (motion.dx / motion.moved) * 2.2),
              )
            : 0;
      const settleWidth = 1 + settle * 0.035;
      const settleHeight = 1 - settle * 0.025;
      const attackWidth = 1 + attackPose * 0.028;
      const attackHeight = 1 - attackPose * 0.014;
      sprite
        .setPosition(
          rendered.x +
            recoilX +
            (this.reducedMotion ? 0 : hitReaction.offsetX),
          rendered.y -
            3 +
            spawnYOffset +
            walkBob +
            recoilY +
            (this.reducedMotion ? 0 : hitReaction.offsetY),
        )
        .setDisplaySize(
          size *
            spawnScale *
            walkScale *
            recoilScale *
            fireWidthScale *
            hitScale *
            hitReaction.widthScale *
            settleWidth *
            attackWidth,
          size *
            spawnScale *
            walkScale *
            recoilScale *
            fireHeightScale *
            hitScale *
            hitReaction.heightScale *
            settleHeight *
            attackHeight,
        )
        .setFlipX((fireDirection?.facing ?? motion.facing) < 0)
        .setAngle(
          this.reducedMotion
            ? 0
            : horizontalLean +
              (motion.moving ? Math.sin(phase) * 1.2 : 0) +
              hitReaction.angle,
        )
        .setAlpha(
          u.hp > 0
            ? spawnEffect
              ? Math.min(1, 0.25 + spawnProgress * 1.3)
              : 1
            : 0,
        );
      if (hitStrength > 0.42) sprite.setTintFill(0xffffff);
      else sprite.clearTint();
      g.fillStyle(0x06171b, 0.55);
      g.fillEllipse(rendered.x, rendered.y + 6, size * 0.65, size * 0.25);
      g.lineStyle(2, u.team === "player" ? MINT : CORAL, 0.9);
      g.strokeEllipse(
        rendered.x,
        rendered.y + 7,
        size * 0.75,
        size * 0.32,
      );

      const weaponCycle = weaponCycleVisual(
        u.cardId,
        u.attackCooldown,
        u.interval,
      );
      if (weaponCycle.active) {
        const cycleColor =
          weaponCycle.kind === "rail"
            ? 0xdff7ff
            : weaponCycle.kind === "explosive"
              ? 0xffc368
              : weaponCycle.kind === "heavy"
                ? 0xffd59a
                : 0x9adfff;
        const start = -Math.PI / 2;
        const end =
          start +
          Math.PI *
            2 *
            Math.max(0.018, weaponCycle.charge);
        const cycleY = renderY + 9;
        const readyBoost =
          weaponCycle.charge >= 0.82
            ? this.reducedMotion
              ? 0.18
              : 0.14 +
                Math.sin(
                  this.clock * 8 + u.id * 0.31,
                ) *
                  0.06
            : 0;

        fx.lineStyle(
          1,
          0x071416,
          0.42 * weaponCycle.prominence,
        );
        fx.strokeCircle(
          renderX,
          cycleY,
          weaponCycle.radius + 1.8,
        );

        fx.lineStyle(
          weaponCycle.thickness,
          cycleColor,
          (0.48 + readyBoost) *
            weaponCycle.prominence,
        );
        fx.beginPath();
        fx.arc(
          renderX,
          cycleY,
          weaponCycle.radius,
          start,
          end,
          false,
        );
        fx.strokePath();

        fx.lineStyle(
          1,
          0xffffff,
          (0.16 + weaponCycle.charge * 0.24) *
            weaponCycle.prominence,
        );
        for (let tick = 0; tick < weaponCycle.tickCount; tick++) {
          const a =
            start +
            ((tick + 1) /
              (weaponCycle.tickCount + 1)) *
              Math.PI *
              2;
          const inner = weaponCycle.radius - 2.5;
          const outer = weaponCycle.radius + 1.5;
          fx.lineBetween(
            renderX + Math.cos(a) * inner,
            cycleY + Math.sin(a) * inner,
            renderX + Math.cos(a) * outer,
            cycleY + Math.sin(a) * outer,
          );
        }

        if (weaponCycle.charge >= 0.82) {
          const pipAngle = end;
          const pipX =
            renderX +
            Math.cos(pipAngle) *
              weaponCycle.radius;
          const pipY =
            cycleY +
            Math.sin(pipAngle) *
              weaponCycle.radius;
          fx.fillStyle(
            0xffffff,
            0.42 +
              weaponCycle.charge *
                0.45,
          );
          fx.fillCircle(
            pipX,
            pipY,
            1.5 +
              (weaponCycle.charge - 0.82) *
                4,
          );
        }
      }

      const combatTarget = unitCombatTarget(s, u);
      if (combatTarget?.inRange) {
        const targetRadius = combatTarget.core
          ? 21
          : combatTarget.target.radius;
        const targetPresentation = combatTarget.core
          ? { x: combatTarget.target.x, y: combatTarget.target.y }
          : (() => {
              const targetMotion = this.unitMotion.get(
                combatTarget.target.id,
              );
              if (
                targetMotion &&
                targetMotion.renderedFrame === this.renderFrame
              )
                return unitRenderPosition(targetMotion.render);
              return sampleUnitRenderPosition(
                targetMotion?.render,
                combatTarget.target.x,
                combatTarget.target.y,
                this.frameDeltaSeconds,
                this.reducedMotion,
              );
            })();
        const targetLock = weaponTargetLockVisual(
          u.cardId,
          u.attackCooldown,
          u.interval,
          true,
          renderX,
          renderY,
          targetPresentation.x,
          targetPresentation.y,
          targetRadius,
        );
        if (targetLock.active) {
          const lockColor =
            targetLock.kind === "rail"
              ? 0xdff7ff
              : targetLock.kind === "explosive"
                ? 0xffc368
                : targetLock.kind === "heavy"
                  ? 0xffd59a
                  : 0x9adfff;
          const targetX = targetPresentation.x;
          const targetY = targetPresentation.y;
          const sourceReach = u.radius + 5;
          const targetReach =
            targetLock.bracketRadius + 4;
          const lineStartX =
            renderX + targetLock.nx * sourceReach;
          const lineStartY =
            renderY + targetLock.ny * sourceReach;
          const lineEndX =
            targetX - targetLock.nx * targetReach;
          const lineEndY =
            targetY - targetLock.ny * targetReach;
          const lineDx = lineEndX - lineStartX;
          const lineDy = lineEndY - lineStartY;

          for (
            let dash = 0;
            dash < targetLock.dashCount;
            dash++
          ) {
            const startT =
              (dash + 0.18) /
              targetLock.dashCount;
            const endT =
              Math.min(
                1,
                startT +
                  0.42 /
                    targetLock.dashCount,
              );
            fx.lineStyle(
              1,
              lockColor,
              targetLock.sightAlpha *
                (0.72 + dash * 0.08),
            );
            fx.lineBetween(
              lineStartX + lineDx * startT,
              lineStartY + lineDy * startT,
              lineStartX + lineDx * endT,
              lineStartY + lineDy * endT,
            );
          }

          const r = targetLock.bracketRadius;
          const arm = targetLock.bracketArm;
          const nx = targetLock.nx;
          const ny = targetLock.ny;
          const px = targetLock.px;
          const py = targetLock.py;
          fx.lineStyle(
            targetLock.kind === "rail" ||
              targetLock.kind === "explosive"
              ? 1.8
              : 1.35,
            lockColor,
            targetLock.alpha,
          );
          for (const forward of [-1, 1]) {
            for (const side of [-1, 1]) {
              const cx =
                targetX +
                nx * forward * r +
                px * side * r;
              const cy =
                targetY +
                ny * forward * r +
                py * side * r;
              fx.lineBetween(
                cx,
                cy,
                cx -
                  nx *
                    forward *
                    arm,
                cy -
                  ny *
                    forward *
                    arm,
              );
              fx.lineBetween(
                cx,
                cy,
                cx -
                  px *
                    side *
                    arm,
                cy -
                  py *
                    side *
                    arm,
              );
            }
          }

          if (targetLock.targetPulse > 0) {
            const pulse =
              this.reducedMotion
                ? targetLock.targetPulse
                : targetLock.targetPulse *
                  (0.78 +
                    Math.sin(
                      this.clock * 9 +
                        u.id * 0.43,
                    ) *
                      0.16);
            fx.lineStyle(
              1.2,
              0xffffff,
              targetLock.alpha *
                pulse *
                0.72,
            );
            fx.strokeCircle(
              targetX,
              targetY,
              Math.max(
                4,
                r -
                  4 -
                  targetLock.targetPulse * 2,
              ),
            );
            fx.fillStyle(
              lockColor,
              targetLock.alpha *
                pulse *
                0.55,
            );
            fx.fillCircle(
              targetX,
              targetY,
              1.3 +
                targetLock.targetPulse * 1.4,
            );
          }
        }
      }

      if (
        firing &&
        fireFeedback &&
        fireFeedback.muzzleRays > 0 &&
        fireDirection
      ) {
        const nx = fireDirection.nx;
        const ny = fireDirection.ny;
        const px = -ny;
        const py = nx;
        const forward = size * 0.34;
        const muzzleX = renderX + nx * forward;
        const muzzleY = renderY - 3 + ny * forward;
        const muzzleColor =
          fireFeedback.kind === "electric"
            ? 0x9adfff
            : fireFeedback.kind === "explosive"
              ? 0xffc368
              : fireFeedback.kind === "rail"
                ? 0xe7f8ff
                : fireFeedback.kind === "heavy"
                  ? 0xffd59a
                  : u.team === "player"
                    ? MINT
                    : CORAL;
        const muzzleAlpha = 0.38 + fireFeedback.strength * 0.5;

        fx.fillStyle(0xffffff, muzzleAlpha * 0.72);
        fx.fillCircle(
          muzzleX,
          muzzleY,
          Math.max(1.2, fireFeedback.muzzleRadius * 0.62),
        );
        fx.fillStyle(muzzleColor, muzzleAlpha * 0.34);
        fx.fillCircle(
          muzzleX,
          muzzleY,
          Math.max(2.4, fireFeedback.muzzleRadius),
        );

        fx.lineStyle(
          fireFeedback.kind === "rail" ? 2.4 : 1.6,
          muzzleColor,
          muzzleAlpha,
        );
        fx.lineBetween(
          muzzleX,
          muzzleY,
          muzzleX + nx * fireFeedback.muzzleLength,
          muzzleY + ny * fireFeedback.muzzleLength,
        );

        for (let ray = 0; ray < fireFeedback.muzzleRays; ray++) {
          const t =
            fireFeedback.muzzleRays <= 1
              ? 0
              : ray / (fireFeedback.muzzleRays - 1) - 0.5;
          const spread =
            t *
            (4 + fireFeedback.muzzleRadius * 1.7);
          const rayLength =
            fireFeedback.muzzleLength *
            (0.48 + (ray % 3) * 0.12);
          const startX = muzzleX + px * spread * 0.35;
          const startY = muzzleY + py * spread * 0.35;
          fx.lineStyle(
            1,
            ray % 2 === 0 ? 0xffffff : muzzleColor,
            muzzleAlpha * 0.55,
          );
          fx.lineBetween(
            startX,
            startY,
            startX +
              nx * rayLength +
              px * spread,
            startY +
              ny * rayLength +
              py * spread,
          );
        }

        if (fireFeedback.kind === "electric") {
          fx.lineStyle(1.2, 0xcdf3ff, muzzleAlpha * 0.72);
          for (const side of [-1, 1]) {
            const sx = muzzleX + px * side * 2;
            const sy = muzzleY + py * side * 2;
            const mx =
              sx +
              nx * fireFeedback.muzzleLength * 0.45 +
              px * side * 3;
            const my =
              sy +
              ny * fireFeedback.muzzleLength * 0.45 +
              py * side * 3;
            fx.lineBetween(sx, sy, mx, my);
            fx.lineBetween(
              mx,
              my,
              muzzleX +
                nx * fireFeedback.muzzleLength * 0.86,
              muzzleY +
                ny * fireFeedback.muzzleLength * 0.86,
            );
          }
        }
      }

      const footprint = movementFootprintVisual(
        u.cardId,
        motion.moved,
      );
      if (!this.reducedMotion && motion.moving && motion.moved > 0.04) {
        const trail = unitTrailPoint(
          renderX,
          renderY + 8,
          motion.dx,
          motion.dy,
          footprint.trailDistance,
        );
        const length = Math.max(0.001, Math.hypot(motion.dx, motion.dy));
        const nx = motion.dx / length;
        const ny = motion.dy / length;
        const px = -ny;
        const py = nx;
        const pulse =
          footprint.dustAlpha *
          (0.78 + Math.abs(Math.sin(phase)) * 0.42);

        if (footprint.kind === "heavy") {
          for (const side of [-1, 1]) {
            const cx =
              trail.x +
              px * side * footprint.lateralOffset;
            const cy =
              trail.y +
              py * side * footprint.lateralOffset;
            g.fillStyle(0xd9d3a8, pulse);
            g.fillEllipse(
              cx,
              cy,
              footprint.primaryWidth,
              footprint.primaryHeight,
            );
            g.fillStyle(0xb9c3a7, pulse * 0.62);
            g.fillEllipse(
              cx - nx * 4,
              cy - ny * 4,
              footprint.secondaryWidth,
              footprint.secondaryHeight,
            );
          }
          g.lineStyle(1.2, 0xd7d5b0, pulse * 0.72);
          for (let step = 0; step < footprint.segmentCount; step++) {
            const distance = 3 + step * 4.2;
            const cx = trail.x - nx * distance;
            const cy = trail.y - ny * distance;
            g.lineBetween(
              cx - px * 4.4,
              cy - py * 4.4,
              cx + px * 4.4,
              cy + py * 4.4,
            );
          }
        } else if (footprint.kind === "siege") {
          g.lineStyle(1.4, 0xcfd5c8, pulse * 0.78);
          for (const side of [-1, 1]) {
            const sx =
              trail.x +
              px * side * footprint.lateralOffset;
            const sy =
              trail.y +
              py * side * footprint.lateralOffset;
            g.lineBetween(
              sx,
              sy,
              sx - nx * footprint.primaryWidth,
              sy - ny * footprint.primaryWidth,
            );
            g.lineStyle(1, 0x9fa99d, pulse * 0.5);
            g.lineBetween(
              sx - nx * 2,
              sy - ny * 2,
              sx - nx * (footprint.primaryWidth + 4),
              sy - ny * (footprint.primaryWidth + 4),
            );
          }
        } else if (footprint.kind === "swarm") {
          for (let node = 0; node < footprint.segmentCount; node++) {
            const side = node - 1;
            const offset =
              footprint.lateralOffset * side +
              Math.sin(phase + node * 1.7) * 1.5;
            const cx =
              trail.x +
              px * offset -
              nx * node * 2.2;
            const cy =
              trail.y +
              py * offset -
              ny * node * 2.2;
            g.fillStyle(
              node === 1 ? 0xd9f7ff : 0xb9c3a7,
              pulse * (0.72 + node * 0.08),
            );
            g.fillEllipse(
              cx,
              cy,
              footprint.primaryWidth,
              footprint.primaryHeight,
            );
          }
        } else {
          g.fillStyle(0xd9d3a8, pulse);
          g.fillEllipse(
            trail.x - px * 2.4,
            trail.y - py * 2.4,
            footprint.primaryWidth,
            footprint.primaryHeight,
          );
          g.fillStyle(0xb9c3a7, pulse * 0.72);
          g.fillEllipse(
            trail.x + px * 2.4 - nx * 2,
            trail.y + py * 2.4 - ny * 2,
            footprint.secondaryWidth,
            footprint.secondaryHeight,
          );
        }
      }
      if (settle > 0) {
        const settleAlpha =
          footprint.kind === "heavy"
            ? 0.32
            : footprint.kind === "siege"
              ? 0.25
              : 0.22;
        g.lineStyle(
          footprint.kind === "heavy" ? 1.7 : 1.3,
          0xd7d5b0,
          settle * settleAlpha,
        );
        g.strokeEllipse(
          renderX,
          renderY + 8,
          size *
            (footprint.settleWidthScale +
              (1 - settle) * 0.18),
          size *
            (footprint.settleHeightScale +
              (1 - settle) * 0.06),
        );
      }
      if (u.cardId === "medic") {
        const medicCard = CARDS.find(
          (card) => card.id === "medic",
        );
        const medicCycle = medicCycleVisual(
          u.cardId,
          u.healCooldown,
          medicCard?.supportInterval ?? u.interval,
        );
        if (medicCycle.active) {
          const medicColor =
            u.team === "player" ? 0x78ffd0 : 0xffb58d;
          const medicBright =
            u.team === "player" ? 0xd8fff0 : 0xffeadf;
          const cycleStart = -Math.PI / 2;
          const segmentSpan =
            (Math.PI * 2) / medicCycle.segmentCount;
          const cycleRotation = this.reducedMotion
            ? 0
            : this.clock *
              (medicCycle.ready ? 0.38 : 0.18);

          fx.fillStyle(
            medicColor,
            medicCycle.alpha *
              (medicCycle.ready ? 0.07 : 0.035),
          );
          fx.fillCircle(
            renderX,
            renderY,
            medicCycle.ringRadius - 4,
          );

          for (
            let segment = 0;
            segment < medicCycle.segmentCount;
            segment++
          ) {
            const filled =
              segment < medicCycle.filledSegments;
            const from =
              cycleStart +
              cycleRotation +
              segment * segmentSpan +
              segmentSpan * 0.12;
            const to =
              cycleStart +
              cycleRotation +
              (segment + 1) * segmentSpan -
              segmentSpan * 0.12;

            fx.lineStyle(
              filled
                ? medicCycle.ringThickness
                : 1,
              filled ? medicColor : 0x425b57,
              filled
                ? medicCycle.alpha *
                  (medicCycle.ready ? 0.9 : 0.68)
                : 0.22,
            );
            fx.beginPath();
            fx.arc(
              renderX,
              renderY,
              medicCycle.ringRadius,
              from,
              to,
              false,
            );
            fx.strokePath();
          }

          for (
            let packet = 0;
            packet < medicCycle.packetCount;
            packet++
          ) {
            const angle =
              -Math.PI / 2 +
              (packet * Math.PI * 2) /
                Math.max(1, medicCycle.packetCount) +
              (this.reducedMotion
                ? 0
                : this.clock *
                  (0.65 + medicCycle.charge * 0.55));
            const packetX =
              renderX +
              Math.cos(angle) *
                medicCycle.packetRadius;
            const packetY =
              renderY +
              Math.sin(angle) *
                medicCycle.packetRadius;

            fx.fillStyle(
              packet === 0 ? 0xffffff : medicColor,
              medicCycle.alpha *
                (0.62 + medicCycle.charge * 0.24),
            );
            fx.fillCircle(
              packetX,
              packetY,
              1.3 + medicCycle.charge * 0.7,
            );
          }

          if (medicCycle.ready) {
            const readyPulse = this.reducedMotion
              ? 0.8
              : 0.68 +
                Math.sin(
                  this.clock * 6.5 + u.id * 0.5,
                ) *
                  0.12;
            fx.fillStyle(
              medicBright,
              medicCycle.alpha * readyPulse,
            );
            fx.fillRect(
              renderX - 1.2,
              renderY - medicCycle.crossReach,
              2.4,
              medicCycle.crossReach * 2,
            );
            fx.fillRect(
              renderX - medicCycle.crossReach,
              renderY - 1.2,
              medicCycle.crossReach * 2,
              2.4,
            );

            fx.lineStyle(
              1,
              medicColor,
              medicCycle.alpha * 0.52,
            );
            fx.strokeCircle(
              renderX,
              renderY,
              medicCycle.ringRadius + 3,
            );
          }
        }
      }

      if (u.shield > 0) {
        const shieldVisual = shieldIntegrityVisual(
          u.shield,
          u.shieldTime,
        );
        if (shieldVisual.active) {
          const shieldColor =
            u.team === "player" ? MINT : CORAL;
          const brightShield =
            u.team === "player" ? 0xd8fff1 : 0xffe1d8;
          const pulse = this.reducedMotion
            ? 0.82
            : 0.74 +
              Math.sin(this.clock * 5 + u.id * 0.43) * 0.08;
          const startAngle =
            -Math.PI / 2 +
            (this.reducedMotion ? 0 : this.clock * 0.22);

          fx.fillStyle(
            shieldColor,
            shieldVisual.alpha *
              (0.025 + shieldVisual.integrity * 0.035),
          );
          fx.fillCircle(
            renderX,
            renderY,
            shieldVisual.innerRadius,
          );

          for (
            let plate = 0;
            plate < shieldVisual.plateCount;
            plate++
          ) {
            const intact =
              plate < shieldVisual.intactPlates;
            const angle =
              startAngle +
              (plate * Math.PI * 2) /
                shieldVisual.plateCount;
            const nextAngle =
              startAngle +
              ((plate + 1) * Math.PI * 2) /
                shieldVisual.plateCount;
            const gap =
              (nextAngle - angle) *
              shieldVisual.gapScale;
            const from = angle + gap;
            const to = nextAngle - gap;

            fx.lineStyle(
              intact ? 2.25 : 1,
              intact ? shieldColor : 0x53676a,
              intact
                ? shieldVisual.alpha * pulse
                : shieldVisual.alpha * 0.16,
            );
            fx.beginPath();
            fx.arc(
              renderX,
              renderY,
              shieldVisual.shellRadius,
              from,
              to,
              false,
            );
            fx.strokePath();

            if (intact && plate % 3 === 0) {
              const mid = (from + to) / 2;
              fx.fillStyle(
                brightShield,
                shieldVisual.alpha *
                  (0.32 + shieldVisual.integrity * 0.3),
              );
              fx.fillCircle(
                renderX +
                  Math.cos(mid) *
                    shieldVisual.shellRadius,
                renderY +
                  Math.sin(mid) *
                    shieldVisual.shellRadius,
                1.15,
              );
            }
          }

          if (shieldVisual.crackCount > 0) {
            fx.lineStyle(
              1.1,
              brightShield,
              shieldVisual.alpha *
                (0.25 + (1 - shieldVisual.integrity) * 0.38),
            );
            for (
              let crack = 0;
              crack < shieldVisual.crackCount;
              crack++
            ) {
              const angle =
                -Math.PI * 0.75 +
                crack * 0.58 +
                u.id * 0.17;
              const outer =
                shieldVisual.shellRadius - 1;
              const inner =
                shieldVisual.innerRadius *
                (0.62 + (crack % 2) * 0.12);
              const sx =
                renderX + Math.cos(angle) * outer;
              const sy =
                renderY + Math.sin(angle) * outer;
              const mx =
                renderX +
                Math.cos(angle + 0.12) *
                  ((outer + inner) / 2);
              const my =
                renderY +
                Math.sin(angle + 0.12) *
                  ((outer + inner) / 2);
              const ex =
                renderX +
                Math.cos(angle - 0.08) * inner;
              const ey =
                renderY +
                Math.sin(angle - 0.08) * inner;
              fx.lineBetween(sx, sy, mx, my);
              fx.lineBetween(mx, my, ex, ey);
            }
          }

          if (shieldVisual.release > 0) {
            fx.lineStyle(
              1.2,
              brightShield,
              shieldVisual.alpha *
                shieldVisual.release *
                0.58,
            );
            fx.strokeCircle(
              renderX,
              renderY,
              shieldVisual.releaseRadius,
            );
          }

          this.statusPips(
            fx,
            renderX,
            renderY,
            u.shieldTime,
            shieldColor,
            -2.9,
          );
        }
      }
      if (u.rallyTime > 0) {
        const tempoVisual = tempoStatusVisual(u.rallyTime);
        if (tempoVisual.active) {
          const tempoColor = 0xffdf6b;
          const brightTempo = 0xfff5bc;
          const direction =
            u.team === "player" ? -1 : 1;
          const motionPulse = this.reducedMotion
            ? 0.82
            : 0.74 +
              Math.sin(
                this.clock * tempoVisual.flowSpeed +
                  u.id * 0.61,
              ) *
                0.08;

          fx.fillStyle(
            tempoColor,
            tempoVisual.alpha *
              (0.035 + tempoVisual.moveStrength * 0.03),
          );
          fx.fillEllipse(
            renderX,
            renderY + 12,
            24 + tempoVisual.moveStrength * 12,
            7 + tempoVisual.moveStrength * 2,
          );

          for (
            let chevron = 0;
            chevron < tempoVisual.chevronCount;
            chevron++
          ) {
            const phaseOffset = this.reducedMotion
              ? chevron * tempoVisual.chevronSpacing
              : ((this.clock * tempoVisual.flowSpeed * 7 +
                    chevron * tempoVisual.chevronSpacing) %
                  (tempoVisual.flowLength +
                    tempoVisual.chevronSpacing));
            const y =
              renderY +
              12 +
              direction *
                (3 +
                  phaseOffset);
            const halfWidth =
              4.5 +
              tempoVisual.moveStrength * 2;

            fx.lineStyle(
              chevron === 0 ? 2.2 : 1.5,
              chevron === 0 ? brightTempo : tempoColor,
              tempoVisual.alpha *
                motionPulse *
                (1 - chevron * 0.08),
            );
            fx.lineBetween(
              renderX - halfWidth,
              y - direction * 3,
              renderX,
              y,
            );
            fx.lineBetween(
              renderX + halfWidth,
              y - direction * 3,
              renderX,
              y,
            );
          }

          const ringAngle = this.reducedMotion
            ? -Math.PI / 2
            : -Math.PI / 2 +
              this.clock * tempoVisual.cycleSpeed;
          fx.lineStyle(
            tempoVisual.ringThickness,
            tempoColor,
            tempoVisual.alpha *
              (0.58 + tempoVisual.attackStrength * 0.28),
          );
          fx.strokeCircle(
            renderX,
            renderY,
            tempoVisual.ringRadius,
          );

          fx.lineStyle(
            1,
            brightTempo,
            tempoVisual.alpha * 0.58,
          );
          for (
            let tick = 0;
            tick < tempoVisual.tickCount;
            tick++
          ) {
            const angle =
              ringAngle +
              (tick * Math.PI * 2) /
                tempoVisual.tickCount;
            const inner =
              tempoVisual.ringRadius - 2.5;
            const outer =
              tempoVisual.ringRadius + 2;
            fx.lineBetween(
              renderX + Math.cos(angle) * inner,
              renderY + Math.sin(angle) * inner,
              renderX + Math.cos(angle) * outer,
              renderY + Math.sin(angle) * outer,
            );
          }

          if (!this.reducedMotion) {
            const attackPipX =
              renderX +
              Math.cos(ringAngle) *
                tempoVisual.ringRadius;
            const attackPipY =
              renderY +
              Math.sin(ringAngle) *
                tempoVisual.ringRadius;
            fx.fillStyle(
              0xffffff,
              tempoVisual.alpha *
                (0.62 + tempoVisual.attackStrength * 0.24),
            );
            fx.fillCircle(
              attackPipX,
              attackPipY,
              1.5 +
                tempoVisual.attackStrength * 1.4,
            );
          }

          if (tempoVisual.release > 0) {
            fx.lineStyle(
              1.2,
              brightTempo,
              tempoVisual.alpha *
                tempoVisual.release *
                0.52,
            );
            fx.strokeCircle(
              renderX,
              renderY,
              tempoVisual.ringRadius +
                tempoVisual.release * 7,
            );
          }

          this.statusPips(
            fx,
            renderX,
            renderY,
            u.rallyTime,
            tempoColor,
            0.18,
          );
        }
      }
      if (u.slowTime > 0) {
        const slowVisual = slowStatusVisual(
          u.slowTime,
          u.slowFactor,
        );
        if (slowVisual.active) {
          const slowPulse = this.reducedMotion
            ? 0.82
            : 0.72 +
              Math.sin(
                this.clock * 4.5 +
                  u.id * 0.67,
              ) *
                0.1;
          const slowColor = 0x94caff;
          const brightSlow = 0xdff6ff;

          fx.fillStyle(
            slowColor,
            slowVisual.alpha * 0.055,
          );
          fx.fillEllipse(
            renderX,
            renderY + 12,
            slowVisual.floorWidth,
            slowVisual.floorHeight,
          );

          fx.lineStyle(
            1.8 + slowVisual.severity * 1.2,
            slowColor,
            slowVisual.alpha * slowPulse,
          );
          fx.strokeEllipse(
            renderX,
            renderY + 12,
            slowVisual.floorWidth,
            slowVisual.floorHeight,
          );

          fx.lineStyle(
            1.3,
            brightSlow,
            slowVisual.alpha * 0.66,
          );
          fx.strokeCircle(
            renderX,
            renderY,
            slowVisual.innerRadius,
          );

          const bandAngleOffset = this.reducedMotion
            ? 0
            : this.clock * slowVisual.orbitSpeed;
          for (
            let band = 0;
            band < slowVisual.bandCount;
            band++
          ) {
            const angle =
              bandAngleOffset +
              (band * Math.PI * 2) /
                slowVisual.bandCount;
            const cx =
              renderX +
              Math.cos(angle) *
                slowVisual.orbitRadius;
            const cy =
              renderY +
              Math.sin(angle) *
                slowVisual.orbitRadius *
                0.48;
            const tangentX = -Math.sin(angle);
            const tangentY = Math.cos(angle) * 0.48;
            const reach =
              slowVisual.bracketReach *
              (0.78 + (band % 2) * 0.22);

            fx.lineStyle(
              band % 2 === 0 ? 1.4 : 1,
              band % 2 === 0 ? brightSlow : slowColor,
              slowVisual.alpha *
                (0.52 + slowVisual.severity * 0.28),
            );
            fx.lineBetween(
              cx - tangentX * reach,
              cy - tangentY * reach,
              cx + tangentX * reach,
              cy + tangentY * reach,
            );

            if (
              !this.reducedMotion &&
              band % 2 === 0
            ) {
              fx.fillStyle(
                brightSlow,
                slowVisual.alpha *
                  (0.48 + slowVisual.severity * 0.24),
              );
              fx.fillCircle(
                cx,
                cy,
                1.2 + slowVisual.severity * 1.4,
              );
            }
          }

          const cageRadius = slowVisual.ringRadius;
          fx.lineStyle(
            1,
            slowColor,
            slowVisual.alpha *
              (0.34 + slowVisual.severity * 0.3),
          );
          for (let spoke = 0; spoke < 4; spoke++) {
            const angle =
              spoke * (Math.PI / 2) + Math.PI / 4;
            const inner =
              slowVisual.innerRadius + 2;
            fx.lineBetween(
              renderX + Math.cos(angle) * inner,
              renderY + Math.sin(angle) * inner,
              renderX + Math.cos(angle) * cageRadius,
              renderY + Math.sin(angle) * cageRadius,
            );
          }

          if (slowVisual.release > 0) {
            fx.lineStyle(
              1.2,
              brightSlow,
              slowVisual.alpha *
                slowVisual.release *
                0.58,
            );
            const releaseRadius =
              cageRadius +
              slowVisual.release * 7;
            fx.strokeCircle(
              renderX,
              renderY,
              releaseRadius,
            );
          }

          this.statusPips(
            fx,
            renderX,
            renderY,
            u.slowTime,
            slowColor,
            1.72,
          );
        }
      }
      const healthWidth = u.cardId === "bulwark" ? 27 : 21;
      const vitals = sampleUnitVitals(
        this.unitVitals.get(u.id),
        u.hp,
        u.maxHp,
        u.shield,
        COMMANDERS.atlas.shield,
        this.clock,
      );
      this.unitVitals.set(u.id, vitals);
      const health = vitals.hpRatio;
      const damageState = unitDamageStateVisual(
        u.hp,
        u.maxHp,
        u.cardId,
      );
      const healthColor =
        health <= 0.3
          ? 0xff6f5f
          : health <= 0.55
            ? 0xffcf68
            : u.team === "player"
              ? MINT
              : CORAL;

      fx.fillStyle(0x061519, 0.9);
      fx.fillRoundedRect(
        renderX - healthWidth / 2 - 1,
        renderY - 23,
        healthWidth + 2,
        4,
        2,
      );
      if (vitals.trailHpRatio > health + 0.002) {
        fx.fillStyle(0xff9f68, 0.82);
        fx.fillRect(
          renderX - healthWidth / 2 + healthWidth * health,
          renderY - 22,
          healthWidth * (vitals.trailHpRatio - health),
          2,
        );
      }
      fx.fillStyle(healthColor);
      fx.fillRect(
        renderX - healthWidth / 2,
        renderY - 22,
        healthWidth * health,
        2,
      );

      if (vitals.trailShieldRatio > 0.002) {
        fx.fillStyle(0x061519, 0.86);
        fx.fillRoundedRect(
          renderX - healthWidth / 2 - 1,
          renderY - 28,
          healthWidth + 2,
          3,
          1.5,
        );
        if (vitals.trailShieldRatio > vitals.shieldRatio + 0.002) {
          fx.fillStyle(0xa9dfff, 0.36);
          fx.fillRect(
            renderX - healthWidth / 2 + healthWidth * vitals.shieldRatio,
            renderY - 27,
            healthWidth *
              (vitals.trailShieldRatio - vitals.shieldRatio),
            1,
          );
        }
        if (vitals.shieldRatio > 0) {
          fx.fillStyle(0x9bdcff, 0.95);
          fx.fillRect(
            renderX - healthWidth / 2,
            renderY - 27,
            healthWidth * vitals.shieldRatio,
            1,
          );
        }
      }
      if (damageState.state !== "healthy" && u.hp > 0) {
        const damagePulse = this.reducedMotion
          ? 0.76
          : 0.66 +
            Math.sin(this.clock * 5.4 + u.id * 0.73) * 0.1;

        fx.lineStyle(
          1,
          0xffb36a,
          damageState.armorAlpha * damagePulse,
        );
        const scarY = renderY - 2;
        fx.lineBetween(
          renderX - size * 0.2,
          scarY - size * 0.12,
          renderX + size * 0.08,
          scarY + size * 0.04,
        );
        fx.lineBetween(
          renderX + size * 0.02,
          scarY + size * 0.02,
          renderX + size * 0.22,
          scarY - size * 0.13,
        );

        if (damageState.groundWidth > 0) {
          fx.fillStyle(
            0x45352f,
            damageState.intensity *
              (damageState.state === "critical" ? 0.2 : 0.1),
          );
          fx.fillEllipse(
            renderX + 2,
            renderY + 10,
            damageState.groundWidth,
            damageState.groundHeight,
          );
          fx.lineStyle(
            1,
            0xff8c54,
            damageState.intensity * 0.16,
          );
          fx.lineBetween(
            renderX - damageState.groundWidth * 0.28,
            renderY + 10,
            renderX + damageState.groundWidth * 0.32,
            renderY + 10,
          );
        }

        for (let spark = 0; spark < damageState.sparkCount; spark++) {
          const phaseOffset =
            this.clock * (7 + spark * 0.8) +
            u.id * 0.91 +
            spark * 1.73;
          const activeSpark =
            this.reducedMotion
              ? spark === 0
              : Math.sin(phaseOffset) > 0.35;
          if (!activeSpark) continue;

          const angle =
            -Math.PI * 0.72 +
            spark * 0.58 +
            Math.sin(u.id + spark) * 0.16;
          const startX =
            renderX +
            Math.cos(angle) *
              (size * 0.16 + spark * 0.8);
          const startY =
            renderY - 3 +
            Math.sin(angle) *
              (size * 0.12 + spark * 0.5);
          const reach =
            damageState.sparkReach *
            (0.58 + (spark % 3) * 0.2) *
            damageState.intensity;
          const endX =
            startX +
            Math.cos(angle) *
              reach;
          const endY =
            startY +
            Math.sin(angle) *
              reach -
            (this.reducedMotion ? 0 : spark * 0.45);
          fx.lineStyle(
            spark % 2 === 0 ? 1.4 : 1,
            spark % 2 === 0 ? 0xffd27a : 0xff8a5b,
            damageState.intensity *
              (damageState.state === "critical" ? 0.78 : 0.5),
          );
          fx.lineBetween(startX, startY, endX, endY);
          fx.fillStyle(
            0xffffff,
            damageState.intensity * 0.52,
          );
          fx.fillCircle(endX, endY, 1);
        }

        for (let puff = 0; puff < damageState.smokeCount; puff++) {
          const riseProgress = this.reducedMotion
            ? 0.45 + puff * 0.08
            : (this.clock * (0.42 + puff * 0.05) +
                u.id * 0.17 +
                puff * 0.23) %
              1;
          const side =
            Math.sin(u.id * 0.61 + puff * 2.1) *
            damageState.smokeSpread;
          const smokeX =
            renderX +
            side +
            (this.reducedMotion
              ? 0
              : Math.sin(
                    this.clock * 1.8 +
                      puff +
                      u.id * 0.3,
                  ) *
                  1.6);
          const smokeY =
            renderY -
            7 -
            riseProgress * damageState.smokeRise;
          const smokeSize =
            2.8 +
            riseProgress * 3.5 +
            (puff % 2) * 0.8;
          const smokeAlpha =
            damageState.intensity *
            (0.18 +
              (1 - riseProgress) * 0.16);
          fx.fillStyle(
            puff % 2 === 0 ? 0x53605d : 0x37413f,
            smokeAlpha,
          );
          fx.fillCircle(smokeX, smokeY, smokeSize);
        }
      }

      if (health <= 0.3 && u.hp > 0) {
        const danger = 0.55 + 0.4 * Math.sin(this.clock * 8 + u.id);
        fx.lineStyle(1.5, 0xff7b68, danger * 0.75);
        fx.strokeCircle(renderX, renderY - 1, size * 0.53);
        fx.fillStyle(0xffd18a, danger);
        this.polygon(
          fx,
          [
            [renderX, renderY - 31],
            [renderX + 3.5, renderY - 27],
            [renderX, renderY - 23],
            [renderX - 3.5, renderY - 27],
          ],
          0xffd18a,
          danger,
        );
      }
    }
    const livingUnitIds = new Set(s.units.map((unit) => unit.id));
    for (const id of this.unitVitals.keys())
      if (!livingUnitIds.has(id)) this.unitVitals.delete(id);

    this.syncCombatText(s.effects, s.units);
    const activeEffectCount = s.effects.length;
    for (const e of s.effects) {
      const presentation = effectPresentationBudget(
        e,
        activeEffectCount,
      );
      const progress = 1 - e.life / e.maxLife,
        alpha =
          Math.max(0, e.life / e.maxLife) *
          presentation.alphaScale;
      if (e.type === "frontline" && e.targetY !== undefined) {
        const teamColor = e.team === "player" ? MINT : CORAL;
        const fromY = e.y;
        const toY = e.targetY;
        const top = Math.min(fromY, toY);
        const height = Math.max(2, Math.abs(toY - fromY));
        const direction = Math.sign(toY - fromY) || 1;
        fx.fillStyle(teamColor, alpha * 0.055);
        fx.fillRoundedRect(e.x - 58, top, 116, height, 8);
        fx.lineStyle(2.5, teamColor, alpha * 0.9);
        fx.lineBetween(e.x - 58, toY, e.x + 58, toY);
        fx.lineStyle(1.2, 0xffffff, alpha * 0.55);
        fx.lineBetween(e.x - 52, fromY, e.x + 52, fromY);
        for (let i = 0; i < 5; i++) {
          const x = e.x - 40 + i * 20;
          const y = fromY + (toY - fromY) * (0.2 + progress * 0.6);
          const tipY = y + direction * 7;
          fx.lineStyle(1.8, teamColor, alpha * 0.82);
          fx.lineBetween(x - 4, y, x, tipY);
          fx.lineBetween(x + 4, y, x, tipY);
        }
        continue;
      }
      const color = e.team === "player" ? MINT : CORAL;
      if (!this.reactedEffects.has(e.id)) {
        this.reactedEffects.add(e.id);
        if (e.type === "death") {
          this.battleScars.push({
            id: e.id,
            x: e.x,
            y: e.y,
            createdAt: this.clock,
            duration: 7.5,
            radius: e.radius ?? 18,
            sourceCardId: e.sourceCardId,
          });
          if (this.battleScars.length > 16)
            this.battleScars.splice(0, this.battleScars.length - 16);
        }
        if (!this.reducedMotion) {
          if (e.type === "core-hit") {
            const weight = e.radius ?? 18;
            this.cameras.main.shake(
              80 + Math.round(weight * 2.8),
              Math.min(
                0.0042,
                (0.0016 + weight * 0.000075) *
                  presentation.cameraScale,
              ),
              true,
            );
          }
          else if (e.type === "death") {
            const size = e.radius ?? 18;
            const profile = impactProfile(e.sourceCardId);
            this.cameras.main.shake(
              90 + Math.round(size * (1.8 + profile.scale * 0.45)),
              Math.min(
                0.0036,
                (0.00125 +
                  size * 0.00005 * profile.scale) *
                  presentation.cameraScale,
              ),
              true,
            );
          } else if (e.type === "impact" && (e.radius ?? 0) >= 14) {
            const profile = impactProfile(e.sourceCardId);
            this.cameras.main.shake(
              50 + Math.round(profile.scale * 10),
              Math.min(
                0.0019,
                (0.00068 +
                  ((e.radius ?? 14) - 14) * 0.00016) *
                  profile.scale *
                  presentation.cameraScale,
              ),
              true,
            );
          }
        }
      }
      if (!presentation.visible) continue;
      if (e.targetX !== undefined && e.targetY !== undefined) {
        if (e.type === "repulsor-move") {
          const visual = repulsorDisplacementVisual(e);
          if (visual) {
            const dx = e.targetX - e.x;
            const dy = e.targetY - e.y;
            const travel = this.reducedMotion
              ? 1
              : visual.travelProgress;
            const centerX = e.x + dx * travel;
            const centerY = e.y + dy * travel;
            const repulsorColor = 0xc29aff;
            const bright = 0xf1e7ff;

            fx.lineStyle(
              visual.trailWidth,
              repulsorColor,
              visual.alpha * 0.08,
            );
            fx.lineBetween(
              e.x,
              e.y,
              e.targetX,
              e.targetY,
            );

            for (
              let streak = 0;
              streak < visual.streakCount;
              streak++
            ) {
              const centered =
                streak -
                (visual.streakCount - 1) / 2;
              const offset =
                centered *
                (visual.trailWidth /
                  Math.max(1, visual.streakCount - 1));
              const stagger =
                (streak % 2) * 0.08;
              const localTravel = this.reducedMotion
                ? 1
                : Math.max(
                    0,
                    Math.min(
                      1,
                      travel - stagger,
                    ),
                  );
              const headX =
                e.x +
                dx * localTravel +
                visual.px * offset;
              const headY =
                e.y +
                dy * localTravel +
                visual.py * offset;
              const tail =
                visual.shockLength *
                (0.62 +
                  (streak % 3) * 0.14);

              fx.lineStyle(
                streak % 2 === 0 ? 1.6 : 1,
                streak % 2 === 0 ? bright : repulsorColor,
                visual.alpha *
                  (0.5 +
                    (1 -
                      Math.abs(centered) /
                        Math.max(
                          1,
                          visual.streakCount,
                        )) *
                      0.24),
              );
              fx.lineBetween(
                headX -
                  visual.nx * tail,
                headY -
                  visual.ny * tail,
                headX,
                headY,
              );
            }

            fx.fillStyle(
              repulsorColor,
              visual.alpha * 0.08,
            );
            fx.fillEllipse(
              centerX,
              centerY,
              visual.trailWidth * 1.5,
              visual.trailWidth * 0.72,
            );

            const landingProgress =
              Math.max(
                0,
                Math.min(
                  1,
                  (visual.progress - 0.55) /
                    0.45,
                ),
              );
            if (landingProgress > 0) {
              const landingAlpha =
                visual.alpha *
                (0.45 +
                  landingProgress * 0.45);
              fx.lineStyle(
                2.2,
                repulsorColor,
                landingAlpha,
              );
              fx.strokeCircle(
                e.targetX,
                e.targetY,
                visual.landingRadius *
                  (0.72 +
                    landingProgress * 0.34),
              );

              fx.lineStyle(
                1.2,
                bright,
                landingAlpha * 0.72,
              );
              const tangent = visual.landingRadius * 0.62;
              fx.lineBetween(
                e.targetX -
                  visual.px * tangent -
                  visual.nx * 3,
                e.targetY -
                  visual.py * tangent -
                  visual.ny * 3,
                e.targetX +
                  visual.px * tangent -
                  visual.nx * 3,
                e.targetY +
                  visual.py * tangent -
                  visual.ny * 3,
              );

              for (const side of [-1, 1]) {
                const sx =
                  e.targetX +
                  visual.px *
                    side *
                    visual.landingRadius *
                    0.42;
                const sy =
                  e.targetY +
                  visual.py *
                    side *
                    visual.landingRadius *
                    0.42;
                fx.lineBetween(
                  sx,
                  sy,
                  sx -
                    visual.nx *
                      visual.shockLength *
                      0.7 +
                    visual.px * side * 3,
                  sy -
                    visual.ny *
                      visual.shockLength *
                      0.7 +
                    visual.py * side * 3,
                );
              }
            }
          }
        } else if (e.type === "heal") {
          const visual = healLinkVisual(e);
          if (visual) {
            const sourceMotion =
              e.sourceUnitId !== undefined
                ? this.unitMotion.get(e.sourceUnitId)
                : undefined;
            const targetMotion =
              e.targetUnitId !== undefined
                ? this.unitMotion.get(e.targetUnitId)
                : undefined;
            const sourcePoint =
              sourceMotion?.renderedFrame === this.renderFrame
                ? unitRenderPosition(sourceMotion.render)
                : { x: e.x, y: e.y };
            const targetPoint =
              targetMotion?.renderedFrame === this.renderFrame
                ? unitRenderPosition(targetMotion.render)
                : {
                    x: e.targetX ?? sourcePoint.x,
                    y: e.targetY ?? sourcePoint.y,
                  };
            const sourceX = sourcePoint.x;
            const sourceY = sourcePoint.y;
            const targetX = targetPoint.x;
            const targetY = targetPoint.y;
            const dx = targetX - sourceX;
            const dy = targetY - sourceY;
            const distance = Math.max(0.01, Math.hypot(dx, dy));
            const nx = dx / distance;
            const ny = dy / distance;
            const px = -ny;
            const py = nx;
            const healColor = e.team === "player" ? 0x78ffd0 : 0xffb58d;
            const pulse = this.reducedMotion
              ? 0.78
              : 0.66 + 0.26 * Math.sin(progress * Math.PI * 6);

            fx.lineStyle(
              3.4,
              healColor,
              visual.alpha * (0.08 + visual.intensity * 0.08),
            );
            fx.lineBetween(sourceX, sourceY, targetX, targetY);
            fx.lineStyle(1.2, 0xd8fff0, visual.alpha * 0.42);
            fx.lineBetween(sourceX, sourceY, targetX, targetY);

            fx.lineStyle(1.6, healColor, visual.alpha * 0.72);
            fx.strokeCircle(sourceX, sourceY, visual.sourceRadius);
            fx.lineStyle(1, 0xffffff, visual.alpha * 0.36);
            fx.strokeCircle(sourceX, sourceY, visual.sourceRadius + 3);
            fx.fillStyle(healColor, visual.alpha * 0.82);
            fx.fillCircle(sourceX, sourceY, 2.1);

            const targetRadius =
              visual.targetRadius +
              (this.reducedMotion
                ? 0
                : Math.sin(progress * Math.PI) * 3);
            fx.lineStyle(2.2, healColor, visual.alpha * (0.55 + pulse * 0.3));
            fx.strokeCircle(targetX, targetY, targetRadius);
            fx.lineStyle(1, 0xffffff, visual.alpha * 0.42);
            fx.strokeCircle(targetX, targetY, Math.max(4, targetRadius - 4));
            fx.fillStyle(0xd8ffe8, visual.alpha * pulse);
            fx.fillCircle(targetX, targetY, 3.2);

            if (!this.reducedMotion) {
              for (const packet of visual.packets) {
                const lateral =
                  Math.sin(packet.progress * Math.PI) *
                  packet.offset *
                  (4 + visual.intensity * 3);
                const packetX =
                  sourceX +
                  dx * packet.progress +
                  px * lateral;
                const packetY =
                  sourceY +
                  dy * packet.progress +
                  py * lateral;
                const tailX =
                  packetX - nx * (5 + visual.intensity * 3);
                const tailY =
                  packetY - ny * (5 + visual.intensity * 3);
                fx.lineStyle(
                  2.3,
                  healColor,
                  packet.alpha * 0.7,
                );
                fx.lineBetween(tailX, tailY, packetX, packetY);
                fx.fillStyle(0xffffff, packet.alpha);
                fx.fillCircle(
                  packetX,
                  packetY,
                  1.7 + visual.intensity,
                );
              }
            } else {
              for (const fraction of [0.33, 0.66]) {
                fx.fillStyle(healColor, visual.alpha * 0.65);
                fx.fillCircle(
                  sourceX + dx * fraction,
                  sourceY + dy * fraction,
                  2,
                );
              }
            }

            const crossRadius = visual.targetRadius + 5;
            fx.lineStyle(1.4, healColor, visual.alpha * 0.55);
            fx.lineBetween(
              targetX - 4,
              targetY - crossRadius,
              targetX + 4,
              targetY - crossRadius,
            );
            fx.lineBetween(
              targetX,
              targetY - crossRadius - 4,
              targetX,
              targetY - crossRadius + 4,
            );
          }
        } else {
          const source = e.sourceCardId ?? "generic";
          const sourceMotion =
            e.sourceUnitId !== undefined
              ? this.unitMotion.get(e.sourceUnitId)
              : undefined;
          const targetMotion =
            e.targetUnitId !== undefined
              ? this.unitMotion.get(e.targetUnitId)
              : undefined;
          const sourcePoint =
            sourceMotion?.renderedFrame === this.renderFrame
              ? unitRenderPosition(sourceMotion.render)
              : { x: e.x, y: e.y };
          const targetPoint =
            targetMotion?.renderedFrame === this.renderFrame
              ? unitRenderPosition(targetMotion.render)
              : { x: e.targetX, y: e.targetY };
          const sourceX = sourcePoint.x;
          const sourceY = sourcePoint.y;
          const targetX = targetPoint.x;
          const targetY = targetPoint.y;
          const dx = targetX - sourceX;
          const dy = targetY - sourceY;
          const distance = Math.max(0.01, Math.hypot(dx, dy));
          const nx = dx / distance;
          const ny = dy / distance;
          const px = -ny;
          const py = nx;
          const melee =
            source === "vanguard" ||
            source === "bulwark" ||
            source === "swarm" ||
            source === "breaker" ||
            source === "raider" ||
            source === "pioneer";

          if (melee) {
            const slash = Math.min(1, progress * 3.8);
            const centerX = targetX - nx * (8 - slash * 3);
            const centerY = targetY - ny * (8 - slash * 3);
            const reach = 6 + slash * 6;
            fx.lineStyle(source === "breaker" ? 3.4 : 2.6, color, alpha * 0.9);
            fx.lineBetween(
              centerX - px * reach - nx * 5,
              centerY - py * reach - ny * 5,
              centerX + px * reach + nx * 4,
              centerY + py * reach + ny * 4,
            );
            fx.lineStyle(1.2, 0xffffff, alpha * 0.58);
            fx.lineBetween(
              centerX - px * reach * 0.72,
              centerY - py * reach * 0.72,
              centerX + px * reach * 0.72,
              centerY + py * reach * 0.72,
            );
            if (source === "breaker") {
              fx.lineStyle(1.8, 0xffcf67, alpha * 0.74);
              fx.lineBetween(
                centerX - nx * 7 - px * 5,
                centerY - ny * 7 - py * 5,
                centerX + nx * 7 + px * 5,
                centerY + ny * 7 + py * 5,
              );
            }
          } else {
            const speed =
              source === "lancer"
                ? 3.25
                : source === "core-turret"
                  ? 3.05
                  : source === "ranger"
                    ? 2.8
                    : source === "sentinel"
                      ? 2.3
                      : source === "mortar"
                        ? 1.85
                        : 2.35;
            const travel = Math.min(1, progress * speed);
            const tailTravel = Math.max(
              0,
              travel -
                (source === "lancer"
                  ? 0.34
                  : source === "sentinel"
                    ? 0.14
                    : 0.2),
            );
            const arc =
              source === "mortar"
                ? Math.sin(Math.PI * travel) * Math.min(38, 18 + distance * 0.12)
                : 0;
            const tailArc =
              source === "mortar"
                ? Math.sin(Math.PI * tailTravel) *
                  Math.min(38, 18 + distance * 0.12)
                : 0;
            const x = sourceX + dx * travel;
            const y = sourceY + dy * travel - arc;
            const tailX = sourceX + dx * tailTravel;
            const tailY = sourceY + dy * tailTravel - tailArc;

            if (source === "lancer") {
              fx.lineStyle(4.4, color, alpha * 0.23);
              fx.lineBetween(tailX, tailY, x, y);
              fx.lineStyle(1.8, 0xffffff, alpha * 0.96);
              fx.lineBetween(tailX, tailY, x, y);
              fx.fillStyle(0xffffff, alpha);
              fx.fillCircle(x, y, 2.2);
              fx.fillStyle(color, alpha * 0.7);
              fx.fillCircle(x, y, 5.4);
            } else if (source === "mortar") {
              fx.lineStyle(1.6, 0xbfd3c9, alpha * 0.32);
              fx.lineBetween(tailX, tailY, x, y);
              fx.fillStyle(0x182d31, alpha);
              fx.fillCircle(x, y, 4.8);
              fx.lineStyle(1.6, 0xffc368, alpha * 0.86);
              fx.strokeCircle(x, y, 5.4);
              for (let i = 1; i <= 3; i++) {
                const smokeTravel = Math.max(0, travel - i * 0.045);
                const smokeArc =
                  Math.sin(Math.PI * smokeTravel) *
                  Math.min(38, 18 + distance * 0.12);
                fx.fillStyle(0xd6ddd5, alpha * (0.18 / i));
                fx.fillCircle(
                  sourceX + dx * smokeTravel,
                  sourceY + dy * smokeTravel - smokeArc,
                  2 + i,
                );
              }
            } else if (source === "disruptor") {
              const segments = 5;
              let lastX = tailX;
              let lastY = tailY;
              for (let i = 1; i <= segments; i++) {
                const t = tailTravel + (travel - tailTravel) * (i / segments);
                const jitter = (i % 2 ? 1 : -1) * 3.2 * alpha;
                const sx = sourceX + dx * t + px * jitter;
                const sy = sourceY + dy * t + py * jitter;
                fx.lineStyle(1.5, 0x88d5ff, alpha * 0.82);
                fx.lineBetween(lastX, lastY, sx, sy);
                lastX = sx;
                lastY = sy;
              }
              fx.fillStyle(0xbcecff, alpha);
              fx.fillCircle(x, y, 3.6);
              fx.lineStyle(1.4, color, alpha * 0.72);
              fx.strokeCircle(x, y, 6.4);
            } else if (source === "sentinel") {
              fx.lineStyle(5.2, color, alpha * 0.16);
              fx.lineBetween(tailX, tailY, x, y);
              fx.lineStyle(2.6, color, alpha * 0.8);
              fx.lineBetween(tailX, tailY, x, y);
              fx.fillStyle(0xffffff, alpha * 0.9);
              fx.fillCircle(x, y, 3.3);
              fx.lineStyle(1.4, 0xffffff, alpha * 0.5);
              fx.strokeCircle(x, y, 6.5);
            } else if (source === "core-turret") {
              fx.lineStyle(6.5, color, alpha * 0.13);
              fx.lineBetween(tailX, tailY, x, y);
              fx.lineStyle(2.2, 0xffffff, alpha * 0.88);
              fx.lineBetween(tailX, tailY, x, y);
              fx.fillStyle(color, alpha * 0.82);
              fx.fillCircle(x, y, 5.5);
            } else {
              fx.lineStyle(source === "ranger" ? 1.7 : 2.2, color, alpha * 0.85);
              fx.lineBetween(tailX, tailY, x, y);
              fx.fillStyle(0xffffff, alpha);
              fx.fillCircle(x, y, source === "ranger" ? 2 : 2.6);
              fx.fillStyle(color, alpha * 0.55);
              fx.fillCircle(x, y, source === "ranger" ? 3.8 : 4.5);
            }

            if (travel < 0.42 && source !== "mortar") {
              const muzzle = 1 - travel / 0.42;
              fx.fillStyle(0xffffff, alpha * muzzle * 0.72);
              fx.fillCircle(
                sourceX,
                sourceY,
                2.5 + muzzle * (source === "lancer" ? 3.8 : 2.2),
              );
              fx.lineStyle(1.4, color, alpha * muzzle * 0.8);
              for (let i = 0; i < 4; i++) {
                const angle = i * Math.PI * 0.5 + e.id * 0.31;
                fx.lineBetween(
                  sourceX + Math.cos(angle) * 3,
                  sourceY + Math.sin(angle) * 3,
                  sourceX + Math.cos(angle) * (6 + muzzle * 4),
                  sourceY + Math.sin(angle) * (6 + muzzle * 4),
                );
              }
            }

            if (source === "ranger" || source === "lancer" || source === "core-turret") {
              const lockAlpha = alpha * (0.2 + (1 - travel) * 0.45);
              const r = source === "lancer" ? 11 + travel * 3 : 8 + travel * 2;
              const arm = source === "lancer" ? 5 : 4;
              fx.lineStyle(1.2, color, lockAlpha);
              fx.lineBetween(targetX - r, targetY - r, targetX - r + arm, targetY - r);
              fx.lineBetween(targetX - r, targetY - r, targetX - r, targetY - r + arm);
              fx.lineBetween(targetX + r, targetY - r, targetX + r - arm, targetY - r);
              fx.lineBetween(targetX + r, targetY - r, targetX + r, targetY - r + arm);
              fx.lineBetween(targetX - r, targetY + r, targetX - r + arm, targetY + r);
              fx.lineBetween(targetX - r, targetY + r, targetX - r, targetY + r - arm);
              fx.lineBetween(targetX + r, targetY + r, targetX + r - arm, targetY + r);
              fx.lineBetween(targetX + r, targetY + r, targetX + r, targetY + r - arm);
            }

            if (travel > 0.86) {
              const impact = (travel - 0.86) / 0.14;
              const impactColor =
                source === "disruptor"
                  ? 0x88d5ff
                  : source === "mortar"
                    ? 0xffc368
                    : color;
              fx.lineStyle(
                source === "mortar" ? 2.4 : 1.4,
                impactColor,
                alpha * (1 - impact),
              );
              fx.strokeCircle(
                targetX,
                targetY,
                3 + impact * (source === "mortar" ? 13 : 9),
              );
            }
          }
        }
      } else {
        const radius =
          e.radius ??
          (e.type === "pulse" || e.type === "rally"
            ? 75
            : e.type === "capture" || e.type === "pioneer"
              ? 45
              : e.type === "breaker"
                ? 28
                : e.type === "death"
                  ? 15
                  : 23);
        const effectColor =
          e.type === "shield-hit" || e.type === "shield-break"
            ? e.team === "player"
              ? 0x9bdcff
              : 0xffb9a5
            : e.type === "stasis" || e.type === "stasis-hit"
              ? 0x88d5ff
              : e.type === "repulsor" || e.type === "repulsor-move"
              ? 0xc29aff
              : e.type === "breaker"
                ? 0xffcf67
                : e.type === "pioneer"
                  ? 0x75f0ad
                  : e.type === "heal" || e.type === "rally"
                    ? 0x66ffb0
                    : e.type === "pulse" || e.type === "blast"
                      ? 0xffc368
                      : color;
        if (e.type === "capture") {
          const secure = controlPointSecureVisual(e);
          if (secure) {
            const secureColor =
              e.team === "player" ? MINT : CORAL;
            const brightSecure = 0xfff2bf;
            const direction =
              e.team === "player" ? -1 : 1;
            const rotation = this.reducedMotion
              ? e.id * 0.1
              : e.id * 0.1 +
                secure.progress * 0.44;
            const travel = this.reducedMotion
              ? 0.58
              : (secure.progress * 2.15) % 1;

            fx.fillStyle(
              secureColor,
              secure.alpha * 0.055,
            );
            fx.fillCircle(
              e.x,
              e.y,
              secure.secureRadius,
            );

            fx.lineStyle(
              1.1,
              secureColor,
              secure.alpha * 0.34,
            );
            fx.strokeCircle(
              e.x,
              e.y,
              secure.boundaryRadius,
            );

            fx.lineStyle(
              3,
              brightSecure,
              secure.alpha * 0.9,
            );
            fx.strokeCircle(
              e.x,
              e.y,
              secure.secureRadius,
            );

            fx.lineStyle(
              1.5,
              secureColor,
              secure.alpha * 0.72,
            );
            fx.strokeCircle(
              e.x,
              e.y,
              secure.innerRadius,
            );

            for (
              let node = 0;
              node < secure.nodeCount;
              node++
            ) {
              const angle =
                rotation +
                (node * Math.PI * 2) /
                  secure.nodeCount;
              const tx = Math.cos(angle);
              const ty = Math.sin(angle);
              const px = -ty;
              const py = tx;
              const cx =
                e.x + tx * secure.nodeRadius;
              const cy =
                e.y + ty * secure.nodeRadius;
              const bracket =
                secure.lockReach *
                (0.78 + (node % 2) * 0.16);

              fx.fillStyle(
                node % 2 === 0
                  ? brightSecure
                  : secureColor,
                secure.alpha *
                  (node % 2 === 0 ? 0.84 : 0.62),
              );
              fx.fillCircle(
                cx,
                cy,
                node % 2 === 0 ? 2.2 : 1.6,
              );

              fx.lineStyle(
                1.2,
                secureColor,
                secure.alpha * 0.54,
              );
              fx.lineBetween(
                cx - tx * bracket,
                cy - ty * bracket,
                cx + px * bracket * 0.65,
                cy + py * bracket * 0.65,
              );
              fx.lineBetween(
                cx - tx * bracket,
                cy - ty * bracket,
                cx - px * bracket * 0.65,
                cy - py * bracket * 0.65,
              );
            }

            const spacing = 12;
            for (
              let chevron = 0;
              chevron < secure.chevronCount;
              chevron++
            ) {
              const offset =
                (chevron -
                  (secure.chevronCount - 1) / 2) *
                spacing;
              const cx = e.x + offset;
              const baseY =
                e.y -
                direction *
                  (7 + travel * 19);
              const tipY =
                baseY +
                direction * secure.chevronReach;
              const half =
                4 + (chevron === 1 ? 1.5 : 0);

              fx.lineStyle(
                chevron === 1 ? 2.2 : 1.35,
                chevron === 1
                  ? brightSecure
                  : secureColor,
                secure.alpha *
                  (chevron === 1 ? 0.82 : 0.58),
              );
              fx.lineBetween(
                cx - half,
                baseY - direction * 4,
                cx,
                tipY,
              );
              fx.lineBetween(
                cx + half,
                baseY - direction * 4,
                cx,
                tipY,
              );
            }

            const gateHalf = 15;
            const gateY =
              e.y + direction * 10;
            fx.lineStyle(
              1.4,
              brightSecure,
              secure.alpha * 0.58,
            );
            fx.lineBetween(
              e.x - gateHalf,
              gateY,
              e.x + gateHalf,
              gateY,
            );
            fx.lineBetween(
              e.x - gateHalf,
              gateY,
              e.x - gateHalf,
              gateY - direction * 8,
            );
            fx.lineBetween(
              e.x + gateHalf,
              gateY,
              e.x + gateHalf,
              gateY - direction * 8,
            );

            fx.fillStyle(
              brightSecure,
              secure.alpha * 0.78,
            );
            fx.fillCircle(e.x, e.y, 2.6);
            fx.lineStyle(
              1.2,
              secureColor,
              secure.alpha * 0.52,
            );
            fx.strokeCircle(e.x, e.y, 6.5);
          } else {
            fx.fillStyle(effectColor, alpha * 0.22);
            fx.fillCircle(
              e.x,
              e.y,
              5 + radius * progress,
            );
            fx.lineStyle(2, 0xfff2bf, alpha);
            fx.strokeCircle(
              e.x,
              e.y,
              3 + radius * progress * 0.65,
            );
          }
        }
        if (e.type === "blast") {
          const mortarBlast = mortarBlastVisual(e);
          if (mortarBlast) {
            const hot = 0xffd27a;
            const bright = 0xfff1c7;
            const soot = 0x5b4a3f;
            const baseAngle = mortarBlast.directional
              ? Math.atan2(mortarBlast.ny, mortarBlast.nx)
              : e.id * 0.19;
            const rotation = this.reducedMotion
              ? baseAngle
              : baseAngle + mortarBlast.progress * 0.22;

            fx.fillStyle(
              effectColor,
              mortarBlast.alpha * 0.08,
            );
            fx.fillCircle(
              e.x,
              e.y,
              mortarBlast.shockRadius,
            );

            fx.lineStyle(
              3.1,
              bright,
              mortarBlast.alpha * 0.9,
            );
            fx.strokeCircle(
              e.x,
              e.y,
              mortarBlast.shockRadius,
            );

            fx.lineStyle(
              1.6,
              hot,
              mortarBlast.alpha * 0.68,
            );
            fx.strokeCircle(
              e.x,
              e.y,
              mortarBlast.innerRadius,
            );

            fx.lineStyle(
              1,
              effectColor,
              mortarBlast.alpha * 0.38,
            );
            fx.strokeCircle(
              e.x,
              e.y,
              mortarBlast.radius,
            );

            const coreRadius =
              4.5 + mortarBlast.intensity * 3.5;
            fx.fillStyle(
              bright,
              mortarBlast.alpha * 0.88,
            );
            fx.fillCircle(
              e.x,
              e.y,
              coreRadius,
            );
            fx.fillStyle(
              soot,
              mortarBlast.alpha * 0.36,
            );
            fx.fillCircle(
              e.x,
              e.y,
              coreRadius * 1.8,
            );

            for (
              let debris = 0;
              debris < mortarBlast.debrisCount;
              debris++
            ) {
              const angle =
                rotation +
                (debris * Math.PI * 2) /
                  mortarBlast.debrisCount;
              const tx = Math.cos(angle);
              const ty = Math.sin(angle);
              const directionalBias =
                mortarBlast.directional
                  ? Math.max(
                      0.65,
                      1 +
                        (tx * mortarBlast.nx +
                          ty * mortarBlast.ny) *
                          0.28,
                    )
                  : 1;
              const inner =
                mortarBlast.innerRadius *
                (0.74 + (debris % 3) * 0.07);
              const outer =
                mortarBlast.shockRadius *
                (0.8 + (debris % 2) * 0.12) *
                directionalBias;
              const sx = e.x + tx * inner;
              const sy = e.y + ty * inner;
              const ex = e.x + tx * outer;
              const ey = e.y + ty * outer;
              const tangentX = -ty;
              const tangentY = tx;
              const chip =
                mortarBlast.debrisLength *
                (0.72 + (debris % 3) * 0.12);

              fx.lineStyle(
                debris % 3 === 0 ? 1.7 : 1.05,
                debris % 2 === 0 ? bright : hot,
                mortarBlast.alpha *
                  (debris % 3 === 0 ? 0.72 : 0.48),
              );
              fx.lineBetween(sx, sy, ex, ey);
              fx.lineBetween(
                ex - tangentX * chip * 0.45,
                ey - tangentY * chip * 0.45,
                ex + tangentX * chip * 0.45,
                ey + tangentY * chip * 0.45,
              );
            }

            if (mortarBlast.directional) {
              const recoil =
                8 + mortarBlast.intensity * 8;
              fx.lineStyle(
                1.25,
                bright,
                mortarBlast.alpha * 0.52,
              );
              fx.lineBetween(
                e.x - mortarBlast.nx * recoil,
                e.y - mortarBlast.ny * recoil,
                e.x + mortarBlast.nx * recoil * 0.55,
                e.y + mortarBlast.ny * recoil * 0.55,
              );
              fx.lineStyle(
                1,
                hot,
                mortarBlast.alpha * 0.4,
              );
              fx.lineBetween(
                e.x - mortarBlast.px * recoil * 0.7,
                e.y - mortarBlast.py * recoil * 0.7,
                e.x + mortarBlast.px * recoil * 0.7,
                e.y + mortarBlast.py * recoil * 0.7,
              );
            }
          } else {
            fx.fillStyle(effectColor, alpha * 0.22);
            fx.fillCircle(e.x, e.y, 5 + radius * progress);
            fx.lineStyle(2, 0xfff2bf, alpha);
            fx.strokeCircle(
              e.x,
              e.y,
              3 + radius * progress * 0.65,
            );
          }
        }
        if (e.type === "pulse") {
          const pulseVisual = pulseStrikeVisual(e);
          if (pulseVisual) {
            const strikeAlpha = pulseVisual.alpha;
            const bright = 0xfff6d2;
            const hot = 0xffd477;
            const rotation = this.reducedMotion
              ? e.id * 0.17
              : e.id * 0.17 + pulseVisual.progress * 0.72;

            fx.fillStyle(
              effectColor,
              strikeAlpha * 0.055,
            );
            fx.fillCircle(
              e.x,
              e.y,
              pulseVisual.shockRadius,
            );

            fx.lineStyle(
              3.2,
              bright,
              strikeAlpha * 0.9,
            );
            fx.strokeCircle(
              e.x,
              e.y,
              pulseVisual.shockRadius,
            );
            fx.lineStyle(
              1.6,
              hot,
              strikeAlpha * 0.68,
            );
            fx.strokeCircle(
              e.x,
              e.y,
              pulseVisual.secondaryRadius,
            );
            fx.lineStyle(
              1,
              effectColor,
              strikeAlpha * 0.48,
            );
            fx.strokeCircle(
              e.x,
              e.y,
              pulseVisual.radius,
            );

            fx.fillStyle(
              bright,
              strikeAlpha * 0.82,
            );
            fx.fillCircle(
              e.x,
              e.y,
              pulseVisual.coreRadius,
            );
            fx.fillStyle(
              effectColor,
              strikeAlpha * 0.34,
            );
            fx.fillCircle(
              e.x,
              e.y,
              pulseVisual.coreRadius * 2.1,
            );

            for (
              let spoke = 0;
              spoke < pulseVisual.spokeCount;
              spoke++
            ) {
              const angle =
                rotation +
                (spoke * Math.PI * 2) /
                  pulseVisual.spokeCount;
              const tx = Math.cos(angle);
              const ty = Math.sin(angle);
              const px = -ty;
              const py = tx;
              const inner =
                pulseVisual.spokeInner *
                (0.78 + (spoke % 2) * 0.12);
              const outer =
                pulseVisual.spokeOuter *
                (0.86 + (spoke % 3) * 0.07);
              const sx = e.x + tx * inner;
              const sy = e.y + ty * inner;
              const ex = e.x + tx * outer;
              const ey = e.y + ty * outer;

              fx.lineStyle(
                spoke % 2 === 0 ? 1.8 : 1.1,
                spoke % 2 === 0 ? bright : hot,
                strikeAlpha *
                  (spoke % 2 === 0 ? 0.7 : 0.46),
              );
              fx.lineBetween(sx, sy, ex, ey);
              fx.lineBetween(
                ex,
                ey,
                ex - tx * 6 + px * 3,
                ey - ty * 6 + py * 3,
              );
              fx.lineBetween(
                ex,
                ey,
                ex - tx * 6 - px * 3,
                ey - ty * 6 - py * 3,
              );
            }

            fx.lineStyle(
              1.25,
              bright,
              strikeAlpha * 0.56,
            );
            for (
              let arc = 0;
              arc < pulseVisual.arcCount;
              arc++
            ) {
              const angle =
                rotation * 1.4 +
                (arc * Math.PI * 2) /
                  pulseVisual.arcCount;
              const tangentX = -Math.sin(angle);
              const tangentY = Math.cos(angle);
              const radialX = Math.cos(angle);
              const radialY = Math.sin(angle);
              const arcRadius =
                pulseVisual.innerRadius *
                (0.82 + (arc % 2) * 0.2);
              const cx = e.x + radialX * arcRadius;
              const cy = e.y + radialY * arcRadius;
              const reach =
                4 +
                pulseVisual.intensity * 3;
              fx.lineBetween(
                cx - tangentX * reach,
                cy - tangentY * reach,
                cx + tangentX * reach,
                cy + tangentY * reach,
              );
            }

            if (!this.reducedMotion) {
              const flare =
                1 -
                Math.min(
                  1,
                  pulseVisual.progress / 0.24,
                );
              if (flare > 0) {
                fx.lineStyle(
                  2.2,
                  bright,
                  strikeAlpha * flare * 0.7,
                );
                fx.lineBetween(
                  e.x,
                  e.y - 34 - flare * 18,
                  e.x,
                  e.y + 34 + flare * 18,
                );
                fx.lineBetween(
                  e.x - 34 - flare * 18,
                  e.y,
                  e.x + 34 + flare * 18,
                  e.y,
                );
              }
            }
          }
        }
        if (e.type === "shield-hit" || e.type === "shield-break") {
          const visual = shieldImpactVisual(e);
          if (visual) {
            const targetMotion =
              e.targetUnitId !== undefined
                ? this.unitMotion.get(e.targetUnitId)
                : undefined;
            const targetPoint =
              targetMotion?.renderedFrame === this.renderFrame
                ? unitRenderPosition(targetMotion.render)
                : { x: e.x, y: e.y };
            const shieldX = targetPoint.x;
            const shieldY = targetPoint.y;
            const shieldColor =
              e.team === "player" ? 0x9bdcff : 0xffb9a5;
            const whiteAlpha =
              visual.alpha *
              (visual.mode === "break" ? 0.92 : 0.66);
            const shellRadius =
              visual.radius *
              (visual.mode === "break"
                ? 0.88 + visual.progress * 0.24
                : 0.86 + visual.progress * 0.12);
            const impactX =
              shieldX +
              (visual.directional ? visual.nx * shellRadius * 0.78 : 0);
            const impactY =
              shieldY +
              (visual.directional ? visual.ny * shellRadius * 0.78 : 0);

            fx.fillStyle(
              shieldColor,
              visual.alpha *
                (visual.mode === "break" ? 0.12 : 0.08),
            );
            this.polygon(
              fx,
              this.hex(shieldX, shieldY, shellRadius),
              shieldColor,
              visual.alpha *
                (visual.mode === "break" ? 0.12 : 0.08),
              shieldColor,
            );

            fx.lineStyle(
              visual.mode === "break" ? 2.8 : 2,
              shieldColor,
              visual.alpha * 0.94,
            );
            this.polygon(
              fx,
              this.hex(shieldX, shieldY, shellRadius),
              0x000000,
              0,
              shieldColor,
            );

            if (visual.directional) {
              const tangentX = -visual.ny;
              const tangentY = visual.nx;
              fx.fillStyle(0xffffff, whiteAlpha);
              fx.fillCircle(
                impactX,
                impactY,
                visual.mode === "break" ? 3.6 : 2.7,
              );
              fx.lineStyle(
                visual.mode === "break" ? 2 : 1.3,
                0xffffff,
                whiteAlpha * 0.82,
              );
              for (const spread of [-1, -0.34, 0.34, 1]) {
                const lateral =
                  spread *
                  (visual.mode === "break" ? 7 : 4.5);
                const sx = impactX + tangentX * lateral;
                const sy = impactY + tangentY * lateral;
                const inward =
                  visual.crackReach *
                  (0.72 + (1 - Math.abs(spread)) * 0.28);
                fx.lineBetween(
                  sx,
                  sy,
                  sx - visual.nx * inward + tangentX * spread * 2.2,
                  sy - visual.ny * inward + tangentY * spread * 2.2,
                );
              }
            } else {
              fx.lineStyle(1.4, 0xffffff, whiteAlpha * 0.72);
              for (let i = 0; i < 6; i++) {
                const a = i * Math.PI / 3 + e.id * 0.19;
                fx.lineBetween(
                  shieldX + Math.cos(a) * shellRadius * 0.72,
                  shieldY + Math.sin(a) * shellRadius * 0.72,
                  shieldX + Math.cos(a) * shellRadius * 0.28,
                  shieldY + Math.sin(a) * shellRadius * 0.28,
                );
              }
            }

            if (visual.mode === "break") {
              fx.lineStyle(1.3, 0xffffff, visual.alpha * 0.74);
              for (let i = 0; i < 8; i++) {
                const base =
                  (i * Math.PI * 2) / 8 +
                  e.id * 0.21;
                const directionalBias = visual.directional
                  ? Math.atan2(-visual.ny, -visual.nx)
                  : base;
                const a =
                  visual.directional
                    ? directionalBias +
                      (i - 3.5) * 0.23 +
                      Math.sin(base) * 0.1
                    : base;
                const inner = shellRadius * 0.76;
                const outer =
                  shellRadius +
                  visual.fragmentReach *
                    (0.46 + (i % 3) * 0.18);
                const sx = shieldX + Math.cos(a) * inner;
                const sy = shieldY + Math.sin(a) * inner;
                const ex = shieldX + Math.cos(a) * outer;
                const ey = shieldY + Math.sin(a) * outer;
                fx.lineBetween(sx, sy, ex, ey);
                fx.fillStyle(
                  i % 2 ? shieldColor : 0xffffff,
                  visual.alpha * 0.78,
                );
                fx.fillRect(ex - 1.5, ey - 1.5, 3, 3);
              }

              fx.lineStyle(1.6, shieldColor, visual.alpha * 0.52);
              fx.strokeCircle(
                shieldX,
                shieldY,
                shellRadius +
                  visual.progress * visual.fragmentReach * 0.55,
              );
            }
          }
        }

        if (e.type === "impact") {
          const profile = impactProfile(e.sourceCardId);
          const direction = impactDirectionVisual(e);
          const heavy = (e.radius ?? 0) >= 12;
          const impactRadius =
            (3 + (e.radius ?? 9) * progress) * profile.scale;
          const profileColor =
            profile.kind === "explosive"
              ? 0xffc368
              : profile.kind === "electric"
                ? 0x88d5ff
                : profile.kind === "breach"
                  ? 0xffcf67
                  : profile.kind === "pulse"
                    ? 0xffe29b
                    : effectColor;
          const contactX =
            e.x -
            (direction.active
              ? direction.nx * direction.contactOffset
              : 0);
          const contactY =
            e.y -
            (direction.active
              ? direction.ny * direction.contactOffset
              : 0);

          fx.fillStyle(
            0xffffff,
            alpha * (heavy ? 0.42 : 0.27) * Math.min(1.2, profile.scale),
          );
          fx.fillCircle(
            contactX,
            contactY,
            (2.7 + (heavy ? 1.7 : 0.7)) * Math.min(1.18, profile.scale),
          );
          fx.lineStyle(
            (heavy ? 2.1 : 1.45) * Math.min(1.28, profile.scale),
            profileColor,
            alpha * 0.92,
          );
          fx.strokeCircle(e.x, e.y, impactRadius);

          for (let i = 0; i < profile.rays; i++) {
            const angle =
              (i * Math.PI * 2) / profile.rays + e.id * 0.37;
            const radialX = Math.cos(angle);
            const radialY = Math.sin(angle);
            const biasedX =
              radialX * (1 - direction.bias) +
              direction.nx * direction.bias;
            const biasedY =
              radialY * (1 - direction.bias) +
              direction.ny * direction.bias;
            const length = Math.max(
              0.001,
              Math.hypot(biasedX, biasedY),
            );
            const nx = biasedX / length;
            const ny = biasedY / length;
            const inner = 4 + impactRadius * 0.42;
            const outer =
              inner +
              (heavy ? 8 : 5) *
                profile.scale *
                (1 - progress * 0.35) *
                (direction.active ? 1 + direction.bias * 0.2 : 1);
            fx.lineBetween(
              e.x + nx * inner,
              e.y + ny * inner,
              e.x + nx * outer,
              e.y + ny * outer,
            );
          }

          if (direction.active) {
            fx.lineStyle(
              heavy ? 2 : 1.25,
              0xffffff,
              alpha * 0.54 * direction.intensity,
            );
            fx.lineBetween(
              contactX,
              contactY,
              e.x + direction.nx * direction.wakeLength,
              e.y + direction.ny * direction.wakeLength,
            );
          }

          if (profile.kind === "precision") {
            fx.lineStyle(1.2, 0xffffff, alpha * 0.58);
            if (direction.active) {
              const reach = impactRadius + 4;
              fx.lineBetween(
                e.x - direction.nx * reach,
                e.y - direction.ny * reach,
                e.x + direction.nx * reach,
                e.y + direction.ny * reach,
              );
              fx.lineBetween(
                e.x - direction.px * 5,
                e.y - direction.py * 5,
                e.x + direction.px * 5,
                e.y + direction.py * 5,
              );
            } else {
              fx.lineBetween(e.x - impactRadius - 3, e.y, e.x - 3, e.y);
              fx.lineBetween(e.x + 3, e.y, e.x + impactRadius + 3, e.y);
              fx.lineBetween(e.x, e.y - impactRadius - 3, e.x, e.y - 3);
              fx.lineBetween(e.x, e.y + 3, e.x, e.y + impactRadius + 3);
            }
          } else if (profile.kind === "rail") {
            if (direction.active) {
              for (const ring of [
                { major: impactRadius * 1.4, minor: impactRadius * 0.41, width: 1.7, opacity: 0.65 },
                { major: impactRadius * 1.82, minor: impactRadius * 0.55, width: 1.1, opacity: 0.48 },
              ]) {
                fx.lineStyle(
                  ring.width,
                  ring === undefined ? 0xffffff : profileColor,
                  alpha * ring.opacity,
                );
                fx.beginPath();
                for (let k = 0; k <= 18; k++) {
                  const t = (k / 18) * Math.PI * 2;
                  const px =
                    e.x +
                    direction.nx * Math.cos(t) * ring.major +
                    direction.px * Math.sin(t) * ring.minor;
                  const py =
                    e.y +
                    direction.ny * Math.cos(t) * ring.major +
                    direction.py * Math.sin(t) * ring.minor;
                  if (k === 0) fx.moveTo(px, py);
                  else fx.lineTo(px, py);
                }
                fx.closePath();
                fx.strokePath();
              }
            } else {
              fx.lineStyle(1.7, 0xffffff, alpha * 0.65);
              fx.strokeEllipse(
                e.x,
                e.y,
                impactRadius * 2.15,
                impactRadius * 0.82,
              );
              fx.lineStyle(1.1, profileColor, alpha * 0.48);
              fx.strokeEllipse(
                e.x,
                e.y,
                impactRadius * 2.8,
                impactRadius * 1.1,
              );
            }
          } else if (profile.kind === "explosive") {
            fx.fillStyle(profileColor, alpha * 0.16);
            fx.fillCircle(e.x, e.y, impactRadius * 0.78);
            fx.lineStyle(1.4, 0xfff0c4, alpha * 0.55);
            fx.strokeCircle(e.x, e.y, impactRadius + 5);
            for (let i = 0; i < 6; i++) {
              const angle = i * Math.PI / 3 + e.id * 0.19;
              const radialX = Math.cos(angle);
              const radialY = Math.sin(angle);
              const debrisX =
                radialX * (1 - direction.bias * 0.75) +
                direction.nx * direction.bias * 0.75;
              const debrisY =
                radialY * (1 - direction.bias * 0.75) +
                direction.ny * direction.bias * 0.75;
              const length = Math.max(0.001, Math.hypot(debrisX, debrisY));
              const distance = impactRadius * (0.55 + progress * 0.55);
              fx.fillStyle(i % 2 ? 0xffc368 : 0xd3d7c9, alpha * 0.74);
              fx.fillRect(
                e.x + (debrisX / length) * distance - 1.5,
                e.y + (debrisY / length) * distance - 1.5,
                3,
                3,
              );
            }
          } else if (profile.kind === "electric") {
            let lastX =
              direction.active
                ? contactX
                : e.x + impactRadius;
            let lastY =
              direction.active
                ? contactY
                : e.y;
            for (let i = 1; i <= 8; i++) {
              const angle = (i * Math.PI * 2) / 8;
              const radialX = Math.cos(angle);
              const radialY = Math.sin(angle);
              const electricX =
                radialX * (1 - direction.bias * 0.5) +
                direction.nx * direction.bias * 0.5;
              const electricY =
                radialY * (1 - direction.bias * 0.5) +
                direction.ny * direction.bias * 0.5;
              const length = Math.max(
                0.001,
                Math.hypot(electricX, electricY),
              );
              const jitter = i % 2 ? 3 : -2;
              const x =
                e.x +
                (electricX / length) * (impactRadius + jitter);
              const y =
                e.y +
                (electricY / length) * (impactRadius + jitter);
              fx.lineStyle(1.4, 0xbcecff, alpha * 0.78);
              fx.lineBetween(lastX, lastY, x, y);
              lastX = x;
              lastY = y;
            }
          } else if (profile.kind === "heavy") {
            fx.lineStyle(2, profileColor, alpha * 0.52);
            fx.strokeCircle(e.x, e.y, impactRadius + 5);
            fx.lineStyle(1, 0xffffff, alpha * 0.36);
            fx.strokeCircle(e.x, e.y, impactRadius + 9);
            if (direction.active) {
              const bar = impactRadius * 0.85;
              fx.lineStyle(2.2, 0xffffff, alpha * 0.46);
              fx.lineBetween(
                e.x - direction.px * bar,
                e.y - direction.py * bar,
                e.x + direction.px * bar,
                e.y + direction.py * bar,
              );
            }
          } else if (profile.kind === "beam") {
            fx.lineStyle(2.2, 0xffffff, alpha * 0.7);
            fx.strokeCircle(e.x, e.y, impactRadius * 0.58);
            fx.fillStyle(profileColor, alpha * 0.2);
            fx.fillCircle(e.x, e.y, impactRadius * 0.45);
            if (direction.active) {
              fx.lineStyle(1.5, profileColor, alpha * 0.62);
              fx.lineBetween(
                e.x - direction.nx * impactRadius,
                e.y - direction.ny * impactRadius,
                e.x + direction.nx * impactRadius * 0.7,
                e.y + direction.ny * impactRadius * 0.7,
              );
            }
          } else if (profile.kind === "breach") {
            fx.lineStyle(2.2, 0xffcf67, alpha * 0.8);
            if (direction.active) {
              const slash = impactRadius * 0.88;
              fx.lineBetween(
                e.x - direction.px * slash - direction.nx * 3,
                e.y - direction.py * slash - direction.ny * 3,
                e.x + direction.px * slash + direction.nx * 4,
                e.y + direction.py * slash + direction.ny * 4,
              );
              fx.lineBetween(
                e.x - direction.nx * slash * 0.65,
                e.y - direction.ny * slash * 0.65,
                e.x + direction.nx * slash,
                e.y + direction.ny * slash,
              );
            } else {
              fx.lineBetween(
                e.x - impactRadius * 0.75,
                e.y - impactRadius * 0.75,
                e.x + impactRadius * 0.75,
                e.y + impactRadius * 0.75,
              );
              fx.lineBetween(
                e.x + impactRadius * 0.75,
                e.y - impactRadius * 0.75,
                e.x - impactRadius * 0.75,
                e.y + impactRadius * 0.75,
              );
            }
          } else if (profile.kind === "melee") {
            fx.lineStyle(1.8, profileColor, alpha * 0.62);
            if (direction.active) {
              const slash = impactRadius * 0.9;
              fx.lineBetween(
                e.x - direction.px * slash - direction.nx * 2,
                e.y - direction.py * slash - direction.ny * 2,
                e.x + direction.px * slash + direction.nx * 4,
                e.y + direction.py * slash + direction.ny * 4,
              );
            } else {
              fx.lineBetween(
                e.x - impactRadius * 0.85,
                e.y + impactRadius * 0.3,
                e.x + impactRadius * 0.5,
                e.y - impactRadius * 0.7,
              );
            }
          } else if (profile.kind === "pulse") {
            fx.lineStyle(1.5, 0xfff2bf, alpha * 0.6);
            fx.strokeCircle(e.x, e.y, impactRadius + 6 * progress);
          }

          if (heavy && profile.kind !== "heavy") {
            fx.lineStyle(1, 0xffffff, alpha * 0.38);
            fx.strokeCircle(e.x, e.y, impactRadius + 5);
          }
        }
        if (e.type === "commander") {
          const visual = commanderActivationVisual(e);
          if (visual) {
            const wave =
              visual.radius * (0.38 + visual.progress * 0.62);
            const commanderColor =
              visual.kind === "shield"
                ? 0x9bdcff
                : visual.kind === "tempo"
                  ? 0xffdf6b
                  : 0x7dffd1;
            const glow =
              this.reducedMotion
                ? 0.72
                : 0.58 +
                  Math.sin(
                    this.clock * (visual.kind === "tempo" ? 9 : 6) + e.id,
                  ) *
                    0.14;

            fx.fillStyle(
              commanderColor,
              visual.alpha * (visual.kind === "shield" ? 0.045 : 0.035),
            );
            fx.fillCircle(e.x, e.y, wave);

            if (visual.kind === "shield") {
              fx.lineStyle(3, commanderColor, visual.alpha * 0.9);
              this.polygon(
                fx,
                this.hex(e.x, e.y, wave),
                0x000000,
                0,
                commanderColor,
              );
              fx.lineStyle(1.5, 0xffffff, visual.alpha * 0.58);
              this.polygon(
                fx,
                this.hex(e.x, e.y, Math.max(14, wave - 9)),
                0x000000,
                0,
                0xffffff,
              );
              for (let i = 0; i < visual.spokes; i++) {
                const angle = i * Math.PI / 3 - Math.PI / 6;
                const inner = wave * 0.55;
                const outer = wave * (0.88 + glow * 0.08);
                fx.lineStyle(1.6, commanderColor, visual.alpha * 0.64);
                fx.lineBetween(
                  e.x + Math.cos(angle) * inner,
                  e.y + Math.sin(angle) * inner,
                  e.x + Math.cos(angle) * outer,
                  e.y + Math.sin(angle) * outer,
                );
              }
            } else if (visual.kind === "tempo") {
              const travel = this.reducedMotion
                ? 0.62
                : (visual.progress * 2.2) % 1;
              fx.lineStyle(2.5, commanderColor, visual.alpha * 0.9);
              for (let i = 0; i < visual.spokes; i++) {
                const column = (i % 4) - 1.5;
                const row = Math.floor(i / 4);
                const baseX = e.x + column * (wave * 0.28);
                const baseY =
                  e.y -
                  visual.direction *
                    (wave * (0.28 + row * 0.22 + travel * 0.22));
                const tipY = baseY + visual.direction * 11;
                fx.lineBetween(baseX - 6, baseY, baseX, tipY);
                fx.lineBetween(baseX + 6, baseY, baseX, tipY);
              }
              fx.lineStyle(1.5, 0xffffff, visual.alpha * 0.42);
              fx.lineBetween(
                e.x - wave * 0.72,
                e.y - visual.direction * wave * 0.12,
                e.x + wave * 0.72,
                e.y - visual.direction * wave * 0.12,
              );
              fx.lineStyle(2.2, commanderColor, visual.alpha * 0.7);
              fx.lineBetween(
                e.x - wave * 0.58,
                e.y + visual.direction * wave * 0.16,
                e.x + wave * 0.58,
                e.y + visual.direction * wave * 0.16,
              );
            } else {
              fx.lineStyle(2.5, commanderColor, visual.alpha * 0.88);
              fx.strokeCircle(e.x, e.y, wave);
              fx.lineStyle(1.3, 0xffffff, visual.alpha * 0.5);
              fx.strokeCircle(e.x, e.y, Math.max(10, wave * 0.66));
              const cross = Math.max(9, wave * 0.18);
              fx.fillStyle(0xe7fff5, visual.alpha * 0.86);
              fx.fillRect(e.x - 2.5, e.y - cross, 5, cross * 2);
              fx.fillRect(e.x - cross, e.y - 2.5, cross * 2, 5);
              for (let i = 0; i < visual.spokes; i++) {
                const base =
                  i * Math.PI * 0.5 +
                  (this.reducedMotion ? 0 : visual.progress * Math.PI * 0.8);
                const orbit = wave * 0.78;
                fx.fillStyle(commanderColor, visual.alpha * (0.62 + glow * 0.2));
                fx.fillCircle(
                  e.x + Math.cos(base) * orbit,
                  e.y + Math.sin(base) * orbit,
                  2.5,
                );
              }
            }

            fx.lineStyle(
              1.2,
              commanderColor,
              visual.alpha * (0.34 + glow * 0.24),
            );
            fx.strokeCircle(e.x, e.y, wave + 8);
          }
        }
        if (e.type === "spawn") {
          const arrival = deploymentArrivalVisual(e);
          if (arrival) {
            const remainingBeam =
              arrival.beamHeight *
              (1 - Math.min(1, arrival.progress * 1.45));
            const beamX = e.x - arrival.beamWidth / 2;

            fx.fillStyle(
              effectColor,
              arrival.alpha *
                (arrival.kind === "heavy" ? 0.11 : 0.08),
            );
            fx.fillRect(
              beamX,
              e.y - 8 - remainingBeam,
              arrival.beamWidth,
              remainingBeam + 8,
            );

            fx.lineStyle(
              arrival.kind === "siege" ? 1.8 : 1.4,
              0xffffff,
              arrival.alpha *
                (arrival.kind === "siege" ? 0.74 : 0.58),
            );
            const beamInset =
              Math.max(2.5, arrival.beamWidth * 0.26);
            fx.lineBetween(
              e.x - beamInset,
              e.y - 9 - remainingBeam,
              e.x - beamInset,
              e.y + 2,
            );
            fx.lineBetween(
              e.x + beamInset,
              e.y - 9 - remainingBeam,
              e.x + beamInset,
              e.y + 2,
            );

            fx.lineStyle(
              arrival.kind === "heavy" ? 3 : 2.1,
              effectColor,
              arrival.alpha * 0.92,
            );
            fx.strokeEllipse(
              e.x,
              e.y + 6,
              arrival.ringRadius * 1.55,
              arrival.ringRadius * 0.5,
            );
            fx.fillStyle(
              effectColor,
              arrival.alpha *
                (arrival.kind === "heavy" ? 0.22 : 0.15),
            );
            fx.fillEllipse(
              e.x,
              e.y + 6,
              arrival.ringRadius * 1.28,
              arrival.ringRadius * 0.39,
            );

            if (arrival.kind === "heavy") {
              fx.lineStyle(
                1.7,
                0xffe7b0,
                arrival.alpha * 0.62,
              );
              fx.strokeEllipse(
                e.x,
                e.y + 7,
                arrival.shockRadius * 2,
                arrival.shockRadius * 0.55,
              );
              for (let i = 0; i < arrival.rayCount; i++) {
                const angle =
                  i * (Math.PI * 2 / arrival.rayCount) +
                  e.id * 0.17;
                const sx =
                  e.x +
                  Math.cos(angle) *
                    arrival.ringRadius *
                    0.7;
                const sy =
                  e.y +
                  7 +
                  Math.sin(angle) *
                    arrival.ringRadius *
                    0.22;
                fx.lineBetween(
                  sx,
                  sy,
                  sx +
                    Math.cos(angle) *
                      (6 + arrival.progress * 7),
                  sy +
                    Math.sin(angle) *
                      (2 + arrival.progress * 3),
                );
              }
            } else if (arrival.kind === "siege") {
              fx.lineStyle(
                1.4,
                0xffffff,
                arrival.alpha * 0.62,
              );
              const r = arrival.shockRadius;
              const arm = 5;
              for (const sx of [-1, 1]) {
                for (const sy of [-1, 1]) {
                  const cx = e.x + sx * r;
                  const cy = e.y + sy * r * 0.48;
                  fx.lineBetween(cx, cy, cx - sx * arm, cy);
                  fx.lineBetween(cx, cy, cx, cy - sy * arm * 0.6);
                }
              }
              fx.lineStyle(
                1,
                effectColor,
                arrival.alpha * 0.48,
              );
              fx.strokeCircle(
                e.x,
                e.y,
                Math.max(
                  5,
                  arrival.shockRadius *
                    (0.48 + arrival.progress * 0.18),
                ),
              );
            } else if (arrival.kind === "swarm") {
              for (let i = 0; i < 3; i++) {
                const angle =
                  i * (Math.PI * 2 / 3) +
                  (this.reducedMotion
                    ? 0
                    : arrival.progress * Math.PI * 1.35);
                const orbit =
                  7 + arrival.progress * 9;
                fx.fillStyle(
                  i === 0 ? 0xffffff : effectColor,
                  arrival.alpha * 0.82,
                );
                fx.fillCircle(
                  e.x + Math.cos(angle) * orbit,
                  e.y +
                    Math.sin(angle) *
                      orbit *
                      0.45,
                  1.6 + arrival.progress,
                );
              }
            } else if (arrival.kind === "support") {
              const cross =
                5 + arrival.progress * 4;
              fx.fillStyle(
                0xd8fff0,
                arrival.alpha * 0.72,
              );
              fx.fillRect(
                e.x - 1.5,
                e.y - cross,
                3,
                cross * 2,
              );
              fx.fillRect(
                e.x - cross,
                e.y - 1.5,
                cross * 2,
                3,
              );
              fx.lineStyle(
                1,
                effectColor,
                arrival.alpha * 0.44,
              );
              fx.strokeCircle(
                e.x,
                e.y,
                arrival.shockRadius * 0.62,
              );
            } else {
              for (let i = 0; i < arrival.rayCount; i++) {
                const angle =
                  i *
                    (Math.PI * 2 / arrival.rayCount) +
                  Math.PI / 4;
                const inner =
                  arrival.ringRadius * 0.72;
                const outer = inner + 7;
                fx.lineBetween(
                  e.x + Math.cos(angle) * inner,
                  e.y +
                    6 +
                    Math.sin(angle) *
                      inner *
                      0.36,
                  e.x + Math.cos(angle) * outer,
                  e.y +
                    6 +
                    Math.sin(angle) *
                      outer *
                      0.36,
                );
              }
            }
          }
        }
        if (e.type === "heal") {
          const lyraRepair = lyraRepairVisual(e);
          if (lyraRepair) {
            const targetUnit =
              e.targetUnitId !== undefined
                ? s.units.find((unit) => unit.id === e.targetUnitId)
                : undefined;
            const targetPoint = targetUnit
              ? this.unitPresentationPoint(targetUnit, s.effects)
              : { x: e.x, y: e.y };
            const repairX = targetPoint.x;
            const repairY = targetPoint.y;
            const repairColor =
              e.team === "player" ? 0x78ffd0 : 0xffb58d;
            const brightRepair = 0xe9fff7;
            const cleanseColor = 0xa8e8ff;
            const rotation = this.reducedMotion
              ? e.id * 0.12
              : e.id * 0.12 +
                lyraRepair.progress * 0.62;

            fx.fillStyle(
              repairColor,
              lyraRepair.alpha * 0.05,
            );
            fx.fillCircle(
              repairX,
              repairY,
              lyraRepair.shellRadius,
            );

            fx.lineStyle(
              2.4,
              repairColor,
              lyraRepair.alpha * 0.9,
            );
            fx.strokeCircle(
              repairX,
              repairY,
              lyraRepair.shellRadius,
            );

            fx.lineStyle(
              1.2,
              brightRepair,
              lyraRepair.alpha * 0.58,
            );
            fx.strokeCircle(
              repairX,
              repairY,
              lyraRepair.innerRadius,
            );

            const cross = lyraRepair.crossSize;
            fx.fillStyle(
              brightRepair,
              lyraRepair.alpha *
                (0.68 + lyraRepair.healRatio * 0.22),
            );
            fx.fillRect(
              repairX - 2.1,
              repairY - cross,
              4.2,
              cross * 2,
            );
            fx.fillRect(
              repairX - cross,
              repairY - 2.1,
              cross * 2,
              4.2,
            );

            for (
              let node = 0;
              node < lyraRepair.nodeCount;
              node++
            ) {
              const angle =
                rotation +
                (node * Math.PI * 2) /
                  lyraRepair.nodeCount;
              const tx = Math.cos(angle);
              const ty = Math.sin(angle);
              const cx =
                repairX + tx * lyraRepair.nodeRadius;
              const cy =
                repairY + ty * lyraRepair.nodeRadius;

              fx.fillStyle(
                node % 2 === 0
                  ? brightRepair
                  : repairColor,
                lyraRepair.alpha *
                  (0.48 +
                    lyraRepair.healRatio * 0.28),
              );
              fx.fillCircle(
                cx,
                cy,
                1.5 + lyraRepair.healRatio * 1.1,
              );
              fx.lineStyle(
                1,
                repairColor,
                lyraRepair.alpha * 0.38,
              );
              fx.lineBetween(
                cx - tx * 4,
                cy - ty * 4,
                cx + tx * 2.5,
                cy + ty * 2.5,
              );
            }

            if (lyraRepair.cleanse) {
              fx.lineStyle(
                1.5,
                cleanseColor,
                lyraRepair.alpha * 0.72,
              );
              for (
                let arc = 0;
                arc < lyraRepair.cleanseArcCount;
                arc++
              ) {
                const angle =
                  rotation * 1.25 +
                  (arc * Math.PI * 2) /
                    lyraRepair.cleanseArcCount;
                const tx = Math.cos(angle);
                const ty = Math.sin(angle);
                const px = -ty;
                const py = tx;
                const inner =
                  lyraRepair.innerRadius + 1;
                const outer =
                  lyraRepair.shellRadius + 5;
                const sx = repairX + tx * inner;
                const sy = repairY + ty * inner;
                const ex = repairX + tx * outer;
                const ey = repairY + ty * outer;
                const sweep =
                  3.5 + lyraRepair.strength * 3;

                fx.lineBetween(
                  sx,
                  sy,
                  ex + px * sweep,
                  ey + py * sweep,
                );
              }

              fx.lineStyle(
                1,
                brightRepair,
                lyraRepair.alpha * 0.5,
              );
              fx.strokeCircle(
                repairX,
                repairY,
                lyraRepair.shellRadius + 7,
              );
            }

            for (
              let shard = 0;
              shard < lyraRepair.shardCount;
              shard++
            ) {
              const angle =
                e.id * 0.21 +
                (shard * Math.PI * 2) /
                  lyraRepair.shardCount;
              const tx = Math.cos(angle);
              const ty = Math.sin(angle);
              const travel = this.reducedMotion
                ? 0.52
                : (lyraRepair.progress +
                    (shard % 3) * 0.2) %
                  1;
              const radial =
                lyraRepair.shellRadius *
                  (0.64 + travel * 0.34);
              const cx = repairX + tx * radial;
              const cy = repairY + ty * radial;
              const length =
                2.5 + lyraRepair.strength * 2.5;

              fx.lineStyle(
                1,
                lyraRepair.cleanse && shard % 2 === 0
                  ? cleanseColor
                  : repairColor,
                lyraRepair.alpha *
                  (0.34 +
                    lyraRepair.strength * 0.22),
              );
              fx.lineBetween(
                cx - tx * length,
                cy - ty * length,
                cx + tx * length,
                cy + ty * length,
              );
            }
          } else {
            const lift = progress * 18;
            fx.fillStyle(effectColor, alpha);
            fx.fillRect(
              repairX - 2,
              repairY - 10 - lift,
              4,
              15,
            );
            fx.fillRect(
              repairX - 7,
              repairY - 5 - lift,
              14,
              4,
            );
          }
        }
        if (e.type === "core-hit") {
          const weight = e.radius ?? 18;
          const impactRadius = 7 + weight * (0.35 + progress * 0.75);
          fx.fillStyle(effectColor, alpha * (0.17 + weight / 190));
          fx.fillCircle(e.x, e.y, impactRadius);
          fx.lineStyle(2.2 + weight * 0.025, 0xfff4cf, alpha);
          fx.strokeCircle(e.x, e.y, impactRadius * 0.58);
          const rays = weight >= 24 ? 12 : weight >= 18 ? 10 : 8;
          for (let i = 0; i < rays; i++) {
            const angle = (i * Math.PI * 2) / rays + e.id * 0.11;
            fx.lineBetween(
              e.x + Math.cos(angle) * impactRadius * 0.4,
              e.y + Math.sin(angle) * impactRadius * 0.4,
              e.x + Math.cos(angle) * impactRadius,
              e.y + Math.sin(angle) * impactRadius,
            );
          }
          if (weight >= 22) {
            fx.lineStyle(1.4, effectColor, alpha * 0.62);
            fx.strokeCircle(
              e.x,
              e.y,
              impactRadius + 7 + progress * weight * 0.35,
            );
          }
        }
        if (e.type === "rally") {
          const rallyVisual = rallyCastVisual(e);
          if (rallyVisual) {
            const targetUnit =
              e.targetUnitId !== undefined
                ? s.units.find((unit) => unit.id === e.targetUnitId)
                : undefined;
            const targetPoint = targetUnit
              ? this.unitPresentationPoint(targetUnit, s.effects)
              : { x: e.x, y: e.y };
            const rallyX = targetPoint.x;
            const rallyY = targetPoint.y;
            const brightRally = 0xe8fff4;
            const softRally = 0xbfffe0;
            const direction = e.team === "player" ? -1 : 1;
            const rotation = this.reducedMotion
              ? e.id * 0.09
              : e.id * 0.09 + rallyVisual.progress * 0.52;
            const travel = this.reducedMotion
              ? 0.56
              : (rallyVisual.progress * 2.35) % 1;
            const tempoBoost = Math.max(
              rallyVisual.moveMultiplier - 1,
              rallyVisual.attackMultiplier - 1,
            );

            fx.fillStyle(
              effectColor,
              rallyVisual.alpha * 0.05,
            );
            fx.fillCircle(
              rallyX,
              rallyY,
              rallyVisual.outerRadius,
            );

            fx.lineStyle(
              1.15,
              effectColor,
              rallyVisual.alpha * 0.34,
            );
            fx.strokeCircle(
              rallyX,
              rallyY,
              rallyVisual.radius,
            );
            fx.lineStyle(
              2.6,
              effectColor,
              rallyVisual.alpha * 0.9,
            );
            fx.strokeCircle(
              rallyX,
              rallyY,
              rallyVisual.outerRadius,
            );
            fx.lineStyle(
              1.4,
              softRally,
              rallyVisual.alpha * 0.68,
            );
            fx.strokeCircle(
              rallyX,
              rallyY,
              rallyVisual.surgeRadius,
            );
            fx.lineStyle(
              1.1,
              brightRally,
              rallyVisual.alpha * 0.54,
            );
            fx.strokeCircle(
              rallyX,
              rallyY,
              rallyVisual.innerRadius,
            );

            for (
              let node = 0;
              node < rallyVisual.nodeCount;
              node++
            ) {
              const angle =
                rotation +
                (node * Math.PI * 2) /
                  rallyVisual.nodeCount;
              const nx = Math.cos(angle);
              const ny = Math.sin(angle);
              const cx =
                rallyX + nx * rallyVisual.nodeRadius;
              const cy =
                rallyY + ny * rallyVisual.nodeRadius;
              const tangentX = -ny;
              const tangentY = nx;
              const nodeSize =
                node % 2 === 0 ? 2.2 : 1.45;

              fx.fillStyle(
                node % 2 === 0
                  ? brightRally
                  : effectColor,
                rallyVisual.alpha *
                  (node % 2 === 0 ? 0.82 : 0.58),
              );
              fx.fillCircle(cx, cy, nodeSize);
              fx.lineStyle(
                1,
                softRally,
                rallyVisual.alpha * 0.4,
              );
              fx.lineBetween(
                cx - tangentX * (3.5 + tempoBoost * 4),
                cy - tangentY * (3.5 + tempoBoost * 4),
                cx + tangentX * (3.5 + tempoBoost * 4),
                cy + tangentY * (3.5 + tempoBoost * 4),
              );
            }

            const laneSpacing =
              rallyVisual.chevronSpread;
            for (let lane = 0; lane < 4; lane++) {
              const laneOffset =
                (lane - 1.5) * laneSpacing;
              const baseY =
                rallyY -
                direction *
                  (8 + travel * 27);
              const tipY =
                baseY +
                direction *
                  (9 + tempoBoost * 10);
              const halfWidth =
                4.5 + rallyVisual.intensity * 2.5;

              fx.lineStyle(
                lane === 1 || lane === 2 ? 2 : 1.3,
                lane % 2 === 0
                  ? brightRally
                  : softRally,
                rallyVisual.alpha *
                  (lane === 1 || lane === 2
                    ? 0.78
                    : 0.5),
              );
              fx.lineBetween(
                rallyX + laneOffset - halfWidth,
                baseY - direction * 4,
                rallyX + laneOffset,
                tipY,
              );
              fx.lineBetween(
                rallyX + laneOffset + halfWidth,
                baseY - direction * 4,
                rallyX + laneOffset,
                tipY,
              );
            }

            const cross = rallyVisual.crossSize;
            fx.fillStyle(
              brightRally,
              rallyVisual.alpha * 0.84,
            );
            fx.fillRect(
              rallyX - 2.2,
              rallyY - cross,
              4.4,
              cross * 2,
            );
            fx.fillRect(
              rallyX - cross,
              rallyY - 2.2,
              cross * 2,
              4.4,
            );

            const commandReach =
              14 + tempoBoost * 24;
            fx.lineStyle(
              1.35,
              effectColor,
              rallyVisual.alpha * 0.58,
            );
            fx.lineBetween(
              rallyX - commandReach,
              rallyY + direction * 14,
              rallyX + commandReach,
              rallyY + direction * 14,
            );
            fx.lineStyle(
              1,
              brightRally,
              rallyVisual.alpha * 0.42,
            );
            fx.lineBetween(
              rallyX - commandReach * 0.68,
              rallyY - direction * 14,
              rallyX + commandReach * 0.68,
              rallyY - direction * 14,
            );
          } else {
            const novaTempo = novaTempoActivationVisual(e);
            if (novaTempo) {
              const tempoColor = 0xffdf6b;
              const brightTempo = 0xfff4b3;
              const hotTempo = 0xffbd59;
              const direction =
                e.team === "player" ? -1 : 1;
              const rotation = this.reducedMotion
                ? e.id * 0.09
                : e.id * 0.09 +
                  novaTempo.progress * 0.46;
              const travel = this.reducedMotion
                ? 0.58
                : (novaTempo.progress * 2.5) % 1;

              fx.fillStyle(
                tempoColor,
                novaTempo.alpha * 0.05,
              );
              fx.fillCircle(
                rallyX,
                rallyY,
                novaTempo.shellRadius,
              );

              fx.lineStyle(
                2.5,
                tempoColor,
                novaTempo.alpha * 0.92,
              );
              fx.strokeCircle(
                rallyX,
                rallyY,
                novaTempo.shellRadius,
              );

              fx.lineStyle(
                1.25,
                brightTempo,
                novaTempo.alpha * 0.58,
              );
              fx.strokeCircle(
                rallyX,
                rallyY,
                novaTempo.surgeRadius,
              );

              for (
                let tick = 0;
                tick < novaTempo.tickCount;
                tick++
              ) {
                const angle =
                  rotation +
                  (tick * Math.PI * 2) /
                    novaTempo.tickCount;
                const tx = Math.cos(angle);
                const ty = Math.sin(angle);
                const inner =
                  novaTempo.shellRadius -
                  novaTempo.tickLength;
                const outer =
                  novaTempo.shellRadius +
                  (tick % 2 === 0 ? 2.5 : 0);

                fx.lineStyle(
                  tick % 2 === 0 ? 1.7 : 1,
                  tick % 2 === 0
                    ? brightTempo
                    : hotTempo,
                  novaTempo.alpha *
                    (tick % 2 === 0 ? 0.76 : 0.48),
                );
                fx.lineBetween(
                  rallyX + tx * inner,
                  rallyY + ty * inner,
                  rallyX + tx * outer,
                  rallyY + ty * outer,
                );
              }

              const spacing =
                novaTempo.unitRadius * 0.85 + 3;
              for (
                let chevron = 0;
                chevron < novaTempo.chevronCount;
                chevron++
              ) {
                const side =
                  chevron -
                  (novaTempo.chevronCount - 1) / 2;
                const cx =
                  rallyX + side * spacing;
                const baseY =
                  rallyY -
                  direction *
                    (4 + travel * 15);
                const tipY =
                  baseY +
                  direction *
                    novaTempo.chevronReach;
                const half =
                  3.4 + novaTempo.moveBoost * 5;

                fx.lineStyle(
                  Math.abs(side) < 0.6 ? 2.1 : 1.35,
                  chevron % 2 === 0
                    ? brightTempo
                    : tempoColor,
                  novaTempo.alpha *
                    (0.54 +
                      novaTempo.strength * 0.24),
                );
                fx.lineBetween(
                  cx - half,
                  baseY -
                    direction *
                      novaTempo.chevronReach *
                      0.55,
                  cx,
                  tipY,
                );
                fx.lineBetween(
                  cx + half,
                  baseY -
                    direction *
                      novaTempo.chevronReach *
                      0.55,
                  cx,
                  tipY,
                );
              }

              const bolt =
                5 + novaTempo.attackBoost * 10;
              fx.lineStyle(
                1.8,
                brightTempo,
                novaTempo.alpha * 0.74,
              );
              fx.lineBetween(
                rallyX - bolt * 0.2,
                rallyY - direction * bolt,
                rallyX + bolt * 0.38,
                rallyY - direction * 1.5,
              );
              fx.lineBetween(
                rallyX + bolt * 0.38,
                rallyY - direction * 1.5,
                rallyX - bolt * 0.12,
                rallyY + direction * bolt,
              );

              const lane =
                novaTempo.shellRadius * 0.72;
              fx.lineStyle(
                1,
                tempoColor,
                novaTempo.alpha * 0.42,
              );
              fx.lineBetween(
                rallyX - lane,
                rallyY + direction * 5,
                rallyX + lane,
                rallyY + direction * 5,
              );
            }
          }
        }
        if (e.type === "stasis") {
          const cast = stasisCastVisual(e);
          if (cast) {
            const slowColor = 0x88d5ff;
            const brightSlow = 0xe6f7ff;
            const deepSlow = 0x6fb9ff;
            const rotation = this.reducedMotion
              ? e.id * 0.08
              : e.id * 0.08 + cast.progress * 0.46;
            const counterRotation = this.reducedMotion
              ? -e.id * 0.05
              : -e.id * 0.05 - cast.progress * 0.3;

            fx.fillStyle(
              slowColor,
              cast.alpha * 0.045,
            );
            fx.fillCircle(
              e.x,
              e.y,
              cast.latticeRadius,
            );

            fx.lineStyle(
              1.1,
              slowColor,
              cast.alpha * 0.34,
            );
            fx.strokeCircle(
              e.x,
              e.y,
              cast.boundaryRadius,
            );

            fx.lineStyle(
              2.5,
              slowColor,
              cast.alpha * 0.92,
            );
            this.polygon(
              fx,
              this.hex(e.x, e.y, cast.latticeRadius),
              0x000000,
              0,
              slowColor,
            );

            fx.lineStyle(
              1.25,
              brightSlow,
              cast.alpha * 0.62,
            );
            fx.strokeCircle(
              e.x,
              e.y,
              cast.innerRadius,
            );

            for (
              let spoke = 0;
              spoke < cast.spokeCount;
              spoke++
            ) {
              const angle =
                rotation +
                (spoke * Math.PI * 2) /
                  cast.spokeCount;
              const tx = Math.cos(angle);
              const ty = Math.sin(angle);
              const inner =
                cast.innerRadius * 0.78;
              const outer =
                cast.latticeRadius * 0.86;

              fx.lineStyle(
                spoke % 2 === 0 ? 1.45 : 1,
                spoke % 2 === 0
                  ? brightSlow
                  : deepSlow,
                cast.alpha *
                  (spoke % 2 === 0 ? 0.62 : 0.44),
              );
              fx.lineBetween(
                e.x + tx * inner,
                e.y + ty * inner,
                e.x + tx * outer,
                e.y + ty * outer,
              );
            }

            for (
              let node = 0;
              node < cast.nodeCount;
              node++
            ) {
              const angle =
                counterRotation +
                (node * Math.PI * 2) /
                  cast.nodeCount;
              const tx = Math.cos(angle);
              const ty = Math.sin(angle);
              const px = -ty;
              const py = tx;
              const cx =
                e.x + tx * cast.nodeRadius;
              const cy =
                e.y + ty * cast.nodeRadius;

              fx.fillStyle(
                node % 2 === 0
                  ? brightSlow
                  : slowColor,
                cast.alpha *
                  (node % 2 === 0 ? 0.82 : 0.58),
              );
              fx.fillCircle(
                cx,
                cy,
                node % 2 === 0 ? 2.2 : 1.55,
              );

              fx.lineStyle(
                1.15,
                slowColor,
                cast.alpha * 0.5,
              );
              fx.lineBetween(
                cx - tx * cast.bracketReach,
                cy - ty * cast.bracketReach,
                cx + px * cast.bracketReach * 0.72,
                cy + py * cast.bracketReach * 0.72,
              );
              fx.lineBetween(
                cx - tx * cast.bracketReach,
                cy - ty * cast.bracketReach,
                cx - px * cast.bracketReach * 0.72,
                cy - py * cast.bracketReach * 0.72,
              );
            }

            const shardBase =
              cast.latticeRadius * 0.55;
            const shardTravel =
              cast.latticeRadius * 0.24;
            for (
              let shard = 0;
              shard < cast.shardCount;
              shard++
            ) {
              const angle =
                (shard * Math.PI * 2) /
                  cast.shardCount +
                e.id * 0.13;
              const stagger =
                (shard % 3) / 2;
              const radial =
                shardBase +
                shardTravel *
                  (this.reducedMotion
                    ? 0.45 + stagger * 0.2
                    : (cast.progress + stagger * 0.18) % 1);
              const tx = Math.cos(angle);
              const ty = Math.sin(angle);
              const px = -ty;
              const py = tx;
              const cx = e.x + tx * radial;
              const cy = e.y + ty * radial;
              const length =
                3 + cast.severity * 4;

              fx.lineStyle(
                shard % 3 === 0 ? 1.35 : 0.9,
                shard % 2 === 0
                  ? brightSlow
                  : deepSlow,
                cast.alpha *
                  (0.38 + cast.severity * 0.28),
              );
              fx.lineBetween(
                cx - px * length,
                cy - py * length,
                cx + px * length,
                cy + py * length,
              );
            }

            const seal =
              Math.max(
                8,
                cast.innerRadius * 0.58,
              );
            fx.lineStyle(
              1.25,
              brightSlow,
              cast.alpha * 0.48,
            );
            fx.lineBetween(
              e.x - seal,
              e.y,
              e.x + seal,
              e.y,
            );
            fx.lineBetween(
              e.x,
              e.y - seal,
              e.x,
              e.y + seal,
            );
          }
        }
        if (e.type === "stasis-hit") {
          const hit = stasisHitVisual(e);
          if (hit) {
            const targetMotion =
              e.targetUnitId !== undefined
                ? this.unitMotion.get(e.targetUnitId)
                : undefined;
            const targetPoint =
              targetMotion?.renderedFrame === this.renderFrame
                ? unitRenderPosition(targetMotion.render)
                : { x: e.x, y: e.y };
            const stasisX = targetPoint.x;
            const stasisY = targetPoint.y;
            const slowColor = 0x88d5ff;
            const brightSlow = 0xe6f7ff;
            const cageRotation = this.reducedMotion
              ? e.id * 0.11
              : e.id * 0.11 + hit.progress * 0.42;

            fx.fillStyle(
              slowColor,
              hit.alpha * 0.07,
            );
            this.polygon(
              fx,
              this.hex(stasisX, stasisY, hit.shellRadius),
              slowColor,
              hit.alpha * 0.07,
              slowColor,
            );
            fx.lineStyle(
              2.2,
              slowColor,
              hit.alpha * 0.9,
            );
            this.polygon(
              fx,
              this.hex(stasisX, stasisY, hit.shellRadius),
              0x000000,
              0,
              slowColor,
            );
            fx.lineStyle(
              1.2,
              brightSlow,
              hit.alpha * 0.72,
            );
            fx.strokeCircle(
              stasisX,
              stasisY,
              hit.innerRadius,
            );

            for (let corner = 0; corner < 4; corner++) {
              const angle =
                cageRotation +
                Math.PI / 4 +
                corner * (Math.PI / 2);
              const tx = Math.cos(angle);
              const ty = Math.sin(angle);
              const px = -ty;
              const py = tx;
              const cx =
                stasisX + tx * hit.shellRadius * 0.78;
              const cy =
                stasisY + ty * hit.shellRadius * 0.78;
              fx.lineStyle(
                1.4,
                corner % 2 === 0 ? brightSlow : slowColor,
                hit.alpha * 0.72,
              );
              fx.lineBetween(
                cx,
                cy,
                cx - tx * hit.bracketReach,
                cy - ty * hit.bracketReach,
              );
              fx.lineBetween(
                cx,
                cy,
                cx - px * hit.bracketReach,
                cy - py * hit.bracketReach,
              );
            }

            if (
              hit.directional &&
              Number.isFinite(e.sourceX) &&
              Number.isFinite(e.sourceY)
            ) {
              const sourceX = e.sourceX!;
              const sourceY = e.sourceY!;
              const dx = stasisX - sourceX;
              const dy = stasisY - sourceY;
              const packetX =
                sourceX + dx * hit.tetherProgress;
              const packetY =
                sourceY + dy * hit.tetherProgress;

              fx.lineStyle(
                1,
                slowColor,
                hit.alpha * 0.34,
              );
              fx.lineBetween(
                sourceX,
                sourceY,
                stasisX,
                stasisY,
              );

              if (!this.reducedMotion) {
                fx.fillStyle(
                  brightSlow,
                  hit.alpha * 0.9,
                );
                fx.fillCircle(
                  packetX,
                  packetY,
                  2.1 + hit.severity * 1.4,
                );
                fx.lineStyle(
                  1.2,
                  slowColor,
                  hit.alpha * 0.7,
                );
                fx.lineBetween(
                  packetX - hit.px * 4,
                  packetY - hit.py * 4,
                  packetX + hit.px * 4,
                  packetY + hit.py * 4,
                );
              }
            }

            fx.lineStyle(
              1.1,
              brightSlow,
              hit.alpha * 0.62,
            );
            for (
              let shard = 0;
              shard < hit.shardCount;
              shard++
            ) {
              const angle =
                cageRotation +
                (shard * Math.PI * 2) /
                  hit.shardCount;
              const inner =
                hit.innerRadius +
                (shard % 2) * 2;
              const outer =
                hit.shellRadius *
                (0.7 + (shard % 3) * 0.08);
              fx.lineBetween(
                stasisX + Math.cos(angle) * inner,
                stasisY + Math.sin(angle) * inner,
                stasisX + Math.cos(angle) * outer,
                stasisY + Math.sin(angle) * outer,
              );
            }
          }
        }
        if (e.type === "repulsor") {
          const cast = repulsorCastVisual(e);
          if (cast) {
            const brightPush = 0xfff2d4;
            const warmPush = 0xffcf80;
            const rotation = this.reducedMotion
              ? e.id * 0.07
              : e.id * 0.07 + cast.progress * 0.38;

            fx.fillStyle(
              effectColor,
              cast.alpha * 0.045,
            );
            fx.fillCircle(
              e.x,
              e.y,
              cast.waveRadius,
            );

            fx.lineStyle(
              1.1,
              effectColor,
              cast.alpha * 0.34,
            );
            fx.strokeCircle(
              e.x,
              e.y,
              cast.boundaryRadius,
            );

            fx.lineStyle(
              3,
              brightPush,
              cast.alpha * 0.9,
            );
            fx.strokeCircle(
              e.x,
              e.y,
              cast.waveRadius,
            );

            fx.lineStyle(
              1.4,
              warmPush,
              cast.alpha * 0.62,
            );
            fx.strokeCircle(
              e.x,
              e.y,
              Math.max(
                6,
                cast.waveRadius - cast.ringGap,
              ),
            );

            fx.lineStyle(
              1.1,
              effectColor,
              cast.alpha * 0.5,
            );
            fx.strokeCircle(
              e.x,
              e.y,
              cast.innerRadius,
            );

            for (
              let spoke = 0;
              spoke < cast.spokeCount;
              spoke++
            ) {
              const angle =
                rotation +
                (spoke * Math.PI * 2) /
                  cast.spokeCount;
              const tx = Math.cos(angle);
              const ty = Math.sin(angle);
              const px = -ty;
              const py = tx;
              const inner =
                cast.innerRadius * 0.9;
              const outer =
                cast.waveRadius * 0.9;
              const sx = e.x + tx * inner;
              const sy = e.y + ty * inner;
              const ex = e.x + tx * outer;
              const ey = e.y + ty * outer;
              const arrowLength =
                cast.arrowLength *
                (0.86 + (spoke % 2) * 0.12);
              const arrowWidth =
                cast.arrowWidth *
                (0.9 + (spoke % 3) * 0.08);

              fx.lineStyle(
                spoke % 2 === 0 ? 2 : 1.25,
                spoke % 2 === 0
                  ? brightPush
                  : warmPush,
                cast.alpha *
                  (spoke % 2 === 0 ? 0.78 : 0.54),
              );
              fx.lineBetween(sx, sy, ex, ey);
              fx.lineBetween(
                ex,
                ey,
                ex - tx * arrowLength + px * arrowWidth,
                ey - ty * arrowLength + py * arrowWidth,
              );
              fx.lineBetween(
                ex,
                ey,
                ex - tx * arrowLength - px * arrowWidth,
                ey - ty * arrowLength - py * arrowWidth,
              );
            }

            const pulse =
              this.reducedMotion
                ? 0.55
                : (cast.progress * 2.2) % 1;
            for (let ring = 0; ring < 3; ring++) {
              const local =
                (pulse + ring / 3) % 1;
              const r =
                cast.innerRadius +
                (cast.boundaryRadius - cast.innerRadius) *
                  local;
              fx.lineStyle(
                1,
                effectColor,
                cast.alpha *
                  (0.28 + (1 - local) * 0.3),
              );
              fx.strokeCircle(e.x, e.y, r);
            }

            const coreReach =
              7 + cast.strength * 5;
            fx.lineStyle(
              1.5,
              brightPush,
              cast.alpha * 0.58,
            );
            fx.lineBetween(
              e.x - coreReach,
              e.y,
              e.x + coreReach,
              e.y,
            );
            fx.lineBetween(
              e.x,
              e.y - coreReach,
              e.x,
              e.y + coreReach,
            );

            fx.fillStyle(
              brightPush,
              cast.alpha * 0.76,
            );
            fx.fillCircle(
              e.x,
              e.y,
              2.2 + cast.strength * 1.8,
            );
          }
        }
        if (e.type === "breaker") {
          const breakerVisual = breakerShieldVisual(e);
          if (breakerVisual) {
            const targetMotion =
              e.targetUnitId !== undefined
                ? this.unitMotion.get(e.targetUnitId)
                : undefined;
            const targetPoint =
              targetMotion?.renderedFrame === this.renderFrame
                ? unitRenderPosition(targetMotion.render)
                : { x: e.x, y: e.y };
            const breakerX = targetPoint.x;
            const breakerY = targetPoint.y;
            const wave =
              (7 + radius * progress) *
              breakerVisual.waveScale;
            fx.fillStyle(
              effectColor,
              alpha * (0.055 + breakerVisual.strength * 0.045),
            );
            this.polygon(
              fx,
              this.hex(breakerX, breakerY, wave),
              effectColor,
              alpha * (0.055 + breakerVisual.strength * 0.045),
              effectColor,
            );
            fx.lineStyle(
              2.1 + breakerVisual.strength * 0.8,
              effectColor,
              alpha * 0.95,
            );
            this.polygon(
              fx,
              this.hex(breakerX, breakerY, wave),
              0x000000,
              0,
              effectColor,
            );

            if (breakerVisual.directional) {
              const contactX =
                breakerX -
                breakerVisual.nx *
                  wave *
                  0.48;
              const contactY =
                breakerY -
                breakerVisual.ny *
                  wave *
                  0.48;
              const slash =
                breakerVisual.slashReach *
                (0.72 + progress * 0.28);
              const cross =
                breakerVisual.crossReach *
                (0.76 + progress * 0.24);

              fx.fillStyle(
                0xffffff,
                alpha *
                  (0.5 + breakerVisual.strength * 0.32),
              );
              fx.fillCircle(
                contactX,
                contactY,
                2 +
                  breakerVisual.strength * 1.8,
              );

              fx.lineStyle(
                2 +
                  breakerVisual.strength * 0.9,
                0xffffff,
                alpha * 0.8,
              );
              fx.lineBetween(
                contactX -
                  breakerVisual.px * slash -
                  breakerVisual.nx * 3,
                contactY -
                  breakerVisual.py * slash -
                  breakerVisual.ny * 3,
                contactX +
                  breakerVisual.px * slash +
                  breakerVisual.nx * 5,
                contactY +
                  breakerVisual.py * slash +
                  breakerVisual.ny * 5,
              );

              fx.lineStyle(
                1.5 +
                  breakerVisual.strength * 0.7,
                effectColor,
                alpha * 0.82,
              );
              fx.lineBetween(
                contactX -
                  breakerVisual.nx * cross,
                contactY -
                  breakerVisual.ny * cross,
                contactX +
                  breakerVisual.nx * cross,
                contactY +
                  breakerVisual.ny * cross,
              );

              fx.lineStyle(
                1.1,
                0xfff1bd,
                alpha *
                  (0.45 +
                    breakerVisual.strength * 0.3),
              );
              for (
                let fragment = 0;
                fragment <
                breakerVisual.fragmentCount;
                fragment++
              ) {
                const spread =
                  breakerVisual.fragmentCount <= 1
                    ? 0
                    : fragment /
                        (breakerVisual.fragmentCount - 1) -
                      0.5;
                const sx =
                  breakerX +
                  breakerVisual.px *
                    spread *
                    wave *
                    0.8;
                const sy =
                  breakerY +
                  breakerVisual.py *
                    spread *
                    wave *
                    0.8;
                const reach =
                  4 +
                  breakerVisual.strength * 7 +
                  (fragment % 2) * 2;
                fx.lineBetween(
                  sx,
                  sy,
                  sx +
                    breakerVisual.nx * reach +
                    breakerVisual.px *
                      spread *
                      3,
                  sy +
                    breakerVisual.ny * reach +
                    breakerVisual.py *
                      spread *
                      3,
                );
              }
            } else {
              fx.lineStyle(
                1.8,
                0xffffff,
                alpha * 0.72,
              );
              const slash = wave * 0.72;
              fx.lineBetween(
                breakerX - slash,
                breakerY - slash * 0.25,
                breakerX + slash,
                breakerY + slash * 0.25,
              );
              fx.lineBetween(
                breakerX - slash * 0.25,
                breakerY + slash,
                breakerX + slash * 0.25,
                breakerY - slash,
              );
            }
          }
        }
        if (e.type === "pioneer") {
          const pioneerVisual = pioneerCaptureVisual(e);
          if (pioneerVisual) {
            const secureColor = effectColor;
            const brightSecure = 0xe8fff1;
            const direction =
              e.team === "player" ? -1 : 1;
            const rotation = this.reducedMotion
              ? e.id * 0.09
              : e.id * 0.09 +
                pioneerVisual.progress * 0.38;

            fx.fillStyle(
              secureColor,
              pioneerVisual.alpha * 0.055,
            );
            fx.fillCircle(
              e.x,
              e.y,
              pioneerVisual.outerRadius,
            );

            fx.lineStyle(
              2.4,
              secureColor,
              pioneerVisual.alpha * 0.92,
            );
            fx.strokeCircle(
              e.x,
              e.y,
              pioneerVisual.outerRadius,
            );
            fx.lineStyle(
              1.3,
              brightSecure,
              pioneerVisual.alpha * 0.66,
            );
            fx.strokeCircle(
              e.x,
              e.y,
              pioneerVisual.innerRadius,
            );

            for (
              let node = 0;
              node < pioneerVisual.nodeCount;
              node++
            ) {
              const angle =
                rotation +
                (node * Math.PI * 2) /
                  pioneerVisual.nodeCount;
              const nx = Math.cos(angle);
              const ny = Math.sin(angle);
              const cx =
                e.x + nx * pioneerVisual.nodeRadius;
              const cy =
                e.y + ny * pioneerVisual.nodeRadius;

              fx.fillStyle(
                node % 2 === 0
                  ? brightSecure
                  : secureColor,
                pioneerVisual.alpha *
                  (node % 2 === 0 ? 0.86 : 0.62),
              );
              fx.fillCircle(
                cx,
                cy,
                node % 2 === 0 ? 2.1 : 1.5,
              );
              fx.lineStyle(
                1,
                secureColor,
                pioneerVisual.alpha * 0.42,
              );
              fx.lineBetween(
                cx - nx * 5,
                cy - ny * 5,
                cx + nx * 3,
                cy + ny * 3,
              );
            }

            const spacing = 12;
            for (
              let chevron = 0;
              chevron < pioneerVisual.chevronCount;
              chevron++
            ) {
              const offset =
                (chevron -
                  (pioneerVisual.chevronCount - 1) / 2) *
                spacing;
              const cx = e.x + offset;
              const baseY =
                e.y +
                direction *
                  (9 +
                    pioneerVisual.progress * 17);
              const reach =
                pioneerVisual.chevronReach *
                (0.82 +
                  (chevron % 2) * 0.12);
              fx.lineStyle(
                chevron ===
                  Math.floor(
                    pioneerVisual.chevronCount / 2,
                  )
                  ? 2.2
                  : 1.4,
                chevron % 2 === 0
                  ? brightSecure
                  : secureColor,
                pioneerVisual.alpha *
                  (0.55 +
                    pioneerVisual.bonus * 0.25),
              );
              fx.lineBetween(
                cx - reach * 0.5,
                baseY - direction * 5,
                cx,
                baseY,
              );
              fx.lineBetween(
                cx + reach * 0.5,
                baseY - direction * 5,
                cx,
                baseY,
              );
            }

            fx.lineStyle(
              1.2,
              brightSecure,
              pioneerVisual.alpha * 0.5,
            );
            const gateHalf =
              13 + pioneerVisual.bonus * 4;
            const gateY =
              e.y +
              direction *
                (18 +
                  pioneerVisual.progress * 9);
            fx.lineBetween(
              e.x - gateHalf,
              gateY,
              e.x + gateHalf,
              gateY,
            );
            fx.lineBetween(
              e.x - gateHalf,
              gateY,
              e.x - gateHalf,
              gateY - direction * 7,
            );
            fx.lineBetween(
              e.x + gateHalf,
              gateY,
              e.x + gateHalf,
              gateY - direction * 7,
            );
          }
        }
        if (e.type === "shield") {
          const atlasShield = atlasShieldVisual(e);
          if (atlasShield) {
            const targetUnit =
              e.targetUnitId !== undefined
                ? s.units.find((unit) => unit.id === e.targetUnitId)
                : undefined;
            const targetPoint = targetUnit
              ? this.unitPresentationPoint(targetUnit, s.effects)
              : { x: e.x, y: e.y };
            const shieldX = targetPoint.x;
            const shieldY = targetPoint.y;
            const shieldColor =
              e.team === "player" ? 0x9bdcff : 0xffb9a5;
            const brightShield = 0xf5fbff;
            const rotation = this.reducedMotion
              ? e.id * 0.08
              : e.id * 0.08 + atlasShield.progress * 0.34;

            fx.fillStyle(
              shieldColor,
              atlasShield.alpha * 0.055,
            );
            this.polygon(
              fx,
              this.hex(shieldX, shieldY, atlasShield.shellRadius),
              shieldColor,
              atlasShield.alpha * 0.055,
              shieldColor,
            );

            fx.lineStyle(
              atlasShield.refresh ? 1.9 : 2.7,
              shieldColor,
              atlasShield.alpha * 0.94,
            );
            this.polygon(
              fx,
              this.hex(shieldX, shieldY, atlasShield.shellRadius),
              0x000000,
              0,
              shieldColor,
            );

            fx.lineStyle(
              1.2,
              brightShield,
              atlasShield.alpha * 0.62,
            );
            this.polygon(
              fx,
              this.hex(shieldX, shieldY, atlasShield.innerRadius),
              0x000000,
              0,
              brightShield,
            );

            for (
              let plate = 0;
              plate < atlasShield.plateCount;
              plate++
            ) {
              const angle =
                rotation +
                (plate * Math.PI * 2) /
                  atlasShield.plateCount;
              const tx = Math.cos(angle);
              const ty = Math.sin(angle);
              const px = -ty;
              const py = tx;
              const cx =
                shieldX + tx * atlasShield.plateRadius;
              const cy =
                shieldY + ty * atlasShield.plateRadius;
              const tangent =
                4.5 + atlasShield.gainRatio * 2.5;

              fx.lineStyle(
                plate % 2 === 0 ? 1.8 : 1.25,
                plate % 2 === 0
                  ? brightShield
                  : shieldColor,
                atlasShield.alpha *
                  (plate % 2 === 0 ? 0.78 : 0.58),
              );
              fx.lineBetween(
                cx - px * tangent,
                cy - py * tangent,
                cx + px * tangent,
                cy + py * tangent,
              );
              fx.lineBetween(
                cx - px * tangent,
                cy - py * tangent,
                cx - tx * atlasShield.lockReach,
                cy - ty * atlasShield.lockReach,
              );
              fx.lineBetween(
                cx + px * tangent,
                cy + py * tangent,
                cx - tx * atlasShield.lockReach,
                cy - ty * atlasShield.lockReach,
              );
            }

            const sparkRadius =
              atlasShield.shellRadius + 4;
            for (
              let spark = 0;
              spark < atlasShield.sparkCount;
              spark++
            ) {
              const angle =
                e.id * 0.17 +
                (spark * Math.PI * 2) /
                  atlasShield.sparkCount;
              const travel = this.reducedMotion
                ? 0.55
                : (atlasShield.progress +
                    (spark % 3) * 0.19) %
                  1;
              const radial =
                sparkRadius +
                travel *
                  (3 + atlasShield.gainRatio * 5);
              const tx = Math.cos(angle);
              const ty = Math.sin(angle);
              const px = -ty;
              const py = tx;
              const length =
                2.5 + atlasShield.gainRatio * 2.5;
              const sx = shieldX + tx * radial;
              const sy = shieldY + ty * radial;

              fx.lineStyle(
                1,
                spark % 2 === 0
                  ? brightShield
                  : shieldColor,
                atlasShield.alpha *
                  (atlasShield.refresh ? 0.34 : 0.5),
              );
              fx.lineBetween(
                sx - px * length,
                sy - py * length,
                sx + px * length,
                sy + py * length,
              );
            }

            const diamond =
              5 + atlasShield.gainRatio * 2.5;
            fx.lineStyle(
              1.35,
              brightShield,
              atlasShield.alpha * 0.64,
            );
            fx.lineBetween(
              shieldX,
              shieldY - diamond,
              shieldX + diamond,
              shieldY,
            );
            fx.lineBetween(
              shieldX + diamond,
              shieldY,
              shieldX,
              shieldY + diamond,
            );
            fx.lineBetween(
              shieldX,
              shieldY + diamond,
              shieldX - diamond,
              shieldY,
            );
            fx.lineBetween(
              shieldX - diamond,
              shieldY,
              shieldX,
              shieldY - diamond,
            );

            if (atlasShield.refresh) {
              fx.lineStyle(
                1,
                shieldColor,
                atlasShield.alpha * 0.42,
              );
              fx.strokeCircle(
                shieldX,
                shieldY,
                atlasShield.shellRadius + 6,
              );
            }
          } else {
            const wave = 9 + radius * progress;
            fx.fillStyle(effectColor, alpha * 0.045);
            this.polygon(
              fx,
              this.hex(shieldX, shieldY, wave),
              effectColor,
              alpha * 0.045,
              effectColor,
            );
            fx.lineStyle(2, effectColor, alpha * 0.82);
            this.polygon(
              fx,
              this.hex(shieldX, shieldY, wave),
              0x000000,
              0,
              effectColor,
            );
            fx.lineStyle(1, 0xffffff, alpha * 0.38);
            this.polygon(
              fx,
              this.hex(shieldX, shieldY, Math.max(4, wave - 4)),
              0x000000,
              0,
              0xffffff,
            );
          }
        }
        if (
          e.type !== "pulse" &&
          e.type !== "rally" &&
          e.type !== "stasis" &&
          e.type !== "stasis-hit" &&
          e.type !== "repulsor" &&
          e.type !== "repulsor-move" &&
          e.type !== "breaker" &&
          e.type !== "pioneer" &&
          e.type !== "shield" &&
          e.type !== "shield-hit" &&
          e.type !== "shield-break" &&
          e.type !== "commander"
        ) {
          fx.lineStyle(2, effectColor, alpha);
          fx.strokeCircle(shieldX, shieldY, 5 + radius * progress);
        }
        if (e.type === "death") {
          const profile = impactProfile(e.sourceCardId);
          const direction = deathBurstDirection(e);
          const burst =
            radius *
            (0.38 + progress * 0.92) *
            Math.min(1.32, profile.scale);
          const fade = alpha * (1 - progress * 0.2);
          const deathAccent =
            profile.kind === "explosive"
              ? 0xffc368
              : profile.kind === "electric"
                ? 0x88d5ff
                : profile.kind === "breach"
                  ? 0xffcf67
                  : color;
          const centerX =
            e.x + (direction.active ? direction.nx * direction.offset : 0);
          const centerY =
            e.y + (direction.active ? direction.ny * direction.offset : 0);
          const tangentX = -direction.ny;
          const tangentY = direction.nx;

          fx.fillStyle(0xffffff, fade * 0.42);
          fx.fillCircle(
            centerX,
            centerY,
            4 + radius * 0.14 * (1 - progress),
          );
          fx.lineStyle(2.4, deathAccent, fade * 0.9);
          if (direction.active) {
            const major = (5 + burst) * direction.stretch;
            const minor = 5 + burst * 0.64;
            fx.beginPath();
            for (let k = 0; k <= 18; k++) {
              const t = (k / 18) * Math.PI * 2;
              const px =
                centerX +
                direction.nx * Math.cos(t) * major +
                tangentX * Math.sin(t) * minor;
              const py =
                centerY +
                direction.ny * Math.cos(t) * major +
                tangentY * Math.sin(t) * minor;
              if (k === 0) fx.moveTo(px, py);
              else fx.lineTo(px, py);
            }
            fx.closePath();
            fx.strokePath();
          } else {
            fx.strokeCircle(centerX, centerY, 5 + burst);
          }

          fx.lineStyle(1.2, 0xffe5ba, fade * 0.58);
          if (direction.active) {
            const groundMajor =
              (7 + burst * 0.775) * direction.stretch;
            const groundMinor = 2.5 + burst * 0.25;
            const groundX = centerX;
            const groundY = centerY + 7;
            fx.beginPath();
            for (let k = 0; k <= 18; k++) {
              const t = (k / 18) * Math.PI * 2;
              const px =
                groundX +
                direction.nx * Math.cos(t) * groundMajor +
                tangentX * Math.sin(t) * groundMinor;
              const py =
                groundY +
                direction.ny * Math.cos(t) * groundMajor +
                tangentY * Math.sin(t) * groundMinor;
              if (k === 0) fx.moveTo(px, py);
              else fx.lineTo(px, py);
            }
            fx.closePath();
            fx.strokePath();
          } else {
            fx.strokeEllipse(
              centerX,
              centerY + 7,
              14 + burst * 1.55,
              5 + burst * 0.5,
            );
          }

          for (let i = 0; i < profile.shards; i++) {
            const a =
              i * (Math.PI * 2 / profile.shards) + e.id * 0.47;
            const radialX = Math.cos(a);
            const radialY = Math.sin(a);
            const biasedX =
              radialX * (1 - direction.bias) +
              direction.nx * direction.bias;
            const biasedY =
              radialY * (1 - direction.bias) +
              direction.ny * direction.bias;
            const biasedLength = Math.max(
              0.001,
              Math.hypot(biasedX, biasedY),
            );
            const shardNx = biasedX / biasedLength;
            const shardNy = biasedY / biasedLength;
            const lateral =
              direction.active
                ? Math.sin(a - Math.atan2(direction.ny, direction.nx)) *
                  burst *
                  0.11 *
                  (1 - direction.bias)
                : 0;
            const distance =
              burst *
              (0.58 + (i % 3) * 0.12) *
              (direction.active
                ? 1 + direction.bias * (0.18 + (i % 2) * 0.12)
                : 1);
            const shard = 2.5 + (i % 2) * 1.8;
            const sx =
              centerX +
              shardNx * distance +
              tangentX * lateral;
            const sy =
              centerY +
              shardNy * distance * 0.78 +
              tangentY * lateral * 0.78 -
              progress * (i % 4) * 3;
            fx.fillStyle(
              i % 3 === 0 ? 0xffe5ba : deathAccent,
              fade,
            );
            fx.fillRect(
              sx - shard / 2,
              sy - shard / 2,
              shard,
              shard,
            );
            fx.lineStyle(1, deathAccent, fade * 0.55);
            fx.lineBetween(
              centerX + shardNx * burst * 0.24,
              centerY + shardNy * burst * 0.18,
              sx,
              sy,
            );
          }

          if (
            profile.kind === "explosive" ||
            profile.kind === "heavy" ||
            profile.kind === "rail"
          ) {
            fx.lineStyle(
              profile.kind === "explosive" ? 2.1 : 1.5,
              deathAccent,
              fade * 0.5,
            );
            if (direction.active) {
              const shockRadius = burst + 8 + profile.scale * 4;
              const major = shockRadius * direction.stretch;
              const minor = shockRadius * 0.75;
              fx.beginPath();
              for (let k = 0; k <= 20; k++) {
                const t = (k / 20) * Math.PI * 2;
                const px =
                  centerX +
                  direction.nx * Math.cos(t) * major +
                  tangentX * Math.sin(t) * minor;
                const py =
                  centerY +
                  direction.ny * Math.cos(t) * major +
                  tangentY * Math.sin(t) * minor;
                if (k === 0) fx.moveTo(px, py);
                else fx.lineTo(px, py);
              }
              fx.closePath();
              fx.strokePath();
            } else {
              fx.strokeCircle(
                centerX,
                centerY,
                burst + 8 + profile.scale * 4,
              );
            }
          } else if (profile.kind === "electric") {
            fx.lineStyle(1.4, 0xbcecff, fade * 0.62);
            for (let i = 0; i < 6; i++) {
              const a = i * Math.PI / 3 + e.id * 0.23;
              const radialX = Math.cos(a);
              const radialY = Math.sin(a);
              const biasedX =
                radialX * (1 - direction.bias * 0.72) +
                direction.nx * direction.bias * 0.72;
              const biasedY =
                radialY * (1 - direction.bias * 0.72) +
                direction.ny * direction.bias * 0.72;
              const length = Math.max(0.001, Math.hypot(biasedX, biasedY));
              const nx = biasedX / length;
              const ny = biasedY / length;
              fx.lineBetween(
                centerX + nx * burst * 0.4,
                centerY + ny * burst * 0.4,
                centerX + nx * (burst + 8),
                centerY + ny * (burst + 8),
              );
            }
          }
        }
      }
    }
    for (const ghost of this.deploymentGhosts) ghost.setVisible(false);
    this.aimLabel.setVisible(false);
    const selected = this.bridge.selected();
    if (selected && this.pointer && this.bridge.running()) {
      const card = CARDS.find((c) => c.id === selected)!;
      const { x, y } = this.pointer;
      const validation = m.validatePlay("player", selected, x, y);
      const valid = validation.ok;
      const abilityTargets =
        card.kind === "ability"
          ? abilityTargetPreview(m.state, "player", card.id, x, y)
          : null;
      const deployment =
        card.kind === "unit"
          ? m.deploymentPreview("player", card.id, x, y)
          : [];
      const adjustedDeployment = deployment.filter(
        (point) => point.adjusted,
      ).length;
      const affectedUnits = abilityTargets?.unitIds.length ?? 0;
      const affectedCount = affectedUnits + (abilityTargets?.core ? 1 : 0);
      const targetSummary = abilityTargets?.core
        ? affectedUnits
          ? `${affectedUnits} ${affectedUnits === 1 ? "TRUPPE" : "TRUPPEN"} + KERN`
          : "KERN"
        : affectedUnits
          ? `${affectedUnits} ${affectedUnits === 1 ? "TRUPPE" : "TRUPPEN"}`
          : "0 ZIELE";
      const lethalUnits = abilityTargets?.lethalUnitIds.length ?? 0;
      const pulseHpDamage =
        abilityTargets?.damage.reduce(
          (sum, result) => sum + result.hpDamage,
          0,
        ) ?? 0;
      const pulseShieldDamage =
        abilityTargets?.damage.reduce(
          (sum, result) => sum + result.shieldDamage,
          0,
        ) ?? 0;
      const totalHealing =
        abilityTargets?.healing.reduce(
          (sum, healing) => sum + healing.amount,
          0,
        ) ?? 0;
      const tempoUnits = abilityTargets?.tempoUnitIds.length ?? 0;
      const rallyWasted =
        card.id === "rally" &&
        affectedUnits > 0 &&
        totalHealing === 0 &&
        tempoUnits === 0;
      const stasisWasted =
        card.id === "stasis" &&
        affectedUnits > 0 &&
        (abilityTargets?.slows.every((slow) => !slow.changed) ?? false);
      const movedUnits =
        abilityTargets?.movements.filter((movement) => movement.changed)
          .length ?? 0;
      const clampedMoves =
        abilityTargets?.movements.filter(
          (movement) => movement.changed && movement.clamped,
        ).length ?? 0;
      const blockedMoves =
        abilityTargets?.movements.filter((movement) => !movement.changed)
          .length ?? 0;
      const repulsorWasted =
        card.id === "repulsor" &&
        affectedUnits > 0 &&
        movedUnits === 0;
      const outcomeSummary =
        card.id === "pulse"
          ? [
              pulseShieldDamage
                ? `-${pulseShieldDamage} SCHILD`
                : "",
              pulseHpDamage ? `-${pulseHpDamage} HP` : "",
              lethalUnits ? `${lethalUnits} K.O.` : "",
              abilityTargets?.coreLethal ? "KERNBRUCH" : "",
            ]
              .filter(Boolean)
              .join(" · ")
          : card.id === "rally"
            ? [
                totalHealing ? `+${totalHealing} HP` : "",
                tempoUnits ? `TEMPO ${tempoUnits}` : "",
                rallyWasted ? "KEIN BONUS" : "",
              ]
                .filter(Boolean)
                .join(" · ")
            : card.id === "stasis"
              ? [
                  abilityTargets?.slows.filter((slow) => slow.changed).length
                    ? `WIRKSAM ${abilityTargets.slows.filter((slow) => slow.changed).length}`
                    : "",
                  abilityTargets?.slows.filter((slow) => !slow.changed).length
                    ? `BEREITS VOLL ${abilityTargets.slows.filter((slow) => !slow.changed).length}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" · ")
              : card.id === "repulsor"
                ? [
                    movedUnits ? `VERSCHOBEN ${movedUnits}` : "",
                    clampedMoves ? `GEKÜRZT ${clampedMoves}` : "",
                    blockedMoves ? `BLOCKIERT ${blockedMoves}` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "";
      if (this.aim) {
        const actionText =
          card.kind === "ability"
            ? `LOSLASSEN ZUM WIRKEN · ${targetSummary}${outcomeSummary ? ` · ${outcomeSummary}` : ""}`
            : [
                "LOSLASSEN ZUM EINSETZEN",
                deployment.length > 1
                  ? `${deployment.length} EINHEITEN`
                  : "",
                adjustedDeployment
                  ? `FORMATION ANGEPASST ${adjustedDeployment}`
                  : "",
              ]
                .filter(Boolean)
                .join(" · ");
        this.aimLabel
          .setText(valid ? actionText : validation.message)
          .setColor(
            valid
              ? (card.kind === "ability" &&
                  (affectedCount === 0 ||
                    rallyWasted ||
                    stasisWasted ||
                    repulsorWasted)) ||
                (card.kind === "unit" && adjustedDeployment > 0)
                ? "#ffd37a"
                : "#83ffcf"
              : "#ff927c",
          )
          .setPosition(
            Math.max(145, Math.min(275, x)),
            y < 115 ? y + 70 : y - 65,
          )
          .setVisible(true);
        if (card.kind === "unit") {
          const size =
            card.id === "bulwark" ? 45 : card.id === "swarm" ? 28 : 36;
          deployment.forEach((point, index) => {
            const ghost = this.deploymentGhosts[index];
            if (!ghost) return;
            ghost
              .setTexture(`${card.id}-player`)
              .setPosition(point.x, point.y - 3)
              .setDisplaySize(size, size)
              .setAlpha(point.adjusted ? 0.48 : 0.55)
              .setTint(
                valid ? (point.adjusted ? NEUTRAL : MINT) : CORAL,
              )
              .setVisible(true);
          });
        }
      }
      const previewColor = valid ? MINT : CORAL;
      if (card.kind === "unit") {
        const attackRange = Math.max(18, card.range ?? 18);
        for (const point of deployment) {
          fx.fillStyle(previewColor, valid ? 0.025 : 0.018);
          fx.fillCircle(point.x, point.y, attackRange);
          fx.lineStyle(1, previewColor, valid ? 0.22 : 0.16);
          fx.strokeCircle(point.x, point.y, attackRange);
          if (attackRange >= 55) {
            for (let i = 0; i < 8; i++) {
              const angle = i * Math.PI * 0.25 + this.clock * 0.18;
              const inner = attackRange - 3;
              const outer = attackRange + 3;
              fx.lineBetween(
                point.x + Math.cos(angle) * inner,
                point.y + Math.sin(angle) * inner,
                point.x + Math.cos(angle) * outer,
                point.y + Math.sin(angle) * outer,
              );
            }
          }
          fx.lineStyle(1.8, previewColor, 0.72);
          fx.strokeCircle(point.x, point.y, 19);
          if (point.adjusted) {
            fx.lineStyle(1.5, 0xffd37a, 0.72);
            fx.strokeCircle(point.idealX, point.idealY, 10);
            fx.lineBetween(
              point.idealX,
              point.idealY,
              point.x,
              point.y,
            );
            const dx = point.x - point.idealX;
            const dy = point.y - point.idealY;
            const travel = Math.hypot(dx, dy);
            if (travel > 1) {
              const ux = dx / travel;
              const uy = dy / travel;
              const px = -uy;
              const py = ux;
              const arrowX = point.x - ux * 11;
              const arrowY = point.y - uy * 11;
              fx.lineBetween(
                point.x,
                point.y,
                arrowX + px * 5,
                arrowY + py * 5,
              );
              fx.lineBetween(
                point.x,
                point.y,
                arrowX - px * 5,
                arrowY - py * 5,
              );
            }
          }
        }
      } else {
        fx.fillStyle(previewColor, valid ? 0.045 : 0.025);
        fx.fillCircle(x, y, card.range ?? 65);
        fx.lineStyle(1.5, previewColor, 0.68);
        fx.strokeCircle(x, y, card.range ?? 65);

        const targetColor =
          card.id === "rally"
            ? 0xffdf6b
            : card.id === "stasis"
              ? 0x88d5ff
              : card.id === "repulsor"
                ? 0xc29aff
                : 0xffc368;
        for (const id of abilityTargets?.unitIds ?? []) {
          const target = s.units.find((unit) => unit.id === id);
          if (!target) continue;
          const targetMotion = this.unitMotion.get(target.id);
          const targetPoint =
            targetMotion?.renderedFrame === this.renderFrame
              ? unitRenderPosition(targetMotion.render)
              : { x: target.x, y: target.y };
          const targetX = targetPoint.x;
          const targetY = targetPoint.y;
          const pulse = 0.75 + 0.2 * Math.sin(this.clock * 6 + target.id);
          fx.lineStyle(2.2, targetColor, pulse);
          fx.strokeCircle(targetX, targetY, target.radius + 9);
          fx.lineStyle(1, 0xffffff, pulse * 0.55);
          fx.strokeCircle(targetX, targetY, target.radius + 13);
          const damage = abilityTargets?.damage.find(
            (result) => result.unitId === target.id,
          );
          if (damage?.shieldDamage) {
            const mark = target.radius + 16;
            fx.lineStyle(1.5, 0x88d5ff, 0.82);
            fx.arc(
              targetX,
              targetY,
              mark,
              Math.PI * 1.08,
              Math.PI * 1.92,
              false,
            );
            fx.strokePath();
          }
          if (abilityTargets?.lethalUnitIds.includes(target.id)) {
            const mark = target.radius + 16;
            fx.lineStyle(2, CORAL, 0.9);
            fx.lineBetween(
              targetX - mark * 0.45,
              targetY - mark * 0.45,
              targetX + mark * 0.45,
              targetY + mark * 0.45,
            );
            fx.lineBetween(
              targetX + mark * 0.45,
              targetY - mark * 0.45,
              targetX - mark * 0.45,
              targetY + mark * 0.45,
            );
          }
          const healing = abilityTargets?.healing.find(
            (result) => result.unitId === target.id,
          );
          if (healing) {
            const mark = target.radius + 17;
            fx.lineStyle(2, 0x73ff9d, 0.9);
            fx.lineBetween(targetX - 4, targetY - mark, targetX + 4, targetY - mark);
            fx.lineBetween(targetX, targetY - mark - 4, targetX, targetY - mark + 4);
          }
          if (abilityTargets?.tempoUnitIds.includes(target.id)) {
            const mark = target.radius + 18;
            fx.lineStyle(1.5, 0xffdf6b, 0.78);
            fx.lineBetween(
              targetX - mark * 0.55,
              targetY + mark * 0.25,
              targetX,
              targetY + mark * 0.55,
            );
            fx.lineBetween(
              targetX,
              targetY + mark * 0.55,
              targetX + mark * 0.55,
              targetY + mark * 0.25,
            );
          }
          const slow = abilityTargets?.slows.find(
            (result) => result.unitId === target.id,
          );
          if (slow && !slow.changed) {
            const mark = target.radius + 17;
            fx.lineStyle(1.8, NEUTRAL, 0.8);
            fx.lineBetween(
              targetX - mark * 0.45,
              targetY,
              targetX + mark * 0.45,
              targetY,
            );
          }
          const movement = abilityTargets?.movements.find(
            (result) => result.unitId === target.id,
          );
          if (movement && !movement.changed) {
            const mark = target.radius + 17;
            fx.lineStyle(2, NEUTRAL, 0.9);
            fx.lineBetween(
              targetX - mark * 0.5,
              targetY - mark * 0.5,
              targetX + mark * 0.5,
              targetY + mark * 0.5,
            );
            fx.lineBetween(
              targetX + mark * 0.5,
              targetY - mark * 0.5,
              targetX - mark * 0.5,
              targetY + mark * 0.5,
            );
          }
        }
        if (abilityTargets?.core) {
          const core = s.cores.enemy;
          const pulse = 0.72 + 0.22 * Math.sin(this.clock * 6);
          fx.lineStyle(2.4, targetColor, pulse);
          fx.strokeCircle(core.x, core.y, 31);
          fx.lineStyle(1, 0xffffff, pulse * 0.5);
          fx.strokeCircle(core.x, core.y, 36);
          if (abilityTargets.coreLethal) {
            fx.lineStyle(2.2, CORAL, 0.9);
            for (let i = 0; i < 4; i++) {
              const angle = Math.PI * 0.25 + i * Math.PI * 0.5;
              const inner = 39;
              const outer = 48;
              fx.lineBetween(
                core.x + Math.cos(angle) * inner,
                core.y + Math.sin(angle) * inner,
                core.x + Math.cos(angle) * outer,
                core.y + Math.sin(angle) * outer,
              );
            }
          }
        }
        for (const movement of abilityTargets?.movements ?? []) {
          const target = s.units.find((unit) => unit.id === movement.unitId);
          if (!target || !movement.changed) continue;
          const targetMotion = this.unitMotion.get(target.id);
          const targetPoint =
            targetMotion?.renderedFrame === this.renderFrame
              ? unitRenderPosition(targetMotion.render)
              : { x: target.x, y: target.y };
          const targetX = targetPoint.x;
          const targetY = targetPoint.y;
          const dx = movement.x - targetX;
          const dy = movement.y - targetY;
          const travel = Math.hypot(dx, dy);
          if (travel < 1) continue;
          const ux = dx / travel;
          const uy = dy / travel;
          const px = -uy;
          const py = ux;
          const startX = targetX + ux * (target.radius + 10);
          const startY = targetY + uy * (target.radius + 10);
          const endX = movement.x - ux * 8;
          const endY = movement.y - uy * 8;
          fx.lineStyle(2, targetColor, 0.72);
          fx.lineBetween(startX, startY, endX, endY);
          fx.lineBetween(
            endX,
            endY,
            endX - ux * 8 + px * 4,
            endY - uy * 8 + py * 4,
          );
          fx.lineBetween(
            endX,
            endY,
            endX - ux * 8 - px * 4,
            endY - uy * 8 - py * 4,
          );
          fx.fillStyle(targetColor, 0.06);
          fx.fillCircle(movement.x, movement.y, target.radius + 7);
          fx.lineStyle(1.4, targetColor, 0.62);
          fx.strokeCircle(movement.x, movement.y, target.radius + 7);
        }
      }
      fx.lineStyle(1.5, previewColor, 0.8);
      fx.lineBetween(x - 7, y, x + 7, y);
      fx.lineBetween(x, y - 7, x, y + 7);
    }
    this.drawOvertimeOverlay(s);
    this.drawMatchEndOverlay(m);
  }

  private drawOvertimeOverlay(state: Match["state"]): void {
    const visual = matchOvertimeVisual(state);
    if (!visual) {
      this.overtimeTitle.setVisible(false);
      this.overtimeSubtitle.setVisible(false);
      return;
    }

    const fx = this.fx;
    const pulse = this.reducedMotion
      ? 0.72
      : 0.58 + Math.sin(this.clock * (visual.stage === "final" ? 8 : 5)) * 0.14;
    const intensity = visual.intensity;
    const accent = visual.stage === "final" ? CORAL : NEUTRAL;
    const accentCss = visual.stage === "final" ? "#ffc0a2" : "#fff0bc";

    fx.fillStyle(0x020709, 0.035 + intensity * 0.035);
    fx.fillRect(0, 0, 420, 560);

    const inset = 18 + visual.progress * 10;
    fx.lineStyle(1.4, accent, 0.12 + pulse * 0.18);
    fx.strokeRoundedRect(inset, 58, 420 - inset * 2, 444, 14);

    const centerWidth = 110 + visual.progress * 130;
    fx.fillStyle(accent, 0.02 + intensity * 0.018);
    fx.fillRect(210 - centerWidth / 2, 262, centerWidth, 36);
    fx.lineStyle(2.2, accent, 0.28 + pulse * 0.34);
    fx.lineBetween(210 - centerWidth / 2, 280, 210 + centerWidth / 2, 280);

    for (let i = 0; i < 7; i++) {
      const x = 72 + i * 46;
      const spread = this.reducedMotion ? 0 : (visual.progress * 10) % 10;
      fx.lineStyle(1.5, accent, 0.22 + pulse * 0.28);
      fx.lineBetween(x - 5, 265 + spread, x, 272 + spread);
      fx.lineBetween(x + 5, 265 + spread, x, 272 + spread);
      fx.lineBetween(x - 5, 295 - spread, x, 288 - spread);
      fx.lineBetween(x + 5, 295 - spread, x, 288 - spread);
    }

    if (visual.stage === "entry") {
      const entry = this.reducedMotion
        ? 1
        : Math.min(1, visual.elapsed / 0.75);
      fx.fillStyle(accent, (1 - entry) * 0.09);
      fx.fillRect(0, 0, 420, 560);
      this.overtimeTitle
        .setScale(this.reducedMotion ? 1 : 0.86 + entry * 0.14)
        .setAlpha(entry);
    } else {
      this.overtimeTitle.setScale(1).setAlpha(0.95);
    }

    this.overtimeTitle
      .setText(visual.title)
      .setColor(accentCss)
      .setVisible(true);
    this.overtimeSubtitle
      .setText(visual.detail)
      .setColor(accentCss)
      .setAlpha(0.92)
      .setVisible(true);
  }

  private drawMatchEndOverlay(match: Match): void {
    const state = match.state;
    const visual = matchEndVisual(state);
    if (!visual) {
      this.endSequenceStartedAt = null;
      this.endTitle.setVisible(false);
      this.endSubtitle.setVisible(false);
      return;
    }

    if (this.endSequenceStartedAt === null)
      this.endSequenceStartedAt = this.clock;

    const rawProgress = Math.max(
      0,
      Math.min(
        1,
        (this.clock - this.endSequenceStartedAt) /
          (MATCH_END_SEQUENCE_MS / 1000),
      ),
    );
    const progress = this.reducedMotion ? 1 : rawProgress;
    const eased = 1 - Math.pow(1 - progress, 3);
    const accent =
      visual.kind === "victory"
        ? MINT
        : visual.kind === "defeat"
          ? CORAL
          : NEUTRAL;
    const accentCss =
      visual.kind === "victory"
        ? "#83ffcf"
        : visual.kind === "defeat"
          ? "#ffc0a2"
          : "#fff0bc";
    const fx = this.fx;

    const vignette = 0.08 + eased * 0.14;
    fx.fillStyle(0x020709, vignette);
    fx.fillRect(0, 0, 420, 52);
    fx.fillRect(0, 508, 420, 52);
    fx.fillRect(0, 52, 24, 456);
    fx.fillRect(396, 52, 24, 456);

    const flash = Math.max(0, 1 - rawProgress / 0.24);
    if (flash > 0) {
      fx.fillStyle(accent, flash * 0.09);
      fx.fillRect(0, 0, 420, 560);
    }

    if (visual.coreBreak && visual.focus !== "center") {
      const focus =
        visual.focus === "enemy" ? state.cores.enemy : state.cores.player;
      const direction = focus.y < 280 ? 1 : -1;
      const sweepY = focus.y + (280 - focus.y) * eased;
      const bandHeight = 26 + eased * 34;

      fx.fillStyle(accent, 0.035 + (1 - rawProgress) * 0.035);
      fx.fillRect(24, sweepY - bandHeight / 2, 372, bandHeight);
      fx.lineStyle(3, accent, 0.78 - rawProgress * 0.18);
      fx.lineBetween(30, sweepY, 390, sweepY);
      fx.lineStyle(1.2, 0xffffff, 0.32);
      fx.lineBetween(54, sweepY - direction * 8, 366, sweepY - direction * 8);

      for (let i = 0; i < 7; i++) {
        const x = 72 + i * 46;
        const arrowY = sweepY - direction * 18;
        fx.lineStyle(1.8, accent, 0.62);
        fx.lineBetween(x - 5, arrowY, x, arrowY + direction * 7);
        fx.lineBetween(x + 5, arrowY, x, arrowY + direction * 7);
      }

      const ring = 28 + eased * 42;
      fx.lineStyle(2.6, accent, 0.78 * (1 - rawProgress * 0.35));
      fx.strokeCircle(focus.x, focus.y, ring);
      fx.lineStyle(1.2, 0xffffff, 0.45 * (1 - rawProgress * 0.3));
      fx.strokeCircle(focus.x, focus.y, ring + 10);
    } else if (visual.metric === "relay" || visual.metric === "control-time") {
      const objectivePoints = (match.controlObjective?.pointIds ?? [])
        .map((id) => state.points[id])
        .filter(Boolean);
      if (objectivePoints.length) {
        const minX = Math.min(...objectivePoints.map((point) => point.x));
        const maxX = Math.max(...objectivePoints.map((point) => point.x));
        const centerY =
          objectivePoints.reduce((sum, point) => sum + point.y, 0) /
          objectivePoints.length;
        fx.lineStyle(2.4, accent, 0.38 + eased * 0.32);
        fx.lineBetween(minX, centerY, maxX, centerY);
        for (const point of objectivePoints) {
          const ring = 31 + eased * 15;
          fx.fillStyle(accent, 0.025 + eased * 0.035);
          fx.fillCircle(point.x, point.y, ring - 5);
          fx.lineStyle(2.8, accent, 0.72 - rawProgress * 0.14);
          fx.strokeCircle(point.x, point.y, ring);
          fx.lineStyle(1.2, 0xffffff, 0.32);
          fx.strokeCircle(point.x, point.y, ring + 7);
        }
      } else {
        const ring = 34 + eased * 82;
        fx.lineStyle(3, accent, 0.54 * (1 - rawProgress * 0.45));
        fx.strokeCircle(210, 280, ring);
      }
    } else if (visual.metric === "core-health") {
      for (const team of ["enemy", "player"] as const) {
        const core = state.cores[team];
        const hp = Math.max(0, Math.min(1, core.hp / core.maxHp));
        const teamColor = team === "player" ? MINT : CORAL;
        const ring = 35 + eased * 15;
        fx.lineStyle(2.4, teamColor, 0.38 + hp * 0.42);
        fx.strokeCircle(core.x, core.y, ring);
        fx.lineStyle(4, teamColor, 0.25 + hp * 0.55);
        fx.beginPath();
        fx.arc(
          core.x,
          core.y,
          ring + 7,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * hp,
          false,
        );
        fx.strokePath();
      }
      fx.lineStyle(1.8, accent, 0.34 + eased * 0.24);
      fx.lineBetween(210, 90, 210, 470);
    } else if (visual.metric === "territory") {
      for (const point of state.points) {
        const pointColor =
          point.owner === "player"
            ? MINT
            : point.owner === "enemy"
              ? CORAL
              : NEUTRAL;
        const winnerOwned =
          (state.winner === "player" || state.winner === "enemy") &&
          point.owner === state.winner;
        const size = 19 + eased * (winnerOwned ? 8 : 4);
        fx.lineStyle(
          winnerOwned ? 2.8 : 1.3,
          pointColor,
          winnerOwned ? 0.72 : 0.24,
        );
        fx.strokeRoundedRect(
          point.x - size,
          point.y - size,
          size * 2,
          size * 2,
          8,
        );
      }
      fx.lineStyle(2.2, accent, 0.38 + eased * 0.28);
      fx.strokeRoundedRect(45, 92, 330, 376, 24);
    } else {
      const ring = 34 + eased * 82;
      fx.lineStyle(3, accent, 0.54 * (1 - rawProgress * 0.45));
      fx.strokeCircle(210, 280, ring);
      fx.lineStyle(1.2, 0xffffff, 0.34 * (1 - rawProgress * 0.35));
      fx.strokeCircle(210, 280, ring + 13);
    }

    const textIn = this.reducedMotion
      ? 1
      : Math.max(0, Math.min(1, (rawProgress - 0.12) / 0.3));
    this.endTitle
      .setText(visual.title)
      .setColor(accentCss)
      .setAlpha(textIn)
      .setScale(this.reducedMotion ? 1 : 0.92 + textIn * 0.08)
      .setVisible(true);
    this.endSubtitle
      .setText(visual.subtitle)
      .setColor(accentCss)
      .setAlpha(Math.max(0, Math.min(1, textIn * 1.15)))
      .setVisible(true);
  }

  private drawCore(
    x: number,
    y: number,
    team: "player" | "enemy",
    fraction: number,
    hitAlpha = 0,
    turretTarget?: Unit,
    hitWeight = 0,
    turretCooldown = 0,
    hitReaction: CoreHitReaction = coreHitReaction(undefined),
    fireFeedback: CoreTurretFireFeedback = coreTurretFireFeedback(undefined),
    turretTargetPoint?: { x: number; y: number },
  ) {
    const g = this.g,
      color = team === "player" ? MINT : CORAL;
    const pressure = corePressure(fraction, 1);
    const coreDamage = coreDamageStateVisual(fraction);
    const destroyed = pressure.state === "destroyed";
    const targetX = turretTargetPoint?.x ?? turretTarget?.x;
    const targetY = turretTargetPoint?.y ?? turretTarget?.y;
    if (
      turretTarget &&
      Number.isFinite(targetX) &&
      Number.isFinite(targetY) &&
      !destroyed
    ) {
      const cycle = coreTurretVisual(turretCooldown);
      const defensePulse = this.reducedMotion
        ? 0.72
        : 0.5 + 0.5 * Math.sin(this.clock * (cycle.phase === "lock" ? 7 : 4));
      g.fillStyle(color, 0.012 + defensePulse * 0.012);
      g.fillCircle(x, y, CORE_TURRET_RANGE);
      g.lineStyle(1.2, color, 0.13 + defensePulse * 0.08);
      g.strokeCircle(x, y, CORE_TURRET_RANGE);
      g.lineStyle(1, 0xffffff, 0.05 + defensePulse * 0.04);
      g.strokeCircle(x, y, CORE_TURRET_RANGE - 5);

      // The sight line and contracting brackets now communicate the real reload cycle.
      g.lineStyle(
        cycle.phase === "lock" ? 1.8 : 1,
        color,
        cycle.sightAlpha * (0.82 + defensePulse * 0.18),
      );
      g.lineBetween(x, y, targetX!, targetY!);

      const chargeRadius = 29;
      const start = -Math.PI / 2;
      const end = start + Math.PI * 2 * Math.max(0.025, cycle.charge);
      g.lineStyle(3, color, cycle.chargeAlpha);
      g.beginPath();
      g.arc(x, y - 2, chargeRadius, start, end, false);
      g.strokePath();
      g.lineStyle(1, 0xffffff, 0.18 + cycle.charge * 0.34);
      g.beginPath();
      g.arc(x, y - 2, chargeRadius + 4, start, end, false);
      g.strokePath();

      const fx = this.fx;
      const r =
        Math.max(24, turretTarget.radius + 10) *
        cycle.bracketScale;
      fx.lineStyle(
        cycle.phase === "lock" ? 2.8 : 2,
        cycle.phase === "lock" ? 0xffffff : color,
        0.52 + cycle.charge * 0.4,
      );
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          const tx = targetX! + sx * r;
          const ty = targetY! + sy * r;
          const arm = cycle.phase === "lock" ? 9 : 7;
          fx.lineBetween(tx, ty, tx - sx * arm, ty);
          fx.lineBetween(tx, ty, tx, ty - sy * arm);
        }
      }

      if (cycle.phase === "lock") {
        const lockPulse = this.reducedMotion
          ? 0.78
          : 0.62 + Math.sin(this.clock * 9) * 0.18;
        const lockRadius = Math.max(13, turretTarget.radius + 4);
        fx.lineStyle(1.5, color, lockPulse);
        fx.strokeCircle(targetX!, targetY!, lockRadius);
        fx.fillStyle(0xffffff, 0.5 + lockPulse * 0.28);
        fx.fillCircle(
          targetX!,
          targetY!,
          1.8 + cycle.charge * 1.2,
        );
      }
    }
    if (destroyed && !this.brokenCores.has(team)) {
      this.brokenCores.add(team);
      if (!this.reducedMotion)
        this.cameras.main.shake(260, 0.0065, true);
    }
    g.fillStyle(0x07151b, destroyed ? 0.92 : 0.7);
    g.fillEllipse(x, y + 9, 98, 26);
    this.polygon(
      g,
      [
        [x - 43, y - 12],
        [x - 29, y - 24],
        [x + 29, y - 24],
        [x + 43, y - 12],
        [x + 43, y + 11],
        [x + 27, y + 24],
        [x - 27, y + 24],
        [x - 43, y + 11],
      ],
      0x182829,
      1,
      0x506257,
    );
    for (const dx of [-30, 30]) {
      g.fillStyle(0x394947);
      g.fillRect(x + dx - 5, y - 12, 10, 26);
      g.fillStyle(color, 0.7);
      g.fillRect(x + dx - 2, y - 7, 4, 11);
    }

    if (coreDamage.state !== "stable" && !destroyed) {
      const damagePulse = this.reducedMotion
        ? 0.72
        : 0.62 + Math.sin(this.clock * 7.2) * 0.16;
      const seamColor =
        coreDamage.state === "critical" ? 0xffb06f : 0xffd18f;

      g.lineStyle(
        1.2,
        0x071315,
        0.82,
      );
      for (let seam = 0; seam < coreDamage.exposedSeams; seam++) {
        const side = seam % 2 === 0 ? -1 : 1;
        const tier = Math.floor(seam / 2);
        const sx =
          x +
          side *
            (20 +
              tier * 5 +
              coreDamage.armorGap * 0.35);
        const sy =
          y -
          15 +
          tier * 9;
        g.lineBetween(
          sx,
          sy,
          sx + side * (5 + coreDamage.armorGap * 0.45),
          sy + 4 + tier,
        );
      }

      g.lineStyle(
        1.15,
        seamColor,
        coreDamage.conduitAlpha,
      );
      for (let conduit = 0; conduit < Math.min(4, coreDamage.exposedSeams); conduit++) {
        const side = conduit % 2 === 0 ? -1 : 1;
        const cy = y - 12 + Math.floor(conduit / 2) * 13;
        const innerX = x + side * 18;
        const outerX =
          x +
          side *
            (25 + coreDamage.armorGap * 0.55);
        g.lineBetween(innerX, cy, outerX, cy + side * 2);
        g.fillStyle(
          conduit % 2 === 0 ? color : seamColor,
          coreDamage.conduitAlpha * 0.9,
        );
        g.fillCircle(outerX, cy + side * 2, 1.4);
      }

      for (let vent = 0; vent < coreDamage.ventCount; vent++) {
        const side = vent % 2 === 0 ? -1 : 1;
        const vx = x + side * (29 + (vent % 3) * 2);
        const vy = y - 10 + Math.floor(vent / 2) * 8;
        const drift = this.reducedMotion
          ? 3
          : 3 + ((this.clock * (7 + vent) + vent * 3.7) % 7);
        g.lineStyle(
          1.1,
          0xd9eef0,
          coreDamage.ventAlpha *
            (0.62 + damagePulse * 0.24),
        );
        g.lineBetween(
          vx,
          vy,
          vx + side * (2 + vent % 2),
          vy - drift,
        );
      }

      g.lineStyle(
        1,
        0xffd9a8,
        coreDamage.warningAlpha * damagePulse,
      );
      for (let spark = 0; spark < coreDamage.sparkCount; spark++) {
        const side = spark % 2 === 0 ? -1 : 1;
        const sx = x + side * (22 + (spark % 3) * 4);
        const sy = y - 7 + Math.floor(spark / 2) * 6;
        const reach = 3 + (spark % 3) * 1.5;
        g.lineBetween(
          sx,
          sy,
          sx + side * reach,
          sy - 2 - (spark % 2) * 2,
        );
      }

      if (coreDamage.state === "critical") {
        g.fillStyle(
          0xff8b68,
          coreDamage.warningAlpha * 0.18 * damagePulse,
        );
        g.fillEllipse(
          x,
          y + 7,
          66 + coreDamage.armorGap * 2,
          18,
        );

        for (let debris = 0; debris < coreDamage.debrisCount; debris++) {
          const side = debris % 2 === 0 ? -1 : 1;
          const tier = Math.floor(debris / 2);
          const dx =
            x +
            side *
              (34 + tier * 3 + coreDamage.armorGap * 0.3);
          const dy =
            y +
            15 -
            (tier % 3) * 6;
          g.fillStyle(
            debris % 3 === 0 ? seamColor : 0x394947,
            0.42 + damagePulse * 0.18,
          );
          g.fillRect(
            dx,
            dy,
            debris % 2 === 0 ? 3 : 2,
            1.5 + (debris % 3),
          );
        }
      }
    }

    const aimVisual = coreTurretAimVisual(
      x,
      y - 3,
      targetX,
      targetY,
      turretCooldown,
    );
    const turretRecoil =
      fireFeedback.active && !this.reducedMotion ? fireFeedback.recoil : 0;
    const aimOffset =
      aimVisual.active && !fireFeedback.active
        ? aimVisual.headOffset
        : 0;
    const turretX =
      x +
      (aimVisual.active ? aimVisual.nx * aimOffset : 0) -
      fireFeedback.nx * turretRecoil;
    const turretY =
      y -
      3 +
      (aimVisual.active ? aimVisual.ny * aimOffset : 0) -
      fireFeedback.ny * turretRecoil;

    this.polygon(g, this.hex(x, y - 2, 22), 0x47635a, 1, color);
    this.polygon(g, this.hex(turretX, turretY, 15), 0x132627, 1, color);

    if (aimVisual.active && !destroyed) {
      const barrelStartX =
        turretX + aimVisual.nx * 4;
      const barrelStartY =
        turretY + aimVisual.ny * 4;
      const barrelTipX =
        turretX + aimVisual.nx * aimVisual.barrelLength;
      const barrelTipY =
        turretY + aimVisual.ny * aimVisual.barrelLength;
      const prong = aimVisual.prongSpread;
      const phaseAlpha =
        aimVisual.phase === "lock"
          ? 0.9
          : aimVisual.phase === "track"
            ? 0.66
            : 0.42;

      g.lineStyle(
        aimVisual.barrelWidth + 2.1,
        0x071517,
        0.78,
      );
      g.lineBetween(
        barrelStartX - aimVisual.px * prong,
        barrelStartY - aimVisual.py * prong,
        barrelTipX - aimVisual.px * prong * 0.68,
        barrelTipY - aimVisual.py * prong * 0.68,
      );
      g.lineBetween(
        barrelStartX + aimVisual.px * prong,
        barrelStartY + aimVisual.py * prong,
        barrelTipX + aimVisual.px * prong * 0.68,
        barrelTipY + aimVisual.py * prong * 0.68,
      );

      g.lineStyle(
        aimVisual.barrelWidth,
        color,
        phaseAlpha,
      );
      g.lineBetween(
        barrelStartX - aimVisual.px * prong,
        barrelStartY - aimVisual.py * prong,
        barrelTipX - aimVisual.px * prong * 0.68,
        barrelTipY - aimVisual.py * prong * 0.68,
      );
      g.lineBetween(
        barrelStartX + aimVisual.px * prong,
        barrelStartY + aimVisual.py * prong,
        barrelTipX + aimVisual.px * prong * 0.68,
        barrelTipY + aimVisual.py * prong * 0.68,
      );

      g.lineStyle(
        1,
        0xffffff,
        0.22 + aimVisual.charge * 0.48,
      );
      g.lineBetween(
        turretX + aimVisual.nx * 6,
        turretY + aimVisual.ny * 6,
        barrelTipX,
        barrelTipY,
      );

      g.fillStyle(
        aimVisual.phase === "lock" ? 0xffffff : color,
        0.36 + aimVisual.charge * 0.48,
      );
      g.fillCircle(
        barrelTipX,
        barrelTipY,
        aimVisual.muzzleRadius,
      );

      if (aimVisual.phase === "lock") {
        g.lineStyle(1.2, color, 0.72);
        const lockBar = 4 + aimVisual.charge * 2;
        g.lineBetween(
          barrelTipX - aimVisual.px * lockBar,
          barrelTipY - aimVisual.py * lockBar,
          barrelTipX + aimVisual.px * lockBar,
          barrelTipY + aimVisual.py * lockBar,
        );
      }
    }

    if (fireFeedback.active) {
      const tangentX = -fireFeedback.ny;
      const tangentY = fireFeedback.nx;
      const muzzleX =
        turretX + fireFeedback.nx * fireFeedback.muzzleDistance;
      const muzzleY =
        turretY + fireFeedback.ny * fireFeedback.muzzleDistance;
      const alpha = 0.35 + fireFeedback.strength * 0.58;

      g.lineStyle(3.4, color, alpha * 0.34);
      g.lineBetween(turretX, turretY, muzzleX, muzzleY);
      g.lineStyle(1.6, 0xffffff, alpha * 0.92);
      g.lineBetween(
        turretX + fireFeedback.nx * 5,
        turretY + fireFeedback.ny * 5,
        muzzleX,
        muzzleY,
      );

      g.fillStyle(color, alpha * 0.38);
      g.fillCircle(muzzleX, muzzleY, fireFeedback.flareRadius);
      g.fillStyle(0xffffff, alpha * 0.92);
      g.fillCircle(muzzleX, muzzleY, Math.max(1.6, fireFeedback.flareRadius * 0.46));

      g.lineStyle(1.2, color, alpha * 0.72);
      for (const side of [-1, 1]) {
        const ventX = turretX + tangentX * side * fireFeedback.ventSpread;
        const ventY = turretY + tangentY * side * fireFeedback.ventSpread;
        g.lineBetween(
          ventX,
          ventY,
          ventX - fireFeedback.nx * (5 + fireFeedback.strength * 4),
          ventY - fireFeedback.ny * (5 + fireFeedback.strength * 4),
        );
      }

      if (!this.reducedMotion) {
        g.lineStyle(1, 0xffffff, alpha * 0.52);
        for (const spread of [-1, -0.35, 0.35, 1]) {
          const lateral = spread * (3 + fireFeedback.flareRadius);
          const sx = muzzleX + tangentX * lateral * 0.25;
          const sy = muzzleY + tangentY * lateral * 0.25;
          g.lineBetween(
            sx,
            sy,
            sx +
              fireFeedback.nx * (6 + fireFeedback.strength * 5) +
              tangentX * lateral,
            sy +
              fireFeedback.ny * (6 + fireFeedback.strength * 5) +
              tangentY * lateral,
          );
        }
      }
    }
    if (pressure.state !== "stable") {
      g.lineStyle(1.5, 0xffd18f, (pressure.state === "critical" || pressure.state === "destroyed") ? 0.82 : 0.52);
      g.lineBetween(x - 12, y - 13, x - 4, y - 6);
      g.lineBetween(x - 4, y - 6, x - 9, y + 1);
      g.lineBetween(x + 10, y - 10, x + 3, y - 2);
      if ((pressure.state === "critical" || pressure.state === "destroyed")) {
        g.lineBetween(x + 3, y - 2, x + 10, y + 7);
        g.lineBetween(x - 9, y + 1, x - 3, y + 8);
      }
    }
    const headForwardX =
      aimVisual.active
        ? aimVisual.nx
        : 0;
    const headForwardY =
      aimVisual.active
        ? aimVisual.ny
        : -1;
    const headSideX =
      aimVisual.active
        ? aimVisual.px
        : 1;
    const headSideY =
      aimVisual.active
        ? aimVisual.py
        : 0;
    this.polygon(
      g,
      [
        [
          turretX + headForwardX * 10,
          turretY + headForwardY * 10,
        ],
        [
          turretX + headSideX * 8,
          turretY + headSideY * 8,
        ],
        [
          turretX - headForwardX * 10,
          turretY - headForwardY * 10,
        ],
        [
          turretX - headSideX * 8,
          turretY - headSideY * 8,
        ],
      ],
      color,
      fireFeedback.active
        ? 0.78 + fireFeedback.strength * 0.2
        : aimVisual.active
          ? 0.66 + aimVisual.charge * 0.25
          : 0.65 + 0.25 * Math.sin(this.clock * 2),
    );
    g.fillStyle(0x061315);
    g.fillRect(x - 27, y + 26, 54, 3);
    g.fillStyle(color);
    g.fillRect(x - 27, y + 26, 54 * Math.max(0, fraction), 3);
    if ((pressure.state === "critical" || pressure.state === "destroyed")) {
      const pulse = 0.45 + 0.35 * Math.sin(this.clock * 6);
      g.fillStyle(0xff8b68, pulse);
      g.fillCircle(x - 31, y - 15, 2.5);
      g.fillCircle(x + 31, y - 15, 2.5);
      g.lineStyle(1.4, 0xffb36f, 0.28 + pulse * 0.35);
      for (let i = 0; i < 3; i++) {
        const drift = (this.clock * (9 + i * 2) + i * 11) % 18;
        g.lineBetween(
          x + (i - 1) * 8,
          y - 19 - drift * 0.25,
          x + (i - 1) * 8 + (i - 1) * 2,
          y - 23 - drift,
        );
      }
    }
    if (hitAlpha > 0) {
      const weight = Math.max(12, hitWeight || 18);
      const flash = Math.min(0.82, hitAlpha * (0.72 + weight / 120));
      const shell = 22 + weight * 0.12;
      this.polygon(
        g,
        this.hex(x, y - 3, shell),
        0xffffff,
        flash * 0.16,
      );
      g.lineStyle(1.8 + weight * 0.025, 0xffffff, flash);
      g.strokeCircle(
        x,
        y - 2,
        shell - 2 + (1 - hitAlpha) * (6 + weight * 0.22),
      );
      if (weight >= 22) {
        g.lineStyle(1.2, color, flash * 0.7);
        g.strokeCircle(
          x,
          y - 2,
          shell + 5 + (1 - hitAlpha) * weight * 0.45,
        );
      }

      if (hitReaction.active) {
        const impactX = x + hitReaction.nx * hitReaction.rimRadius;
        const impactY = y - 2 + hitReaction.ny * hitReaction.rimRadius;
        const tangentX = -hitReaction.ny;
        const tangentY = hitReaction.nx;
        const reactionAlpha = flash * hitReaction.intensity;
        const angle = Math.atan2(hitReaction.ny, hitReaction.nx);

        g.fillStyle(0xffffff, reactionAlpha * 0.82);
        g.fillCircle(
          impactX,
          impactY,
          2.4 + hitReaction.intensity * 2.2,
        );
        g.fillStyle(color, reactionAlpha * 0.3);
        g.fillCircle(
          impactX,
          impactY,
          5 + hitReaction.intensity * 4,
        );

        g.lineStyle(
          2.4,
          0xffffff,
          reactionAlpha * 0.92,
        );
        g.beginPath();
        g.arc(
          x,
          y - 2,
          hitReaction.rimRadius,
          angle - hitReaction.arcWidth,
          angle + hitReaction.arcWidth,
          false,
        );
        g.strokePath();

        g.lineStyle(1.4, color, reactionAlpha * 0.75);
        for (const spread of [-1, -0.35, 0.35, 1]) {
          const lateral = spread * (3.5 + weight * 0.06);
          const sx = impactX + tangentX * lateral;
          const sy = impactY + tangentY * lateral;
          const length =
            hitReaction.sparkLength *
            (1 - Math.abs(spread) * 0.16);
          g.lineBetween(
            sx,
            sy,
            sx + hitReaction.nx * length + tangentX * spread * 2,
            sy + hitReaction.ny * length + tangentY * spread * 2,
          );
        }

        g.lineStyle(1.2, 0xffd6a0, reactionAlpha * 0.68);
        for (const spread of [-1, 1]) {
          const startX = impactX - hitReaction.nx * 2;
          const startY = impactY - hitReaction.ny * 2;
          const midX =
            startX -
            hitReaction.nx * (6 + weight * 0.06) +
            tangentX * spread * 3;
          const midY =
            startY -
            hitReaction.ny * (6 + weight * 0.06) +
            tangentY * spread * 3;
          g.lineBetween(startX, startY, midX, midY);
          g.lineBetween(
            midX,
            midY,
            midX -
              hitReaction.nx * (4 + weight * 0.03) +
              tangentX * spread * 2,
            midY -
              hitReaction.ny * (4 + weight * 0.03) +
              tangentY * spread * 2,
          );
        }
      }
    }
    if (destroyed) {
      const pulse = 0.5 + 0.5 * Math.sin(this.clock * 10);
      g.fillStyle(0x120d0b, 0.78);
      this.polygon(g, this.hex(x, y - 3, 17), 0x120d0b, 0.78, 0xff9b68);
      g.lineStyle(2.2, 0xffb06f, 0.62 + pulse * 0.25);
      g.strokeCircle(x, y - 2, 22 + pulse * 5);
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI * 0.25 + this.clock * (i % 2 ? -0.45 : 0.45);
        const drift = 13 + ((this.clock * (22 + i * 2) + i * 7) % 24);
        const sx = x + Math.cos(angle) * (12 + drift * 0.35);
        const sy = y - 3 + Math.sin(angle) * (8 + drift * 0.22) - drift * 0.22;
        g.fillStyle(i % 3 === 0 ? 0xffffff : 0xff9b68, 0.35 + pulse * 0.3);
        g.fillCircle(sx, sy, i % 2 ? 1.4 : 2);
      }
      g.lineStyle(1.6, 0xffd19a, 0.72);
      g.lineBetween(x - 10, y - 13, x + 8, y + 8);
      g.lineBetween(x + 9, y - 12, x - 6, y + 9);
    }
  }
}
