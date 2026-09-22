import { ARENA_THEMES, type ArenaThemeId } from "./arena-themes";
import Phaser from "phaser";
import {
  abilityTargetPreview,
  Match,
  CARDS,
  CORE_TURRET_RANGE,
  controlPointPressure,
  coreTurretTarget,
  deploymentColumns,
  type Effect,
  type Unit,
} from "./engine";
import { unitSvg } from "./art";
import { MATCH_END_SEQUENCE_MS, matchEndVisual } from "./match-end-visual";
import { matchOvertimeVisual } from "./match-overtime-visual";
import { controlPointVisual } from "./control-point-visual";
import { impactProfile } from "./combat-feedback";
import { deathBurstDirection } from "./death-burst-direction";
import { weaponFireFeedback } from "./weapon-fire-feedback";
import { corePressure } from "./core-pressure";
import { commanderActivationVisual } from "./commander-activation-visual";
import { unitHitReaction } from "./unit-hit-reaction";
import { coreTurretVisual } from "./core-turret-visual";
import {
  coreTurretFireFeedback,
  type CoreTurretFireFeedback,
} from "./core-turret-fire";
import {
  coreHitReaction,
  type CoreHitReaction,
} from "./core-hit-reaction";
import { healLinkVisual } from "./heal-link-visual";
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
  sampleUnitMotion,
  unitTrailPoint,
  type UnitFacing,
} from "./unit-motion";

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
      facing: UnitFacing;
      moving: boolean;
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
  private reactedEffects = new Set<number>();
  private battleScars: BattlefieldScar[] = [];
  private brokenCores = new Set<"player" | "enemy">();
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
      this.endSequenceStartedAt = null;
      this.endTitle.setVisible(false);
      this.endSubtitle.setVisible(false);
    }
    if (running) {
      this.clock += Math.min(delta, 100) / 1000;
      if (!this.bridge.authoritative) match.update(Math.min(delta, 100) / 1000);
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

  private combatValueLabel(
    effect: Effect,
  ): { text: string; color: string } | null {
    const value = effect.value ?? 0;
    if (!Number.isFinite(value)) return null;
    if (effect.type === "frontline" && value !== 0)
      return {
        text:
          value > 0
            ? `VORRÜCKEN +${Math.abs(value)} SEKTOR${Math.abs(value) === 1 ? "" : "EN"}`
            : `RÜCKZUG −${Math.abs(value)} SEKTOR${Math.abs(value) === 1 ? "" : "EN"}`,
        color: effect.team === "player" ? "#83ffcf" : "#ffc0a2",
      };
    if (value <= 0) return null;
    if (effect.type === "impact" && value >= 35)
      return { text: `−${Math.round(value)}`, color: "#ffd0a0" };
    if (effect.type === "core-hit" && value >= 35)
      return { text: `−${Math.round(value)} CORE`, color: "#ffe39a" };
    if (effect.type === "heal" && value >= 30)
      return { text: `+${Math.round(value)}`, color: "#9dffd0" };
    if (effect.type === "shield" && value >= 20)
      return { text: `+${Math.round(value)} SCH`, color: "#a9dfff" };
    return null;
  }

  private syncCombatText(effects: readonly Effect[]): void {
    const visible = effects
      .filter((effect) => this.combatValueLabel(effect))
      .sort((a, b) => b.id - a.id)
      .slice(0, 5);
    const visibleIds = new Set(visible.map((effect) => effect.id));

    for (const [id, label] of this.combatText)
      if (!visibleIds.has(id)) {
        label.destroy();
        this.combatText.delete(id);
      }

    for (const effect of visible) {
      const info = this.combatValueLabel(effect)!;
      const progress = 1 - effect.life / effect.maxLife;
      const alpha = Math.max(0, effect.life / effect.maxLife);
      const useTarget =
        (effect.type === "heal" || effect.type === "frontline") &&
        effect.targetX !== undefined &&
        effect.targetY !== undefined;
      const x = useTarget ? effect.targetX! : effect.x;
      const baseY = useTarget ? effect.targetY! : effect.y;
      let label = this.combatText.get(effect.id);
      if (!label) {
        label = this.add
          .text(x, baseY - 18, info.text, {
            fontFamily: "monospace",
            fontSize: "9px",
            fontStyle: "bold",
            color: info.color,
            stroke: "#071416",
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(8);
        this.combatText.set(effect.id, label);
      }
      label
        .setText(info.text)
        .setColor(info.color)
        .setPosition(
          x,
          baseY - 18 - (this.reducedMotion ? 0 : progress * 18),
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
      coreTurretFireFeedback(enemyCoreShot),
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
      coreTurretFireFeedback(playerCoreShot),
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
          Math.abs(effect.x - u.x) < 0.5 &&
          Math.abs(effect.y - u.y) < 0.5,
      );
      const spawnProgress = spawnEffect
        ? 1 - spawnEffect.life / spawnEffect.maxLife
        : 1;
      const spawnScale = 0.72 + Math.min(1, spawnProgress * 1.5) * 0.28;
      const firing = s.effects.find(
        (effect) =>
          effect.type === "shot" &&
          effect.team === u.team &&
          Math.hypot(effect.x - u.x, effect.y - u.y) < 5 &&
          effect.targetX !== undefined &&
          effect.targetY !== undefined,
      );
      const previous = this.unitMotion.get(u.id);
      const motion = sampleUnitMotion(
        previous,
        u.x,
        u.y,
        firing?.targetX,
      );
      const phase =
        (previous?.phase ?? u.id * 0.71) +
        Math.min(0.9, motion.moved * 0.42);
      const settleUntil = motion.stopped
        ? this.clock + 0.18
        : previous?.settleUntil ?? 0;
      this.unitMotion.set(u.id, {
        x: u.x,
        y: u.y,
        phase,
        facing: motion.facing,
        moving: motion.moving,
        settleUntil,
      });
      const settle = this.reducedMotion
        ? 0
        : Math.max(0, Math.min(1, (settleUntil - this.clock) / 0.18));
      const walkBob =
        !this.reducedMotion && motion.moving ? Math.sin(phase) * 1.6 : 0;
      const walkScale =
        !this.reducedMotion && motion.moving
          ? 1 + Math.sin(phase * 2) * 0.018
          : 1;
      const hitImpact = s.effects.find(
        (effect) =>
          effect.type === "impact" &&
          Math.hypot(effect.x - u.x, effect.y - u.y) <= u.radius + 8,
      );
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
      if (
        firing &&
        fireFeedback &&
        firing.targetX !== undefined &&
        firing.targetY !== undefined
      ) {
        const dx = firing.targetX - firing.x;
        const dy = firing.targetY - firing.y;
        const d = Math.max(0.01, Math.hypot(dx, dy));
        recoilX = (dx / d) * fireFeedback.displacement;
        recoilY = (dy / d) * fireFeedback.displacement;
        recoilScale = fireFeedback.scale;
        fireWidthScale = fireFeedback.widthScale;
        fireHeightScale = fireFeedback.heightScale;
      }
      const attackPose = fireFeedback?.strength ?? 0;
      const horizontalLean =
        !this.reducedMotion && motion.moving && motion.moved > 0.001
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
          u.x +
            recoilX +
            (this.reducedMotion ? 0 : hitReaction.offsetX),
          u.y -
            3 -
            (1 - spawnProgress) * 8 +
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
        .setFlipX(motion.facing < 0)
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
      g.fillEllipse(u.x, u.y + 6, size * 0.65, size * 0.25);
      g.lineStyle(2, u.team === "player" ? MINT : CORAL, 0.9);
      g.strokeEllipse(u.x, u.y + 7, size * 0.75, size * 0.32);

      if (
        firing &&
        fireFeedback &&
        fireFeedback.muzzleRays > 0 &&
        firing.targetX !== undefined &&
        firing.targetY !== undefined
      ) {
        const dx = firing.targetX - firing.x;
        const dy = firing.targetY - firing.y;
        const d = Math.max(0.01, Math.hypot(dx, dy));
        const nx = dx / d;
        const ny = dy / d;
        const px = -ny;
        const py = nx;
        const forward = size * 0.34;
        const muzzleX = u.x + nx * forward;
        const muzzleY = u.y - 3 + ny * forward;
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

      if (!this.reducedMotion && motion.moving && motion.moved > 0.04) {
        const trail = unitTrailPoint(
          u.x,
          u.y + 8,
          motion.dx,
          motion.dy,
          7 + Math.min(5, motion.moved * 1.8),
        );
        const dustPulse = 0.08 + Math.abs(Math.sin(phase)) * 0.08;
        g.fillStyle(0xd9d3a8, dustPulse);
        g.fillEllipse(trail.x - 3, trail.y, 7, 2.6);
        g.fillStyle(0xb9c3a7, dustPulse * 0.72);
        g.fillEllipse(trail.x + 3, trail.y + 1.5, 5, 2);
      }
      if (settle > 0) {
        g.lineStyle(1.3, 0xd7d5b0, settle * 0.22);
        g.strokeEllipse(
          u.x,
          u.y + 8,
          size * (0.48 + (1 - settle) * 0.18),
          size * (0.16 + (1 - settle) * 0.06),
        );
      }
      if (u.shield > 0) {
        const shieldColor = u.team === "player" ? MINT : CORAL;
        fx.lineStyle(
          2,
          shieldColor,
          0.5 + 0.2 * Math.sin(this.clock * 5),
        );
        fx.strokeCircle(u.x, u.y, 22);
        this.statusPips(
          fx,
          u.x,
          u.y,
          u.shieldTime,
          shieldColor,
          -2.9,
        );
      }
      if (u.rallyTime > 0) {
        // Two gold chevrons make the tempo boost legible even without its initial pulse.
        fx.lineStyle(2, 0xffdf6b, 0.9);
        for (let i = 0; i < 2; i++) {
          const y = u.y + 14 + i * 5;
          fx.lineBetween(u.x - 5, y + 3, u.x, y);
          fx.lineBetween(u.x, y, u.x + 5, y + 3);
        }
        this.statusPips(fx, u.x, u.y, u.rallyTime, 0xffdf6b, 0.18);
      }
      if (u.slowTime > 0) {
        fx.lineStyle(2, 0x94caff, 0.85);
        fx.strokeEllipse(u.x, u.y + 12, 27, 9);
        this.statusPips(fx, u.x, u.y, u.slowTime, 0x94caff, 1.72);
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
        u.x - healthWidth / 2 - 1,
        u.y - 23,
        healthWidth + 2,
        4,
        2,
      );
      if (vitals.trailHpRatio > health + 0.002) {
        fx.fillStyle(0xff9f68, 0.82);
        fx.fillRect(
          u.x - healthWidth / 2 + healthWidth * health,
          u.y - 22,
          healthWidth * (vitals.trailHpRatio - health),
          2,
        );
      }
      fx.fillStyle(healthColor);
      fx.fillRect(
        u.x - healthWidth / 2,
        u.y - 22,
        healthWidth * health,
        2,
      );

      if (vitals.trailShieldRatio > 0.002) {
        fx.fillStyle(0x061519, 0.86);
        fx.fillRoundedRect(
          u.x - healthWidth / 2 - 1,
          u.y - 28,
          healthWidth + 2,
          3,
          1.5,
        );
        if (vitals.trailShieldRatio > vitals.shieldRatio + 0.002) {
          fx.fillStyle(0xa9dfff, 0.36);
          fx.fillRect(
            u.x - healthWidth / 2 + healthWidth * vitals.shieldRatio,
            u.y - 27,
            healthWidth *
              (vitals.trailShieldRatio - vitals.shieldRatio),
            1,
          );
        }
        if (vitals.shieldRatio > 0) {
          fx.fillStyle(0x9bdcff, 0.95);
          fx.fillRect(
            u.x - healthWidth / 2,
            u.y - 27,
            healthWidth * vitals.shieldRatio,
            1,
          );
        }
      }
      if (health <= 0.3 && u.hp > 0) {
        const danger = 0.55 + 0.4 * Math.sin(this.clock * 8 + u.id);
        fx.lineStyle(1.5, 0xff7b68, danger * 0.75);
        fx.strokeCircle(u.x, u.y - 1, size * 0.53);
        fx.fillStyle(0xffd18a, danger);
        this.polygon(
          fx,
          [
            [u.x, u.y - 31],
            [u.x + 3.5, u.y - 27],
            [u.x, u.y - 23],
            [u.x - 3.5, u.y - 27],
          ],
          0xffd18a,
          danger,
        );
      }
    }
    const livingUnitIds = new Set(s.units.map((unit) => unit.id));
    for (const id of this.unitVitals.keys())
      if (!livingUnitIds.has(id)) this.unitVitals.delete(id);

    this.syncCombatText(s.effects);
    for (const e of s.effects) {
      const progress = 1 - e.life / e.maxLife,
        alpha = Math.max(0, e.life / e.maxLife);
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
              Math.min(0.0042, 0.0016 + weight * 0.000075),
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
                0.00125 + size * 0.00005 * profile.scale,
              ),
              true,
            );
          } else if (e.type === "impact" && (e.radius ?? 0) >= 14) {
            const profile = impactProfile(e.sourceCardId);
            this.cameras.main.shake(
              50 + Math.round(profile.scale * 10),
              Math.min(
                0.0019,
                (0.00068 + ((e.radius ?? 14) - 14) * 0.00016) *
                  profile.scale,
              ),
              true,
            );
          }
        }
      }
      if (e.targetX !== undefined && e.targetY !== undefined) {
        if (e.type === "heal") {
          const visual = healLinkVisual(e);
          if (visual) {
            const dx = e.targetX - e.x;
            const dy = e.targetY - e.y;
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
            fx.lineBetween(e.x, e.y, e.targetX, e.targetY);
            fx.lineStyle(1.2, 0xd8fff0, visual.alpha * 0.42);
            fx.lineBetween(e.x, e.y, e.targetX, e.targetY);

            fx.lineStyle(1.6, healColor, visual.alpha * 0.72);
            fx.strokeCircle(e.x, e.y, visual.sourceRadius);
            fx.lineStyle(1, 0xffffff, visual.alpha * 0.36);
            fx.strokeCircle(e.x, e.y, visual.sourceRadius + 3);
            fx.fillStyle(healColor, visual.alpha * 0.82);
            fx.fillCircle(e.x, e.y, 2.1);

            const targetRadius =
              visual.targetRadius +
              (this.reducedMotion
                ? 0
                : Math.sin(progress * Math.PI) * 3);
            fx.lineStyle(2.2, healColor, visual.alpha * (0.55 + pulse * 0.3));
            fx.strokeCircle(e.targetX, e.targetY, targetRadius);
            fx.lineStyle(1, 0xffffff, visual.alpha * 0.42);
            fx.strokeCircle(e.targetX, e.targetY, Math.max(4, targetRadius - 4));
            fx.fillStyle(0xd8ffe8, visual.alpha * pulse);
            fx.fillCircle(e.targetX, e.targetY, 3.2);

            if (!this.reducedMotion) {
              for (const packet of visual.packets) {
                const lateral =
                  Math.sin(packet.progress * Math.PI) *
                  packet.offset *
                  (4 + visual.intensity * 3);
                const packetX =
                  e.x +
                  dx * packet.progress +
                  px * lateral;
                const packetY =
                  e.y +
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
                  e.x + dx * fraction,
                  e.y + dy * fraction,
                  2,
                );
              }
            }

            const crossRadius = visual.targetRadius + 5;
            fx.lineStyle(1.4, healColor, visual.alpha * 0.55);
            fx.lineBetween(
              e.targetX - 4,
              e.targetY - crossRadius,
              e.targetX + 4,
              e.targetY - crossRadius,
            );
            fx.lineBetween(
              e.targetX,
              e.targetY - crossRadius - 4,
              e.targetX,
              e.targetY - crossRadius + 4,
            );
          }
        } else {
          const source = e.sourceCardId ?? "generic";
          const dx = e.targetX - e.x;
          const dy = e.targetY - e.y;
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
            const centerX = e.targetX - nx * (8 - slash * 3);
            const centerY = e.targetY - ny * (8 - slash * 3);
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
            const x = e.x + dx * travel;
            const y = e.y + dy * travel - arc;
            const tailX = e.x + dx * tailTravel;
            const tailY = e.y + dy * tailTravel - tailArc;

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
                  e.x + dx * smokeTravel,
                  e.y + dy * smokeTravel - smokeArc,
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
                const sx = e.x + dx * t + px * jitter;
                const sy = e.y + dy * t + py * jitter;
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
                e.x,
                e.y,
                2.5 + muzzle * (source === "lancer" ? 3.8 : 2.2),
              );
              fx.lineStyle(1.4, color, alpha * muzzle * 0.8);
              for (let i = 0; i < 4; i++) {
                const angle = i * Math.PI * 0.5 + e.id * 0.31;
                fx.lineBetween(
                  e.x + Math.cos(angle) * 3,
                  e.y + Math.sin(angle) * 3,
                  e.x + Math.cos(angle) * (6 + muzzle * 4),
                  e.y + Math.sin(angle) * (6 + muzzle * 4),
                );
              }
            }

            if (source === "ranger" || source === "lancer" || source === "core-turret") {
              const lockAlpha = alpha * (0.2 + (1 - travel) * 0.45);
              const r = source === "lancer" ? 11 + travel * 3 : 8 + travel * 2;
              const arm = source === "lancer" ? 5 : 4;
              fx.lineStyle(1.2, color, lockAlpha);
              fx.lineBetween(e.targetX - r, e.targetY - r, e.targetX - r + arm, e.targetY - r);
              fx.lineBetween(e.targetX - r, e.targetY - r, e.targetX - r, e.targetY - r + arm);
              fx.lineBetween(e.targetX + r, e.targetY - r, e.targetX + r - arm, e.targetY - r);
              fx.lineBetween(e.targetX + r, e.targetY - r, e.targetX + r, e.targetY - r + arm);
              fx.lineBetween(e.targetX - r, e.targetY + r, e.targetX - r + arm, e.targetY + r);
              fx.lineBetween(e.targetX - r, e.targetY + r, e.targetX - r, e.targetY + r - arm);
              fx.lineBetween(e.targetX + r, e.targetY + r, e.targetX + r - arm, e.targetY + r);
              fx.lineBetween(e.targetX + r, e.targetY + r, e.targetX + r, e.targetY + r - arm);
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
                e.targetX,
                e.targetY,
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
          e.type === "stasis"
            ? 0x88d5ff
            : e.type === "repulsor"
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
        if (e.type === "pulse" || e.type === "blast" || e.type === "capture") {
          fx.fillStyle(effectColor, alpha * 0.22);
          fx.fillCircle(e.x, e.y, 5 + radius * progress);
          fx.lineStyle(2, 0xfff2bf, alpha);
          fx.strokeCircle(e.x, e.y, 3 + radius * progress * 0.65);
        }
        if (e.type === "impact") {
          const profile = impactProfile(e.sourceCardId);
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

          fx.fillStyle(
            0xffffff,
            alpha * (heavy ? 0.42 : 0.27) * Math.min(1.2, profile.scale),
          );
          fx.fillCircle(
            e.x,
            e.y,
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
            const inner = 4 + impactRadius * 0.42;
            const outer =
              inner +
              (heavy ? 8 : 5) *
                profile.scale *
                (1 - progress * 0.35);
            fx.lineBetween(
              e.x + Math.cos(angle) * inner,
              e.y + Math.sin(angle) * inner,
              e.x + Math.cos(angle) * outer,
              e.y + Math.sin(angle) * outer,
            );
          }

          if (profile.kind === "precision") {
            fx.lineStyle(1.2, 0xffffff, alpha * 0.58);
            fx.lineBetween(e.x - impactRadius - 3, e.y, e.x - 3, e.y);
            fx.lineBetween(e.x + 3, e.y, e.x + impactRadius + 3, e.y);
            fx.lineBetween(e.x, e.y - impactRadius - 3, e.x, e.y - 3);
            fx.lineBetween(e.x, e.y + 3, e.x, e.y + impactRadius + 3);
          } else if (profile.kind === "rail") {
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
          } else if (profile.kind === "explosive") {
            fx.fillStyle(profileColor, alpha * 0.16);
            fx.fillCircle(e.x, e.y, impactRadius * 0.78);
            fx.lineStyle(1.4, 0xfff0c4, alpha * 0.55);
            fx.strokeCircle(e.x, e.y, impactRadius + 5);
            for (let i = 0; i < 6; i++) {
              const angle = i * Math.PI / 3 + e.id * 0.19;
              const distance = impactRadius * (0.55 + progress * 0.55);
              fx.fillStyle(i % 2 ? 0xffc368 : 0xd3d7c9, alpha * 0.74);
              fx.fillRect(
                e.x + Math.cos(angle) * distance - 1.5,
                e.y + Math.sin(angle) * distance - 1.5,
                3,
                3,
              );
            }
          } else if (profile.kind === "electric") {
            let lastX = e.x + impactRadius;
            let lastY = e.y;
            for (let i = 1; i <= 8; i++) {
              const angle = (i * Math.PI * 2) / 8;
              const jitter = i % 2 ? 3 : -2;
              const x = e.x + Math.cos(angle) * (impactRadius + jitter);
              const y = e.y + Math.sin(angle) * (impactRadius + jitter);
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
          } else if (profile.kind === "beam") {
            fx.lineStyle(2.2, 0xffffff, alpha * 0.7);
            fx.strokeCircle(e.x, e.y, impactRadius * 0.58);
            fx.fillStyle(profileColor, alpha * 0.2);
            fx.fillCircle(e.x, e.y, impactRadius * 0.45);
          } else if (profile.kind === "breach") {
            fx.lineStyle(2.2, 0xffcf67, alpha * 0.8);
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
          } else if (profile.kind === "melee") {
            fx.lineStyle(1.8, profileColor, alpha * 0.62);
            fx.lineBetween(
              e.x - impactRadius * 0.85,
              e.y + impactRadius * 0.3,
              e.x + impactRadius * 0.5,
              e.y - impactRadius * 0.7,
            );
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
          const beamHeight = 54 * (1 - Math.min(1, progress * 1.45));
          const ring = 7 + 19 * progress;
          fx.fillStyle(effectColor, alpha * 0.08);
          fx.fillRect(e.x - 7, e.y - 8 - beamHeight, 14, beamHeight + 8);
          fx.lineStyle(1.5, 0xffffff, alpha * 0.62);
          fx.lineBetween(e.x - 4, e.y - 9 - beamHeight, e.x - 4, e.y + 2);
          fx.lineBetween(e.x + 4, e.y - 9 - beamHeight, e.x + 4, e.y + 2);
          fx.lineStyle(2.2, effectColor, alpha * 0.9);
          fx.strokeEllipse(e.x, e.y + 6, ring * 1.5, ring * 0.48);
          fx.fillStyle(effectColor, alpha * 0.18);
          fx.fillEllipse(e.x, e.y + 6, ring * 1.25, ring * 0.38);
          for (let i = 0; i < 4; i++) {
            const angle = i * Math.PI / 2 + Math.PI / 4;
            const inner = 13 + 8 * progress;
            const outer = inner + 7;
            fx.lineBetween(
              e.x + Math.cos(angle) * inner,
              e.y + 6 + Math.sin(angle) * inner * 0.36,
              e.x + Math.cos(angle) * outer,
              e.y + 6 + Math.sin(angle) * outer * 0.36,
            );
          }
        }
        if (e.type === "heal") {
          const lift = progress * 18;
          fx.fillStyle(effectColor, alpha);
          fx.fillRect(e.x - 2, e.y - 10 - lift, 4, 15);
          fx.fillRect(e.x - 7, e.y - 5 - lift, 14, 4);
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
        if (e.type === "pulse") {
          const wave = 8 + radius * progress;
          fx.fillStyle(effectColor, alpha * 0.08);
          fx.fillCircle(e.x, e.y, wave);
          fx.lineStyle(3.5, effectColor, alpha * 0.9);
          fx.strokeCircle(e.x, e.y, wave);
          fx.lineStyle(1.5, 0xffffff, alpha * 0.5);
          fx.strokeCircle(e.x, e.y, Math.max(4, wave * 0.58));
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4 + e.id * 0.13;
            const inner = wave * 0.68;
            const outer = wave * 0.94;
            fx.lineBetween(
              e.x + Math.cos(angle) * inner,
              e.y + Math.sin(angle) * inner,
              e.x + Math.cos(angle) * outer,
              e.y + Math.sin(angle) * outer,
            );
          }
        }
        if (e.type === "rally") {
          const wave = 12 + radius * progress;
          fx.fillStyle(effectColor, alpha * 0.045);
          fx.fillCircle(e.x, e.y, wave);
          fx.lineStyle(2, effectColor, alpha * 0.92);
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3 - Math.PI / 2;
            const cx = e.x + Math.cos(angle) * wave * 0.62;
            const cy = e.y + Math.sin(angle) * wave * 0.62;
            const tx = Math.cos(angle);
            const ty = Math.sin(angle);
            const px = -ty;
            const py = tx;
            const tipX = cx + tx * 8;
            const tipY = cy + ty * 8;
            fx.lineBetween(cx - tx * 5 + px * 4, cy - ty * 5 + py * 4, tipX, tipY);
            fx.lineBetween(cx - tx * 5 - px * 4, cy - ty * 5 - py * 4, tipX, tipY);
          }
          fx.lineStyle(1.5, 0xd8ffe8, alpha * 0.6);
          fx.strokeCircle(e.x, e.y, wave * 0.82);
        }
        if (e.type === "stasis") {
          const wave = 10 + radius * progress;
          fx.fillStyle(effectColor, alpha * 0.055);
          this.polygon(fx, this.hex(e.x, e.y, wave), effectColor, alpha * 0.055, effectColor);
          fx.lineStyle(2.2, effectColor, alpha * 0.92);
          this.polygon(fx, this.hex(e.x, e.y, wave), 0x000000, 0, effectColor);
          fx.lineStyle(1.2, 0xe6f7ff, alpha * 0.62);
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3 - Math.PI / 6;
            const inner = wave * 0.35;
            const outer = wave * 0.83;
            fx.lineBetween(
              e.x + Math.cos(angle) * inner,
              e.y + Math.sin(angle) * inner,
              e.x + Math.cos(angle) * outer,
              e.y + Math.sin(angle) * outer,
            );
            const dotAngle = angle + this.clock * 0.7;
            fx.fillStyle(0xe6f7ff, alpha * 0.72);
            fx.fillCircle(
              e.x + Math.cos(dotAngle) * wave * 0.72,
              e.y + Math.sin(dotAngle) * wave * 0.72,
              1.5,
            );
          }
        }
        if (e.type === "repulsor") {
          const wave = 10 + radius * progress;
          fx.fillStyle(effectColor, alpha * 0.04);
          fx.fillCircle(e.x, e.y, wave);
          fx.lineStyle(2.2, effectColor, alpha * 0.92);
          fx.strokeCircle(e.x, e.y, wave);
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const tx = Math.cos(angle);
            const ty = Math.sin(angle);
            const px = -ty;
            const py = tx;
            const inner = wave * 0.5;
            const outer = wave * 0.94;
            const sx = e.x + tx * inner;
            const sy = e.y + ty * inner;
            const ex = e.x + tx * outer;
            const ey = e.y + ty * outer;
            fx.lineBetween(sx, sy, ex, ey);
            fx.lineBetween(ex, ey, ex - tx * 6 + px * 3.5, ey - ty * 6 + py * 3.5);
            fx.lineBetween(ex, ey, ex - tx * 6 - px * 3.5, ey - ty * 6 - py * 3.5);
          }
        }
        if (e.type === "breaker") {
          const wave = 7 + radius * progress;
          fx.fillStyle(effectColor, alpha * 0.07);
          this.polygon(
            fx,
            this.hex(e.x, e.y, wave),
            effectColor,
            alpha * 0.07,
            effectColor,
          );
          fx.lineStyle(2.4, effectColor, alpha * 0.95);
          this.polygon(
            fx,
            this.hex(e.x, e.y, wave),
            0x000000,
            0,
            effectColor,
          );
          fx.lineStyle(1.8, 0xffffff, alpha * 0.72);
          const slash = wave * 0.72;
          fx.lineBetween(
            e.x - slash,
            e.y - slash * 0.25,
            e.x + slash,
            e.y + slash * 0.25,
          );
          fx.lineBetween(
            e.x - slash * 0.25,
            e.y + slash,
            e.x + slash * 0.25,
            e.y - slash,
          );
        }
        if (e.type === "pioneer") {
          const wave = 10 + radius * progress;
          fx.fillStyle(effectColor, alpha * 0.045);
          fx.fillCircle(e.x, e.y, wave);
          fx.lineStyle(2.1, effectColor, alpha * 0.92);
          fx.strokeCircle(e.x, e.y, wave);
          fx.lineStyle(1.5, 0xffffff, alpha * 0.6);
          for (const offset of [-1, 0, 1]) {
            const px = e.x + offset * 11;
            const tipY = e.y - 8 - progress * 15;
            fx.lineBetween(px, e.y + 9, px, tipY + 6);
            fx.lineBetween(px, tipY, px - 4, tipY + 6);
            fx.lineBetween(px, tipY, px + 4, tipY + 6);
          }
        }
        if (e.type === "shield") {
          const wave = 9 + radius * progress;
          fx.fillStyle(effectColor, alpha * 0.045);
          this.polygon(fx, this.hex(e.x, e.y, wave), effectColor, alpha * 0.045, effectColor);
          fx.lineStyle(2, effectColor, alpha * 0.82);
          this.polygon(fx, this.hex(e.x, e.y, wave), 0x000000, 0, effectColor);
          fx.lineStyle(1, 0xffffff, alpha * 0.38);
          this.polygon(fx, this.hex(e.x, e.y, Math.max(4, wave - 4)), 0x000000, 0, 0xffffff);
        }
        if (
          e.type !== "pulse" &&
          e.type !== "rally" &&
          e.type !== "stasis" &&
          e.type !== "repulsor" &&
          e.type !== "breaker" &&
          e.type !== "pioneer" &&
          e.type !== "shield" &&
          e.type !== "commander"
        ) {
          fx.lineStyle(2, effectColor, alpha);
          fx.strokeCircle(e.x, e.y, 5 + radius * progress);
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
            const angle = Math.atan2(direction.ny, direction.nx);
            fx.strokeEllipse(
              centerX,
              centerY,
              (10 + burst * 2) * direction.stretch,
              10 + burst * 1.28,
              angle,
            );
          } else {
            fx.strokeCircle(centerX, centerY, 5 + burst);
          }

          fx.lineStyle(1.2, 0xffe5ba, fade * 0.58);
          fx.strokeEllipse(
            centerX,
            centerY + 7,
            (14 + burst * 1.55) * (direction.active ? direction.stretch : 1),
            5 + burst * 0.5,
            direction.active ? Math.atan2(direction.ny, direction.nx) : 0,
          );

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
              fx.strokeEllipse(
                centerX,
                centerY,
                (burst + 8 + profile.scale * 4) *
                  2 *
                  direction.stretch,
                (burst + 8 + profile.scale * 4) * 1.5,
                Math.atan2(direction.ny, direction.nx),
              );
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
          const pulse = 0.75 + 0.2 * Math.sin(this.clock * 6 + target.id);
          fx.lineStyle(2.2, targetColor, pulse);
          fx.strokeCircle(target.x, target.y, target.radius + 9);
          fx.lineStyle(1, 0xffffff, pulse * 0.55);
          fx.strokeCircle(target.x, target.y, target.radius + 13);
          const damage = abilityTargets?.damage.find(
            (result) => result.unitId === target.id,
          );
          if (damage?.shieldDamage) {
            const mark = target.radius + 16;
            fx.lineStyle(1.5, 0x88d5ff, 0.82);
            fx.arc(
              target.x,
              target.y,
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
              target.x - mark * 0.45,
              target.y - mark * 0.45,
              target.x + mark * 0.45,
              target.y + mark * 0.45,
            );
            fx.lineBetween(
              target.x + mark * 0.45,
              target.y - mark * 0.45,
              target.x - mark * 0.45,
              target.y + mark * 0.45,
            );
          }
          const healing = abilityTargets?.healing.find(
            (result) => result.unitId === target.id,
          );
          if (healing) {
            const mark = target.radius + 17;
            fx.lineStyle(2, 0x73ff9d, 0.9);
            fx.lineBetween(target.x - 4, target.y - mark, target.x + 4, target.y - mark);
            fx.lineBetween(target.x, target.y - mark - 4, target.x, target.y - mark + 4);
          }
          if (abilityTargets?.tempoUnitIds.includes(target.id)) {
            const mark = target.radius + 18;
            fx.lineStyle(1.5, 0xffdf6b, 0.78);
            fx.lineBetween(
              target.x - mark * 0.55,
              target.y + mark * 0.25,
              target.x,
              target.y + mark * 0.55,
            );
            fx.lineBetween(
              target.x,
              target.y + mark * 0.55,
              target.x + mark * 0.55,
              target.y + mark * 0.25,
            );
          }
          const slow = abilityTargets?.slows.find(
            (result) => result.unitId === target.id,
          );
          if (slow && !slow.changed) {
            const mark = target.radius + 17;
            fx.lineStyle(1.8, NEUTRAL, 0.8);
            fx.lineBetween(
              target.x - mark * 0.45,
              target.y,
              target.x + mark * 0.45,
              target.y,
            );
          }
          const movement = abilityTargets?.movements.find(
            (result) => result.unitId === target.id,
          );
          if (movement && !movement.changed) {
            const mark = target.radius + 17;
            fx.lineStyle(2, NEUTRAL, 0.9);
            fx.lineBetween(
              target.x - mark * 0.5,
              target.y - mark * 0.5,
              target.x + mark * 0.5,
              target.y + mark * 0.5,
            );
            fx.lineBetween(
              target.x + mark * 0.5,
              target.y - mark * 0.5,
              target.x - mark * 0.5,
              target.y + mark * 0.5,
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
          const dx = movement.x - target.x;
          const dy = movement.y - target.y;
          const travel = movement.distance;
          if (travel < 1) continue;
          const ux = dx / travel;
          const uy = dy / travel;
          const px = -uy;
          const py = ux;
          const startX = target.x + ux * (target.radius + 10);
          const startY = target.y + uy * (target.radius + 10);
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
  ) {
    const g = this.g,
      color = team === "player" ? MINT : CORAL;
    const pressure = corePressure(fraction, 1);
    const destroyed = pressure.state === "destroyed";
    if (turretTarget && !destroyed) {
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
      g.lineBetween(x, y, turretTarget.x, turretTarget.y);

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
          const tx = turretTarget.x + sx * r;
          const ty = turretTarget.y + sy * r;
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
        fx.strokeCircle(turretTarget.x, turretTarget.y, lockRadius);
        fx.fillStyle(0xffffff, 0.5 + lockPulse * 0.28);
        fx.fillCircle(
          turretTarget.x,
          turretTarget.y,
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
    const turretRecoil =
      fireFeedback.active && !this.reducedMotion ? fireFeedback.recoil : 0;
    const turretX = x - fireFeedback.nx * turretRecoil;
    const turretY = y - 3 - fireFeedback.ny * turretRecoil;

    this.polygon(g, this.hex(x, y - 2, 22), 0x47635a, 1, color);
    this.polygon(g, this.hex(turretX, turretY, 15), 0x132627, 1, color);

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
    this.polygon(
      g,
      [
        [turretX, turretY - 10],
        [turretX + 8, turretY],
        [turretX, turretY + 10],
        [turretX - 8, turretY],
      ],
      color,
      fireFeedback.active
        ? 0.78 + fireFeedback.strength * 0.2
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
