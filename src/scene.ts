import { ARENA_THEMES, type ArenaThemeId } from "./arena-themes";
import Phaser from "phaser";
import { abilityTargetPreview, Match, CARDS } from "./engine";
import { unitSvg } from "./art";

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
  private unitMotion = new Map<number, { x: number; y: number; phase: number }>();
  private labels: Phaser.GameObjects.Text[] = [];
  private pointer: { x: number; y: number } | null = null;
  private aim: {
    pointerId: number;
    cardId: string | null;
    match: Match;
  } | null = null;
  private ghost!: Phaser.GameObjects.Image;
  private aimLabel!: Phaser.GameObjects.Text;
  private clock = 0;
  private reactedEffects = new Set<number>();
  private brokenCores = new Set<"player" | "enemy">();
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
    this.g = this.add.graphics();
    this.fx = this.add.graphics().setDepth(5);
    this.ghost = this.add
      .image(0, 0, "vanguard-player")
      .setDepth(6)
      .setVisible(false);
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
    this.ghost.setVisible(false);
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
      this.unitMotion.clear();
      this.reactedEffects.clear();
      this.brokenCores.clear();
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
    // Continuous supply boundary, with a highlighted deploy zone when selecting a unit.
    const frontShape = (team: "player" | "enemy") => [
      [18, m.frontline(team, 85)],
      [147.5, m.frontline(team, 85)],
      [147.5, m.frontline(team, 210)],
      [272.5, m.frontline(team, 210)],
      [272.5, m.frontline(team, 335)],
      [402, m.frontline(team, 335)],
    ];
    const front = frontShape("player"),
      enemyFront = frontShape("enemy");
    this.polygon(g, [...enemyFront, [402, 65], [18, 65]], CORAL, 0.045);
    this.polygon(
      g,
      [...front, [402, 495], [18, 495]],
      MINT,
      this.bridge.selected() &&
        CARDS.find((c) => c.id === this.bridge.selected())?.kind === "unit"
        ? 0.12
        : 0.045,
    );
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
    g.lineStyle(2, MINT, playerCaptureWave ? 0.92 : 0.65);
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
    for (const p of s.points) {
      if (m.controlObjective?.pointIds.includes(p.id)) {
        const relayColor =
          p.owner === "player" && p.supplied
            ? MINT
            : p.owner === "enemy" && p.supplied
              ? CORAL
              : 0xf3dc82;
        const relayPulse = 0.55 + 0.3 * Math.sin(this.clock * 3 + p.id);
        g.lineStyle(4, relayColor, 0.08 + relayPulse * 0.08);
        g.strokeRoundedRect(p.x - 41, p.y - 41, 82, 82, 14);
        g.lineStyle(2, relayColor, 0.62 + relayPulse * 0.28);
        g.strokeRoundedRect(p.x - 38, p.y - 38, 76, 76, 12);
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
        g.lineStyle(8, 0x102540, 0.92);
        g.strokeCircle(p.x, p.y, 30);
        g.lineStyle(5, captureColor, 0.95);
        g.beginPath();
        g.arc(p.x, p.y, 30, -Math.PI / 2, endAngle, false);
        g.strokePath();
        g.lineStyle(2, 0xffffff, 0.32);
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
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(
          p.x + Math.cos(endAngle) * 30,
          p.y + Math.sin(endAngle) * 30,
          2.5,
        );
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
      this.labels[p.id]
        ?.setText(
          `${"ABC"[p.id % 3]}${Math.floor(p.id / 3) + 1}${p.contested ? " · KAMPF" : p.capture > 0.01 ? ` · ${Math.floor(p.capture * 100)}%` : p.owner && !p.supplied ? " · GETRENNT" : ""}`,
        )
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
    const enemyCoreHit = s.effects.find(
      (effect) =>
        effect.type === "core-hit" &&
        Math.abs(effect.x - s.cores.enemy.x) < 2 &&
        Math.abs(effect.y - s.cores.enemy.y) < 2,
    );
    const playerCoreHit = s.effects.find(
      (effect) =>
        effect.type === "core-hit" &&
        Math.abs(effect.x - s.cores.player.x) < 2 &&
        Math.abs(effect.y - s.cores.player.y) < 2,
    );
    this.drawCore(
      210,
      35,
      "enemy",
      s.cores.enemy.hp / s.cores.enemy.maxHp,
      enemyCoreHit ? enemyCoreHit.life / enemyCoreHit.maxLife : 0,
    );
    this.drawCore(
      210,
      525,
      "player",
      s.cores.player.hp / s.cores.player.maxHp,
      playerCoreHit ? playerCoreHit.life / playerCoreHit.maxLife : 0,
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
      const previous = this.unitMotion.get(u.id);
      const moved = previous ? Math.hypot(u.x - previous.x, u.y - previous.y) : 0;
      const moving = moved > 0.015;
      const phase = (previous?.phase ?? u.id * 0.71) + Math.min(0.9, moved * 0.42);
      this.unitMotion.set(u.id, { x: u.x, y: u.y, phase });
      const walkBob = moving ? Math.sin(phase) * 1.6 : 0;
      const walkScale = moving ? 1 + Math.sin(phase * 2) * 0.018 : 1;
      const firing = s.effects.find(
        (effect) =>
          effect.type === "shot" &&
          effect.team === u.team &&
          Math.hypot(effect.x - u.x, effect.y - u.y) < 5 &&
          effect.targetX !== undefined &&
          effect.targetY !== undefined,
      );
      let recoilX = 0;
      let recoilY = 0;
      let recoilScale = 1;
      if (firing && firing.targetX !== undefined && firing.targetY !== undefined) {
        const dx = firing.targetX - firing.x;
        const dy = firing.targetY - firing.y;
        const d = Math.max(0.01, Math.hypot(dx, dy));
        const recoil = Math.min(1, firing.life / firing.maxLife) * 3.2;
        recoilX = -(dx / d) * recoil;
        recoilY = -(dy / d) * recoil;
        recoilScale = 1.035;
      }
      sprite
        .setPosition(
          u.x + recoilX,
          u.y - 3 - (1 - spawnProgress) * 8 + walkBob + recoilY,
        )
        .setDisplaySize(
          size * spawnScale * walkScale * recoilScale,
          size * spawnScale * walkScale * recoilScale,
        )
        .setAngle(moving ? Math.sin(phase) * 1.6 : 0)
        .setAlpha(
          u.hp > 0
            ? spawnEffect
              ? Math.min(1, 0.25 + spawnProgress * 1.3)
              : 1
            : 0,
        );
      g.fillStyle(0x06171b, 0.55);
      g.fillEllipse(u.x, u.y + 6, size * 0.65, size * 0.25);
      g.lineStyle(2, u.team === "player" ? MINT : CORAL, 0.9);
      g.strokeEllipse(u.x, u.y + 7, size * 0.75, size * 0.32);
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
      const health = Math.max(0, u.hp / u.maxHp);
      const healthColor =
        health <= 0.3 ? 0xff6f5f : health <= 0.55 ? 0xffcf68 : u.team === "player" ? MINT : CORAL;
      fx.fillStyle(0x061519, 0.9);
      fx.fillRoundedRect(
        u.x - healthWidth / 2 - 1,
        u.y - 23,
        healthWidth + 2,
        4,
        2,
      );
      fx.fillStyle(healthColor);
      fx.fillRect(
        u.x - healthWidth / 2,
        u.y - 22,
        healthWidth * health,
        2,
      );
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
    for (const e of s.effects) {
      const progress = 1 - e.life / e.maxLife,
        alpha = Math.max(0, e.life / e.maxLife);
      const color = e.team === "player" ? MINT : CORAL;
      if (!this.reactedEffects.has(e.id)) {
        this.reactedEffects.add(e.id);
        if (e.type === "core-hit")
          this.cameras.main.shake(90, 0.0024, true);
      }
      if (e.targetX !== undefined && e.targetY !== undefined) {
        if (e.type === "heal") {
          fx.lineStyle(2, color, alpha * 0.55);
          fx.lineBetween(e.x, e.y, e.targetX, e.targetY);
          const pulse = 0.7 + 0.3 * Math.sin(progress * Math.PI * 5);
          fx.fillStyle(0xd8ffe8, alpha * pulse);
          fx.fillCircle(e.targetX, e.targetY, 3.2);
        } else {
          const travel = Math.min(1, progress * 2.35);
          const tail = Math.max(0, travel - 0.2);
          const x = e.x + (e.targetX - e.x) * travel;
          const y = e.y + (e.targetY - e.y) * travel;
          const tailX = e.x + (e.targetX - e.x) * tail;
          const tailY = e.y + (e.targetY - e.y) * tail;
          fx.lineStyle(2.2, color, alpha * 0.85);
          fx.lineBetween(tailX, tailY, x, y);
          fx.fillStyle(0xffffff, alpha);
          fx.fillCircle(x, y, 2.6);
          fx.fillStyle(color, alpha * 0.55);
          fx.fillCircle(x, y, 4.5);
          if (travel < 0.42) {
            const muzzle = 1 - travel / 0.42;
            fx.fillStyle(0xffffff, alpha * muzzle * 0.72);
            fx.fillCircle(e.x, e.y, 2.5 + muzzle * 2.2);
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
          if (e.type === "shot") {
            const lockAlpha = alpha * (0.2 + (1 - travel) * 0.45);
            const r = 8 + travel * 2;
            const arm = 4;
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
            fx.lineStyle(1.4, color, alpha * (1 - impact));
            fx.strokeCircle(e.targetX, e.targetY, 3 + impact * 9);
          }
        }
      } else {
        const radius =
          e.radius ??
          (e.type === "pulse" || e.type === "rally"
            ? 75
            : e.type === "capture"
              ? 45
              : e.type === "death"
                ? 15
                : 23);
        const effectColor =
          e.type === "stasis"
            ? 0x88d5ff
            : e.type === "repulsor"
              ? 0xc29aff
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
          const heavy = (e.radius ?? 0) >= 12;
          const impactRadius = 3 + (e.radius ?? 9) * progress;
          fx.fillStyle(0xffffff, alpha * (heavy ? 0.46 : 0.3));
          fx.fillCircle(e.x, e.y, 2.8 + (heavy ? 1.8 : 0.8));
          fx.lineStyle(heavy ? 2.2 : 1.5, effectColor, alpha * 0.92);
          fx.strokeCircle(e.x, e.y, impactRadius);
          const rays = heavy ? 8 : 5;
          for (let i = 0; i < rays; i++) {
            const angle = (i * Math.PI * 2) / rays + e.id * 0.37;
            const inner = 4 + impactRadius * 0.42;
            const outer = inner + (heavy ? 8 : 5) * (1 - progress * 0.35);
            fx.lineBetween(
              e.x + Math.cos(angle) * inner,
              e.y + Math.sin(angle) * inner,
              e.x + Math.cos(angle) * outer,
              e.y + Math.sin(angle) * outer,
            );
          }
          if (heavy) {
            fx.lineStyle(1, 0xffffff, alpha * 0.45);
            fx.strokeCircle(e.x, e.y, impactRadius + 5);
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
          const impactRadius = 8 + 22 * progress;
          fx.fillStyle(effectColor, alpha * 0.22);
          fx.fillCircle(e.x, e.y, impactRadius);
          fx.lineStyle(2.2, 0xfff4cf, alpha);
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            fx.lineBetween(
              e.x + Math.cos(angle) * impactRadius * 0.45,
              e.y + Math.sin(angle) * impactRadius * 0.45,
              e.x + Math.cos(angle) * impactRadius,
              e.y + Math.sin(angle) * impactRadius,
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
          e.type !== "shield"
        ) {
          fx.lineStyle(2, effectColor, alpha);
          fx.strokeCircle(e.x, e.y, 5 + radius * progress);
        }
        if (e.type === "death") {
          for (let i = 0; i < 5; i++) {
            const a = i * 1.256 + e.id;
            fx.fillStyle(color, alpha);
            fx.fillRect(
              e.x + Math.cos(a) * radius * progress,
              e.y + Math.sin(a) * radius * progress,
              3,
              3,
            );
          }
        }
      }
    }
    this.ghost.setVisible(false);
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
      const affectedUnits = abilityTargets?.unitIds.length ?? 0;
      const affectedCount = affectedUnits + (abilityTargets?.core ? 1 : 0);
      const targetSummary = abilityTargets?.core
        ? affectedUnits
          ? `${affectedUnits} ${affectedUnits === 1 ? "TRUPPE" : "TRUPPEN"} + KERN`
          : "KERN"
        : affectedUnits
          ? `${affectedUnits} ${affectedUnits === 1 ? "TRUPPE" : "TRUPPEN"}`
          : "0 ZIELE";
      if (this.aim) {
        const actionText =
          card.kind === "ability"
            ? `LOSLASSEN ZUM WIRKEN · ${targetSummary}`
            : "LOSLASSEN ZUM EINSETZEN";
        this.aimLabel
          .setText(valid ? actionText : validation.message)
          .setColor(
            valid
              ? card.kind === "ability" && affectedCount === 0
                ? "#ffd37a"
                : "#83ffcf"
              : "#ff927c",
          )
          .setPosition(
            Math.max(145, Math.min(275, x)),
            y < 115 ? y + 70 : y - 65,
          )
          .setVisible(true);
        if (card.kind === "unit")
          this.ghost
            .setTexture(`${card.id}-player`)
            .setPosition(x, y - 3)
            .setDisplaySize(
              card.id === "bulwark" ? 45 : 36,
              card.id === "bulwark" ? 45 : 36,
            )
            .setAlpha(0.55)
            .setTint(valid ? MINT : CORAL)
            .setVisible(true);
      }
      const previewColor = valid ? MINT : CORAL;
      if (card.kind === "unit") {
        const attackRange = Math.max(18, card.range ?? 18);
        fx.fillStyle(previewColor, valid ? 0.025 : 0.018);
        fx.fillCircle(x, y, attackRange);
        fx.lineStyle(1, previewColor, valid ? 0.22 : 0.16);
        fx.strokeCircle(x, y, attackRange);
        if (attackRange >= 55) {
          for (let i = 0; i < 8; i++) {
            const angle = i * Math.PI * 0.25 + this.clock * 0.18;
            const inner = attackRange - 3;
            const outer = attackRange + 3;
            fx.lineBetween(
              x + Math.cos(angle) * inner,
              y + Math.sin(angle) * inner,
              x + Math.cos(angle) * outer,
              y + Math.sin(angle) * outer,
            );
          }
        }
        fx.lineStyle(1.8, previewColor, 0.72);
        fx.strokeCircle(x, y, 19);
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
        }
        if (abilityTargets?.core) {
          const core = s.cores.enemy;
          const pulse = 0.72 + 0.22 * Math.sin(this.clock * 6);
          fx.lineStyle(2.4, targetColor, pulse);
          fx.strokeCircle(core.x, core.y, 31);
          fx.lineStyle(1, 0xffffff, pulse * 0.5);
          fx.strokeCircle(core.x, core.y, 36);
        }
        for (const movement of abilityTargets?.movements ?? []) {
          const target = s.units.find((unit) => unit.id === movement.unitId);
          if (!target) continue;
          const dx = movement.x - target.x;
          const dy = movement.y - target.y;
          const travel = Math.hypot(dx, dy);
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
  }
  private drawCore(
    x: number,
    y: number,
    team: "player" | "enemy",
    fraction: number,
    hitAlpha = 0,
  ) {
    const g = this.g,
      color = team === "player" ? MINT : CORAL;
    const destroyed = fraction <= 0;
    if (destroyed && !this.brokenCores.has(team)) {
      this.brokenCores.add(team);
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
    this.polygon(g, this.hex(x, y - 2, 22), 0x47635a, 1, color);
    this.polygon(g, this.hex(x, y - 3, 15), 0x132627, 1, color);
    if (fraction <= 0.6) {
      g.lineStyle(1.5, 0xffd18f, fraction <= 0.3 ? 0.82 : 0.52);
      g.lineBetween(x - 12, y - 13, x - 4, y - 6);
      g.lineBetween(x - 4, y - 6, x - 9, y + 1);
      g.lineBetween(x + 10, y - 10, x + 3, y - 2);
      if (fraction <= 0.3) {
        g.lineBetween(x + 3, y - 2, x + 10, y + 7);
        g.lineBetween(x - 9, y + 1, x - 3, y + 8);
      }
    }
    this.polygon(
      g,
      [
        [x, y - 13],
        [x + 8, y - 3],
        [x, y + 7],
        [x - 8, y - 3],
      ],
      color,
      0.65 + 0.25 * Math.sin(this.clock * 2),
    );
    g.fillStyle(0x061315);
    g.fillRect(x - 27, y + 26, 54, 3);
    g.fillStyle(color);
    g.fillRect(x - 27, y + 26, 54 * Math.max(0, fraction), 3);
    if (fraction <= 0.3) {
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
      const flash = Math.min(0.75, hitAlpha * 0.8);
      this.polygon(g, this.hex(x, y - 3, 24), 0xffffff, flash * 0.18);
      g.lineStyle(2, 0xffffff, flash);
      g.strokeCircle(x, y - 2, 21 + (1 - hitAlpha) * 9);
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
