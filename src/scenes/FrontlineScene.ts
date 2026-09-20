import Phaser from "phaser";

type Side = "player" | "enemy";
type UnitKind = "vanguard" | "striker" | "ranger" | "hunter" | "runner" | "warden";
type AbilityKind = "surge" | "repulse";

interface UnitDefinition {
  name: string;
  short: string;
  cost: number;
  hp: number;
  damage: number;
  range: number;
  speed: number;
  cooldown: number;
  radius: number;
  role: string;
  color: number;
  heavy?: boolean;
  support?: boolean;
}

interface UnitEntity {
  id: number;
  side: Side;
  kind: UnitKind;
  def: UnitDefinition;
  lane: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  nextAttackAt: number;
  nextSupportAt: number;
  dead: boolean;
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Arc;
  hpBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

interface CardUi {
  rect: Phaser.GameObjects.Rectangle;
  title: Phaser.GameObjects.Text;
  cost: Phaser.GameObjects.Text;
  kind?: UnitKind;
  ability?: AbilityKind;
  baseFill: number;
}

interface MatchStats {
  playerDeploys: number;
  enemyDeploys: number;
  playerEnergySpent: number;
  enemyEnergySpent: number;
  playerKills: number;
  enemyKills: number;
  damageToEnemyCore: number;
  damageToPlayerCore: number;
  playerAbilities: number;
  enemyAbilities: number;
  bestPlayerFrontlineY: number;
  bestEnemyFrontlineY: number;
}

const WIDTH = 390;
const HEIGHT = 844;
const ARENA_TOP = 150;
const ARENA_BOTTOM = 640;
const UI_TOP = 650;
const LANES = [92, 195, 298];
const PLAYER_CORE_Y = 614;
const ENEMY_CORE_Y = 176;
const PLAYER_SPAWN_Y = 585;
const ENEMY_SPAWN_Y = 205;
const MATCH_LENGTH_MS = 180_000;
const MAX_ENERGY = 10;
const MAX_ACTIVE_UNITS_PER_SIDE = 14;
const DEPLOY_LOCK_MS = 420;

const UNIT_DEFS: Record<UnitKind, UnitDefinition> = {
  vanguard: {
    name: "Vanguard",
    short: "VAN",
    cost: 4,
    hp: 390,
    damage: 28,
    range: 31,
    speed: 25,
    cooldown: 0.95,
    radius: 15,
    role: "Tank / anti-brawler",
    color: 0x62a8ff,
    heavy: true,
  },
  striker: {
    name: "Striker",
    short: "STR",
    cost: 3,
    hp: 220,
    damage: 42,
    range: 32,
    speed: 38,
    cooldown: 0.75,
    radius: 13,
    role: "Duelist / anti-runner",
    color: 0xffb24a,
  },
  ranger: {
    name: "Ranger",
    short: "RNG",
    cost: 3,
    hp: 150,
    damage: 46,
    range: 112,
    speed: 24,
    cooldown: 1.05,
    radius: 12,
    role: "Backline damage",
    color: 0x91e66d,
  },
  hunter: {
    name: "Hunter",
    short: "HNT",
    cost: 4,
    hp: 190,
    damage: 58,
    range: 76,
    speed: 28,
    cooldown: 1.2,
    radius: 13,
    role: "Anti-heavy",
    color: 0xd690ff,
  },
  runner: {
    name: "Runner",
    short: "RUN",
    cost: 2,
    hp: 115,
    damage: 26,
    range: 24,
    speed: 66,
    cooldown: 0.55,
    radius: 10,
    role: "Fast backline diver",
    color: 0x45e6d1,
  },
  warden: {
    name: "Warden",
    short: "WRD",
    cost: 3,
    hp: 210,
    damage: 20,
    range: 72,
    speed: 27,
    cooldown: 1.1,
    radius: 13,
    role: "Support / sustain",
    color: 0xff7fb4,
    support: true,
  },
};

const ABILITY_COST: Record<AbilityKind, number> = {
  surge: 3,
  repulse: 4,
};

const ABILITY_COOLDOWN_MS: Record<AbilityKind, number> = {
  surge: 8_000,
  repulse: 10_000,
};

export class FrontlineScene extends Phaser.Scene {
  private units: UnitEntity[] = [];
  private nextUnitId = 1;

  private playerEnergy = 5;
  private enemyEnergy = 5;
  private playerCoreHp = 1200;
  private enemyCoreHp = 1200;
  private readonly maxCoreHp = 1200;

  private frontLineY = 395;
  private remainingMs = MATCH_LENGTH_MS;
  private breakthroughSide: Side | null = null;
  private breakthroughMs = 0;
  private matchEnded = false;
  private preMatchMs = 3_000;
  private matchLive = false;

  private selectedKind: UnitKind | null = null;
  private botDecisionMs = 800;
  private botAbilityMs = 5000;
  private playerSurgeUntil = 0;
  private enemySurgeUntil = 0;
  private abilityReadyAt: Record<Side, Record<AbilityKind, number>> = {
    player: { surge: 0, repulse: 0 },
    enemy: { surge: 0, repulse: 0 },
  };
  private counterTextReadyAt = 0;
  private stats: MatchStats = this.createEmptyStats();
  private deployReadyAt: Record<Side, number[]> = {
    player: [0, 0, 0],
    enemy: [0, 0, 0],
  };
  private matchNumber = 0;
  private tutorialStep = 0;
  private tutorialFinishAt = 0;

  private arenaGraphics!: Phaser.GameObjects.Graphics;
  private frontLineGraphics!: Phaser.GameObjects.Graphics;
  private enemyCoreBar!: Phaser.GameObjects.Rectangle;
  private playerCoreBar!: Phaser.GameObjects.Rectangle;
  private timerText!: Phaser.GameObjects.Text;
  private energyText!: Phaser.GameObjects.Text;
  private energyBar!: Phaser.GameObjects.Rectangle;
  private statusText!: Phaser.GameObjects.Text;
  private frontLineText!: Phaser.GameObjects.Text;
  private holdText!: Phaser.GameObjects.Text;
  private commanderText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private controlText!: Phaser.GameObjects.Text;
  private controlMarker!: Phaser.GameObjects.Rectangle;
  private laneHighlights: Phaser.GameObjects.Rectangle[] = [];
  private lanePressureTexts: Phaser.GameObjects.Text[] = [];

  private cards: CardUi[] = [];
  private lastUiRefresh = 0;

  constructor() {
    super("FrontlineScene");
  }

  create(): void {
    this.units = [];
    this.cards = [];
    this.laneHighlights = [];
    this.lanePressureTexts = [];
    this.nextUnitId = 1;

    this.cameras.main.setBackgroundColor("#07111f");
    this.drawArena();
    this.createHud();
    this.createCards();
    this.bindInput();
    this.resetMatch();
  }

  update(_time: number, delta: number): void {
    if (this.matchEnded) return;

    if (!this.matchLive) {
      this.updatePreMatch(delta);
      return;
    }

    const dt = Math.min(delta, 50) / 1000;
    this.remainingMs = Math.max(0, this.remainingMs - delta);

    const playerComeback = this.frontLineY > 430 ? 1.1 : 1;
    const enemyComeback = this.frontLineY < 360 ? 1.1 : 1;
    const finalMinuteBoost = this.remainingMs <= 60_000 ? 1.25 : 1;
    this.playerEnergy = Math.min(MAX_ENERGY, this.playerEnergy + 1.15 * playerComeback * finalMinuteBoost * dt);
    this.enemyEnergy = Math.min(MAX_ENERGY, this.enemyEnergy + 1.15 * enemyComeback * finalMinuteBoost * dt);

    this.updateUnits(dt);
    this.updateFrontline(dt);
    this.updateBreakthrough(delta);
    this.updateTutorial();
    this.updateBot(delta);
    this.checkMatchEnd();
    this.renderFrontline();

    if (this.time.now - this.lastUiRefresh > 80) {
      this.refreshHud();
      this.refreshCards();
      this.lastUiRefresh = this.time.now;
    }
  }

  private drawArena(): void {
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x07111f);

    this.add.rectangle(WIDTH / 2, (ARENA_TOP + ARENA_BOTTOM) / 2, 350, ARENA_BOTTOM - ARENA_TOP, 0x0b1828)
      .setStrokeStyle(1, 0x25415d, 0.85);

    this.arenaGraphics = this.add.graphics();
    this.arenaGraphics.lineStyle(1, 0x22425d, 0.65);
    this.arenaGraphics.lineBetween(143, ARENA_TOP, 143, ARENA_BOTTOM);
    this.arenaGraphics.lineBetween(247, ARENA_TOP, 247, ARENA_BOTTOM);

    LANES.forEach((laneX, index) => {
      this.add.text(laneX, ARENA_BOTTOM - 20, `LANE ${index + 1}`, {
        fontFamily: "monospace",
        fontSize: "7px",
        color: "#45677f",
        fontStyle: "bold",
      }).setOrigin(0.5).setDepth(3);
    });

    this.lanePressureTexts = LANES.map((laneX) =>
      this.add.text(laneX, ARENA_BOTTOM - 9, "EVEN", {
        fontFamily: "monospace",
        fontSize: "7px",
        color: "#6f8799",
        fontStyle: "bold",
      }).setOrigin(0.5).setDepth(3),
    );

    this.laneHighlights = LANES.map((laneX) =>
      this.add.rectangle(
        laneX,
        (ARENA_TOP + ARENA_BOTTOM) / 2,
        92,
        ARENA_BOTTOM - ARENA_TOP - 10,
        0x55dfff,
        0,
      ).setStrokeStyle(2, 0x55dfff, 0).setDepth(2),
    );

    for (let y = ARENA_TOP + 35; y < ARENA_BOTTOM; y += 52) {
      this.arenaGraphics.lineStyle(1, 0x17324a, 0.4);
      this.arenaGraphics.lineBetween(22, y, 368, y);
    }

    this.add.rectangle(WIDTH / 2, ENEMY_CORE_Y, 126, 38, 0x35151c)
      .setStrokeStyle(2, 0xff596d);
    this.add.text(WIDTH / 2, ENEMY_CORE_Y, "ENEMY CORE", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#ff9aaa",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.add.rectangle(WIDTH / 2, PLAYER_CORE_Y, 126, 38, 0x102b39)
      .setStrokeStyle(2, 0x52d8ff);
    this.add.text(WIDTH / 2, PLAYER_CORE_Y, "YOUR CORE", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#8fe8ff",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.frontLineGraphics = this.add.graphics();
    this.frontLineText = this.add.text(28, this.frontLineY - 18, "FRONTLINE", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#f5e277",
      fontStyle: "bold",
    });
  }

  private createHud(): void {
    this.add.text(18, 18, "FRONTLINE", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#ffffff",
      fontStyle: "bold",
    });

    this.add.text(18, 43, "FIELD TEST // v0.4", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#6e91ac",
    });

    this.timerText = this.add.text(WIDTH / 2, 31, "03:00", {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#f3f7fb",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.countdownText = this.add.text(WIDTH / 2, 360, "", {
      fontFamily: "monospace",
      fontSize: "54px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#07111f",
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(80).setVisible(false);

    this.add.text(18, 74, "ENEMY", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#ff8898",
    });
    this.add.rectangle(69, 79, 102, 8, 0x35151c).setOrigin(0, 0.5);
    this.enemyCoreBar = this.add.rectangle(69, 79, 102, 8, 0xff596d).setOrigin(0, 0.5);

    this.add.text(18, 98, "YOU", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#7de4ff",
    });
    this.add.rectangle(69, 103, 102, 8, 0x123244).setOrigin(0, 0.5);
    this.playerCoreBar = this.add.rectangle(69, 103, 102, 8, 0x52d8ff).setOrigin(0, 0.5);

    this.commanderText = this.add.text(220, 74, "CMD: AEGIS", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#8faabd",
    });
    this.add.text(220, 88, "RALLY: +10% energy when pressured", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#5f7e94",
    });

    this.add.text(220, 103, "CONTROL", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: "#607f94",
    });
    this.add.rectangle(268, 108, 92, 5, 0x203141).setOrigin(0, 0.5);
    this.controlMarker = this.add.rectangle(314, 108, 3, 11, 0xf2d86c).setOrigin(0.5);
    this.controlText = this.add.text(362, 103, "50/50", {
      fontFamily: "monospace",
      fontSize: "7px",
      color: "#879eae",
    }).setOrigin(1, 0);

    this.statusText = this.add.text(WIDTH / 2, 126, "SELECT A UNIT, THEN TAP A LANE", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#8aa7bc",
    }).setOrigin(0.5);

    this.phaseText = this.add.text(WIDTH / 2, 139, "", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#70a0bd",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.holdText = this.add.text(WIDTH / 2, 149, "", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#f7dc6f",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.add.rectangle(WIDTH / 2, 672, 354, 30, 0x091522)
      .setStrokeStyle(1, 0x2f5670);

    this.add.text(25, 662, "ENERGY", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#7ca7c2",
    });

    this.add.rectangle(88, 676, 222, 8, 0x142b3b).setOrigin(0, 0.5);
    this.energyBar = this.add.rectangle(88, 676, 222, 8, 0x58e0ba).setOrigin(0, 0.5);

    this.energyText = this.add.text(324, 671, "5.0 / 10", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#8ff3d5",
      fontStyle: "bold",
    }).setOrigin(0.5);
  }

  private createCards(): void {
    const cardW = 82;
    const cardH = 56;
    const startX = 18;
    const gap = 8;
    const rows = [706, 772];

    const entries: Array<{ kind?: UnitKind; ability?: AbilityKind; title: string; cost: number; fill: number }> = [
      { kind: "vanguard", title: "VANGUARD", cost: 4, fill: 0x18304c },
      { kind: "striker", title: "STRIKER", cost: 3, fill: 0x3a2b16 },
      { kind: "ranger", title: "RANGER", cost: 3, fill: 0x203b20 },
      { kind: "hunter", title: "HUNTER", cost: 4, fill: 0x33203e },
      { kind: "runner", title: "RUNNER", cost: 2, fill: 0x123b38 },
      { kind: "warden", title: "WARDEN", cost: 3, fill: 0x3d2030 },
      { ability: "surge", title: "SURGE", cost: 3, fill: 0x26364b },
      { ability: "repulse", title: "REPULSE", cost: 4, fill: 0x3e2d1b },
    ];

    entries.forEach((entry, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = startX + col * (cardW + gap) + cardW / 2;
      const y = rows[row];

      const rect = this.add.rectangle(x, y, cardW, cardH, entry.fill)
        .setStrokeStyle(1, 0x45667e, 0.9)
        .setInteractive({ useHandCursor: true });

      const title = this.add.text(x, y - 10, entry.title, {
        fontFamily: "monospace",
        fontSize: entry.title.length > 7 ? "8px" : "9px",
        color: "#eef6fb",
        fontStyle: "bold",
      }).setOrigin(0.5);

      const roleText = entry.kind ? UNIT_DEFS[entry.kind].role : entry.ability === "surge" ? "TEAM BOOST" : "PUSH BACK";
      this.add.text(x, y + 4, roleText, {
        fontFamily: "monospace",
        fontSize: "6px",
        color: "#7894a8",
        align: "center",
        wordWrap: { width: 74 },
      }).setOrigin(0.5);

      const cost = this.add.text(x, y + 20, String(entry.cost), {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#77f1cf",
        fontStyle: "bold",
      }).setOrigin(0.5);

      const card: CardUi = {
        rect,
        title,
        cost,
        kind: entry.kind,
        ability: entry.ability,
        baseFill: entry.fill,
      };

      rect.on("pointerdown", () => {
        if (this.matchEnded || !this.matchLive) return;
        if (card.kind) {
          this.selectUnit(card.kind);
        } else if (card.ability) {
          this.castAbility("player", card.ability);
        }
      });

      this.cards.push(card);
    });
  }

  private bindInput(): void {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.matchEnded || !this.matchLive || !this.selectedKind) return;
      if (pointer.y < ARENA_TOP || pointer.y > ARENA_BOTTOM) return;

      const lane = this.closestLane(pointer.x);
      if (this.deployUnit("player", this.selectedKind, lane)) {
        this.selectedKind = null;
        if (this.tutorialStep !== 2) {
          this.statusText.setText(`DEPLOYED // LANE ${lane + 1}`);
        }
        this.updateLaneHighlights();
        this.refreshCards();
      }
    });
  }

  private resetMatch(): void {
    this.matchNumber += 1;
    this.units.forEach((unit) => unit.container.destroy());
    this.units = [];
    this.nextUnitId = 1;
    this.playerEnergy = 5;
    this.enemyEnergy = 5;
    this.playerCoreHp = this.maxCoreHp;
    this.enemyCoreHp = this.maxCoreHp;
    this.frontLineY = 395;
    this.remainingMs = MATCH_LENGTH_MS;
    this.breakthroughSide = null;
    this.breakthroughMs = 0;
    this.matchEnded = false;
    this.preMatchMs = 3_000;
    this.matchLive = false;
    this.selectedKind = null;
    this.botDecisionMs = 750;
    this.botAbilityMs = 4500;
    this.playerSurgeUntil = 0;
    this.enemySurgeUntil = 0;
    this.abilityReadyAt = {
      player: { surge: 0, repulse: 0 },
      enemy: { surge: 0, repulse: 0 },
    };
    this.counterTextReadyAt = 0;
    this.stats = this.createEmptyStats();
    this.deployReadyAt = {
      player: [0, 0, 0],
      enemy: [0, 0, 0],
    };
    this.tutorialStep = this.matchNumber === 1 ? 0 : 3;
    this.tutorialFinishAt = 0;
    this.statusText.setText("MATCH PREPARING");
    this.phaseText.setText("");
    this.holdText.setText("");
    this.countdownText.setVisible(true).setText("3");
    this.updateLaneHighlights();
    this.refreshHud();
    this.refreshCards();
    this.renderFrontline();
  }

  private updatePreMatch(delta: number): void {
    this.preMatchMs = Math.max(0, this.preMatchMs - delta);
    const seconds = Math.ceil(this.preMatchMs / 1000);

    if (this.preMatchMs > 0) {
      this.countdownText.setVisible(true).setText(String(Math.max(1, seconds)));
      return;
    }

    this.matchLive = true;
    this.countdownText.setText("GO");
    this.tweens.add({
      targets: this.countdownText,
      alpha: 0,
      scaleX: 1.35,
      scaleY: 1.35,
      duration: 420,
      onComplete: () => {
        this.countdownText.setVisible(false).setAlpha(1).setScale(1);
      },
    });

    this.statusText.setText(
      this.matchNumber === 1 ? "TUTORIAL 1/3 // PICK A UNIT CARD" : "SELECT A UNIT, THEN TAP A LANE",
    );
  }

  private selectUnit(kind: UnitKind): void {
    const def = UNIT_DEFS[kind];
    if (this.playerEnergy + 0.001 < def.cost) {
      this.statusText.setText("NOT ENOUGH ENERGY");
      this.cameras.main.shake(70, 0.002);
      return;
    }

    this.selectedKind = this.selectedKind === kind ? null : kind;
    if (this.selectedKind && this.tutorialStep === 0) {
      this.tutorialStep = 1;
      this.statusText.setText("TUTORIAL 2/3 // TAP LANE 1, 2 OR 3");
    } else {
      this.statusText.setText(this.selectedKind ? `${def.name.toUpperCase()} READY // TAP LANE 1, 2 OR 3` : "SELECTION CLEARED");
    }
    this.updateLaneHighlights();
    this.refreshCards();
  }

  private deployUnit(side: Side, kind: UnitKind, lane: number): boolean {
    const def = UNIT_DEFS[kind];
    const now = this.time.now;
    const energy = side === "player" ? this.playerEnergy : this.enemyEnergy;
    const activeUnits = this.units.filter((unit) => unit.side === side && !unit.dead).length;

    if (this.matchEnded || energy + 0.001 < def.cost || activeUnits >= MAX_ACTIVE_UNITS_PER_SIDE) {
      if (side === "player" && activeUnits >= MAX_ACTIVE_UNITS_PER_SIDE) {
        this.statusText.setText("UNIT CAP REACHED // MAKE SPACE");
      }
      return false;
    }

    if (now < this.deployReadyAt[side][lane]) {
      if (side === "player") {
        const wait = Math.max(0.1, (this.deployReadyAt[side][lane] - now) / 1000);
        this.statusText.setText(`LANE ${lane + 1} DEPLOYING // ${wait.toFixed(1)}s`);
      }
      return false;
    }

    if (side === "player") {
      this.playerEnergy -= def.cost;
      this.stats.playerDeploys += 1;
      this.stats.playerEnergySpent += def.cost;
    } else {
      this.enemyEnergy -= def.cost;
      this.stats.enemyDeploys += 1;
      this.stats.enemyEnergySpent += def.cost;
    }

    this.deployReadyAt[side][lane] = now + DEPLOY_LOCK_MS;

    const x = LANES[lane];
    const nearbySpawnCount = this.units.filter(
      (unit) => unit.side === side && unit.lane === lane && Math.abs(unit.y - (side === "player" ? PLAYER_SPAWN_Y : ENEMY_SPAWN_Y)) < 55,
    ).length;
    const spawnOffset = Math.min(nearbySpawnCount * 7, 21);
    const y = side === "player" ? PLAYER_SPAWN_Y + spawnOffset : ENEMY_SPAWN_Y - spawnOffset;
    const outline = side === "player" ? 0x7de4ff : 0xff7a8d;

    const body = this.add.circle(0, 0, def.radius, def.color)
      .setStrokeStyle(2, outline, 1);

    const marker = this.add.circle(0, side === "player" ? 4 : -4, Math.max(3, def.radius * 0.28), outline, 0.95);
    const label = this.add.text(0, 0, def.short, {
      fontFamily: "monospace",
      fontSize: "7px",
      color: "#06111d",
      fontStyle: "bold",
    }).setOrigin(0.5);

    const hpBg = this.add.rectangle(0, -def.radius - 8, 30, 4, 0x1d2730).setOrigin(0.5);
    const hpBar = this.add.rectangle(-15, -def.radius - 8, 30, 4, side === "player" ? 0x55e4ff : 0xff5c72)
      .setOrigin(0, 0.5);

    const container = this.add.container(x, y, [body, marker, label, hpBg, hpBar]);
    container.setDepth(10 + this.nextUnitId);

    const unit: UnitEntity = {
      id: this.nextUnitId++,
      side,
      kind,
      def,
      lane,
      x,
      y,
      hp: def.hp,
      maxHp: def.hp,
      nextAttackAt: 0,
      nextSupportAt: 0,
      dead: false,
      container,
      body,
      hpBg,
      hpBar,
      label,
    };

    this.units.push(unit);
    this.spawnDeployPulse(x, y, outline);

    if (side === "player" && this.tutorialStep === 1) {
      this.tutorialStep = 2;
      this.tutorialFinishAt = now + 4_500;
      this.statusText.setText("TUTORIAL 3/3 // PUSH THE FRONTLINE TOWARD ENEMY CORE");
    }

    return true;
  }

  private updateUnits(dt: number): void {
    const now = this.time.now;

    for (const unit of this.units) {
      if (unit.dead) continue;

      if (unit.def.support && now >= unit.nextSupportAt) {
        this.performSupportPulse(unit);
        unit.nextSupportAt = now + 1100;
      }

      const target = this.findTarget(unit);
      if (target) {
        const distance = Phaser.Math.Distance.Between(unit.x, unit.y, target.x, target.y);
        if (distance <= unit.def.range + target.def.radius) {
          if (now >= unit.nextAttackAt) {
            this.attackUnit(unit, target);
            unit.nextAttackAt = now + unit.def.cooldown * 1000;
          }
        } else {
          this.moveUnitToward(unit, target.x, target.y, dt);
        }
      } else {
        const coreY = unit.side === "player" ? ENEMY_CORE_Y : PLAYER_CORE_Y;
        const distanceToCore = Math.abs(unit.y - coreY);
        if (distanceToCore <= unit.def.range + 27) {
          if (now >= unit.nextAttackAt) {
            this.attackCore(unit);
            unit.nextAttackAt = now + unit.def.cooldown * 1000;
          }
        } else {
          this.moveUnitToward(unit, LANES[unit.lane], coreY, dt);
        }
      }

      this.applySeparation(unit, dt);
      unit.container.setPosition(unit.x, unit.y);
    }

    const deadUnits = this.units.filter((unit) => unit.dead);
    for (const unit of deadUnits) {
      if (unit.container.active) unit.container.destroy();
    }
    this.units = this.units.filter((unit) => !unit.dead);
  }

  private findTarget(unit: UnitEntity): UnitEntity | null {
    let best: UnitEntity | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const candidate of this.units) {
      if (candidate.dead || candidate.side === unit.side) continue;

      if (candidate.lane !== unit.lane) continue;

      const distance = Phaser.Math.Distance.Between(unit.x, unit.y, candidate.x, candidate.y);
      const aggroRange = Math.max(unit.def.range + 44, 90);
      if (distance < bestDistance && distance <= aggroRange) {
        best = candidate;
        bestDistance = distance;
      }
    }

    return best;
  }

  private moveUnitToward(unit: UnitEntity, targetX: number, targetY: number, dt: number): void {
    const now = this.time.now;
    const surgeUntil = unit.side === "player" ? this.playerSurgeUntil : this.enemySurgeUntil;
    const surgeMultiplier = now < surgeUntil ? 1.35 : 1;
    const comebackMultiplier =
      (unit.side === "player" && this.frontLineY > 430) || (unit.side === "enemy" && this.frontLineY < 360)
        ? 1.08
        : 1;

    const speed = unit.def.speed * surgeMultiplier * comebackMultiplier;
    const angle = Phaser.Math.Angle.Between(unit.x, unit.y, targetX, targetY);
    unit.x += Math.cos(angle) * speed * dt;
    unit.y += Math.sin(angle) * speed * dt;

    unit.x = Phaser.Math.Clamp(unit.x, 42, WIDTH - 42);
    unit.y = Phaser.Math.Clamp(unit.y, ENEMY_CORE_Y + 8, PLAYER_CORE_Y - 8);
  }

  private applySeparation(unit: UnitEntity, dt: number): void {
    for (const other of this.units) {
      if (other.id === unit.id || other.dead || other.side !== unit.side || other.lane !== unit.lane) continue;
      const dy = unit.y - other.y;
      const minGap = unit.def.radius + other.def.radius + 4;
      if (Math.abs(dy) > 0.01 && Math.abs(dy) < minGap) {
        unit.y += Math.sign(dy) * 18 * dt;
      }
    }
  }

  private attackUnit(attacker: UnitEntity, target: UnitEntity): void {
    const now = this.time.now;
    let damage = attacker.def.damage;
    let counterMultiplier = 1;

    if (attacker.kind === "hunter" && target.def.heavy) counterMultiplier = 1.8;
    if (attacker.kind === "runner" && target.kind === "ranger") counterMultiplier = 1.6;
    if (attacker.kind === "striker" && target.kind === "runner") counterMultiplier = 1.55;
    if (attacker.kind === "vanguard" && target.kind === "striker") counterMultiplier = 1.25;
    if (attacker.kind === "ranger" && target.kind === "warden") counterMultiplier = 1.3;
    if (attacker.kind === "warden" && target.kind === "hunter") counterMultiplier = 1.2;
    damage *= counterMultiplier;

    const surgeUntil = attacker.side === "player" ? this.playerSurgeUntil : this.enemySurgeUntil;
    if (now < surgeUntil) damage *= 1.18;

    target.hp -= damage;
    target.hpBar.displayWidth = 30 * Phaser.Math.Clamp(target.hp / target.maxHp, 0, 1);
    this.flashAttack(attacker, target.x, target.y);

    if (counterMultiplier > 1 && now >= this.counterTextReadyAt) {
      this.counterTextReadyAt = now + 650;
      this.spawnCombatText(target.x, target.y - target.def.radius - 12, `COUNTER x${counterMultiplier.toFixed(2)}`);
    }

    if (target.hp <= 0) {
      target.dead = true;
      if (attacker.side === "player") this.stats.playerKills += 1;
      else this.stats.enemyKills += 1;
      this.spawnImpact(target.x, target.y, target.side === "player" ? 0x52d8ff : 0xff596d);
    }
  }

  private performSupportPulse(unit: UnitEntity): void {
    let healedAny = false;

    for (const ally of this.units) {
      if (ally.dead || ally.side !== unit.side || ally.id === unit.id) continue;
      const distance = Phaser.Math.Distance.Between(unit.x, unit.y, ally.x, ally.y);
      if (distance > 72 || ally.hp >= ally.maxHp) continue;

      ally.hp = Math.min(ally.maxHp, ally.hp + 12);
      ally.hpBar.displayWidth = 30 * Phaser.Math.Clamp(ally.hp / ally.maxHp, 0, 1);
      healedAny = true;
    }

    if (healedAny) {
      const pulse = this.add.circle(unit.x, unit.y, 18, unit.side === "player" ? 0x74e8ff : 0xff8ca0, 0.12)
        .setStrokeStyle(1, 0xffffff, 0.35)
        .setDepth(7);
      this.tweens.add({
        targets: pulse,
        radius: 46,
        alpha: 0,
        duration: 260,
        onComplete: () => pulse.destroy(),
      });
    }
  }

  private attackCore(attacker: UnitEntity): void {
    let damage = attacker.def.damage;
    const surgeUntil = attacker.side === "player" ? this.playerSurgeUntil : this.enemySurgeUntil;
    if (this.time.now < surgeUntil) damage *= 1.18;

    if (attacker.side === "player") {
      const before = this.enemyCoreHp;
      this.enemyCoreHp = Math.max(0, this.enemyCoreHp - damage);
      this.stats.damageToEnemyCore += before - this.enemyCoreHp;
      this.spawnImpact(attacker.x, ENEMY_CORE_Y, 0xff596d);
    } else {
      const before = this.playerCoreHp;
      this.playerCoreHp = Math.max(0, this.playerCoreHp - damage);
      this.stats.damageToPlayerCore += before - this.playerCoreHp;
      this.spawnImpact(attacker.x, PLAYER_CORE_Y, 0x52d8ff);
    }
  }

  private updateFrontline(dt: number): void {
    let playerPressure = 0;
    let enemyPressure = 0;

    for (const unit of this.units) {
      if (unit.dead) continue;
      const distance = Math.abs(unit.y - this.frontLineY);
      if (distance > 135) continue;

      const proximity = 1 - distance / 135;
      const healthFactor = 0.45 + 0.55 * Phaser.Math.Clamp(unit.hp / unit.maxHp, 0, 1);
      const weight = (unit.def.heavy ? 1.3 : unit.def.support ? 0.9 : 1) * proximity * healthFactor;

      if (unit.side === "player") playerPressure += weight;
      else enemyPressure += weight;
    }

    const pressureDelta = enemyPressure - playerPressure;
    this.frontLineY += Phaser.Math.Clamp(pressureDelta * 13, -31, 31) * dt;

    if (Math.abs(pressureDelta) < 0.08) {
      this.frontLineY += (395 - this.frontLineY) * 0.008 * dt;
    }

    this.frontLineY = Phaser.Math.Clamp(this.frontLineY, 184, 606);
    this.stats.bestPlayerFrontlineY = Math.min(this.stats.bestPlayerFrontlineY, this.frontLineY);
    this.stats.bestEnemyFrontlineY = Math.max(this.stats.bestEnemyFrontlineY, this.frontLineY);
  }

  private updateBreakthrough(delta: number): void {
    let side: Side | null = null;
    if (this.frontLineY <= 194) side = "player";
    if (this.frontLineY >= 596) side = "enemy";

    if (side && side === this.breakthroughSide) {
      this.breakthroughMs += delta;
    } else {
      this.breakthroughSide = side;
      this.breakthroughMs = side ? delta : 0;
    }

    if (this.breakthroughSide) {
      const left = Math.max(0, 5 - this.breakthroughMs / 1000);
      this.holdText.setText(`${this.breakthroughSide === "player" ? "YOUR" : "ENEMY"} BREAKTHROUGH // HOLD ${left.toFixed(1)}s`);
      if (this.breakthroughMs >= 5000) {
        this.endMatch(this.breakthroughSide, "BREAKTHROUGH");
      }
    } else {
      this.holdText.setText("");
    }
  }

  private updateBot(delta: number): void {
    this.botDecisionMs -= delta;
    this.botAbilityMs -= delta;

    if (this.botDecisionMs <= 0) {
      this.botDecisionMs = Phaser.Math.Between(750, 1350);
      this.botDeploy();
    }

    if (this.botAbilityMs <= 0) {
      this.botAbilityMs = Phaser.Math.Between(4800, 7600);
      this.botUseAbility();
    }
  }

  private botDeploy(): void {
    const activeEnemyUnits = this.units.filter((unit) => unit.side === "enemy" && !unit.dead).length;
    if (activeEnemyUnits >= MAX_ACTIVE_UNITS_PER_SIDE) return;

    const affordable = (Object.keys(UNIT_DEFS) as UnitKind[])
      .filter((kind) => UNIT_DEFS[kind].cost <= this.enemyEnergy + 0.001);

    if (affordable.length === 0) return;

    const laneScores = [0, 0, 0];
    for (const unit of this.units) {
      const health = unit.hp / unit.maxHp;
      if (unit.side === "player") laneScores[unit.lane] += health;
      else laneScores[unit.lane] -= health * 0.7;
    }

    let lane = laneScores.indexOf(Math.max(...laneScores));
    if (Math.random() < 0.2) lane = Phaser.Math.Between(0, 2);

    const counter = this.chooseBotCounter(lane, affordable);
    const kind = counter ?? this.chooseBalancedBotUnit(affordable);

    if (!this.deployUnit("enemy", kind, lane)) {
      const alternateLanes = [0, 1, 2]
        .filter((candidate) => candidate !== lane)
        .sort((a, b) => laneScores[b] - laneScores[a]);

      for (const alternate of alternateLanes) {
        if (this.deployUnit("enemy", kind, alternate)) break;
      }
    }
  }

  private chooseBotCounter(lane: number, affordable: UnitKind[]): UnitKind | null {
    const playerUnits = this.units
      .filter((unit) => unit.side === "player" && unit.lane === lane && !unit.dead)
      .sort((a, b) => (b.hp / b.maxHp) - (a.hp / a.maxHp));

    const threat = playerUnits[0];
    if (!threat) return null;

    const counterMap: Partial<Record<UnitKind, UnitKind>> = {
      vanguard: "hunter",
      striker: "vanguard",
      ranger: "runner",
      hunter: "warden",
      runner: "striker",
      warden: "ranger",
    };

    const counter = counterMap[threat.kind];
    return counter && affordable.includes(counter) ? counter : null;
  }

  private chooseBalancedBotUnit(affordable: UnitKind[]): UnitKind {
    const counts = new Map<UnitKind, number>();
    for (const kind of Object.keys(UNIT_DEFS) as UnitKind[]) counts.set(kind, 0);

    for (const unit of this.units) {
      if (unit.side === "enemy" && !unit.dead) {
        counts.set(unit.kind, (counts.get(unit.kind) ?? 0) + 1);
      }
    }

    const sorted = [...affordable].sort((a, b) => {
      const countDelta = (counts.get(a) ?? 0) - (counts.get(b) ?? 0);
      if (countDelta !== 0) return countDelta;
      return UNIT_DEFS[a].cost - UNIT_DEFS[b].cost;
    });

    const shortlist = sorted.slice(0, Math.min(3, sorted.length));
    return shortlist[Phaser.Math.Between(0, shortlist.length - 1)];
  }

  private botUseAbility(): void {
    const enemyCountNearLine = this.units.filter((u) => u.side === "player" && Math.abs(u.y - this.frontLineY) < 95).length;
    const allyCount = this.units.filter((u) => u.side === "enemy").length;

    if (enemyCountNearLine >= 2 && this.enemyEnergy >= ABILITY_COST.repulse) {
      this.castAbility("enemy", "repulse");
      return;
    }

    if (allyCount >= 3 && this.enemyEnergy >= ABILITY_COST.surge) {
      this.castAbility("enemy", "surge");
    }
  }

  private castAbility(side: Side, ability: AbilityKind): void {
    if (this.matchEnded) return;

    const now = this.time.now;
    const cost = ABILITY_COST[ability];
    const readyAt = this.abilityReadyAt[side][ability];
    if (now < readyAt) {
      if (side === "player") {
        const seconds = Math.ceil((readyAt - now) / 1000);
        this.statusText.setText(`${ability.toUpperCase()} COOLDOWN // ${seconds}s`);
      }
      return;
    }

    const energy = side === "player" ? this.playerEnergy : this.enemyEnergy;
    if (energy + 0.001 < cost) {
      if (side === "player") {
        this.statusText.setText("NOT ENOUGH ENERGY");
        this.cameras.main.shake(70, 0.002);
      }
      return;
    }

    if (side === "player") {
      this.playerEnergy -= cost;
      this.stats.playerEnergySpent += cost;
      this.stats.playerAbilities += 1;
    } else {
      this.enemyEnergy -= cost;
      this.stats.enemyEnergySpent += cost;
      this.stats.enemyAbilities += 1;
    }
    this.abilityReadyAt[side][ability] = now + ABILITY_COOLDOWN_MS[ability];

    if (ability === "surge") {
      if (side === "player") this.playerSurgeUntil = this.time.now + 5000;
      else this.enemySurgeUntil = this.time.now + 5000;

      const tint = side === "player" ? 0x4fe3ff : 0xff5e78;
      const flash = this.add.rectangle(WIDTH / 2, (ARENA_TOP + ARENA_BOTTOM) / 2, 350, ARENA_BOTTOM - ARENA_TOP, tint, 0.07)
        .setDepth(5);
      this.tweens.add({ targets: flash, alpha: 0, duration: 420, onComplete: () => flash.destroy() });

      if (side === "player") this.statusText.setText("SURGE ACTIVE // 5s");
      return;
    }

    const affectedSide: Side = side === "player" ? "enemy" : "player";
    const pushDirection = side === "player" ? -1 : 1;

    for (const unit of this.units) {
      if (unit.dead || unit.side !== affectedSide) continue;
      if (Math.abs(unit.y - this.frontLineY) > 115) continue;

      unit.hp -= 72;
      unit.y += pushDirection * 48;
      unit.y = Phaser.Math.Clamp(unit.y, ENEMY_CORE_Y + 8, PLAYER_CORE_Y - 8);
      unit.hpBar.displayWidth = 30 * Phaser.Math.Clamp(unit.hp / unit.maxHp, 0, 1);
      if (unit.hp <= 0) unit.dead = true;
    }

    const ring = this.add.circle(WIDTH / 2, this.frontLineY, 28, 0xffffff, 0.04)
      .setStrokeStyle(3, side === "player" ? 0x72e8ff : 0xff758b, 0.9)
      .setDepth(20);
    this.tweens.add({
      targets: ring,
      radius: 168,
      alpha: 0,
      duration: 380,
      onComplete: () => ring.destroy(),
    });

    if (side === "player") this.statusText.setText("REPULSE // FRONT CLEARED");
  }

  private spawnDeployPulse(x: number, y: number, color: number): void {
    const pulse = this.add.circle(x, y, 12, color, 0.08)
      .setStrokeStyle(2, color, 0.9)
      .setDepth(9);
    this.tweens.add({
      targets: pulse,
      scaleX: 2.7,
      scaleY: 2.7,
      alpha: 0,
      duration: 260,
      ease: "Quad.Out",
      onComplete: () => pulse.destroy(),
    });
  }

  private spawnCombatText(x: number, y: number, value: string): void {
    const text = this.add.text(x, y, value, {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#ffe98a",
      fontStyle: "bold",
      stroke: "#07111f",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(40);

    this.tweens.add({
      targets: text,
      y: y - 18,
      alpha: 0,
      duration: 520,
      ease: "Quad.Out",
      onComplete: () => text.destroy(),
    });
  }

  private flashAttack(attacker: UnitEntity, targetX: number, targetY: number): void {
    const graphics = this.add.graphics().setDepth(30);
    graphics.lineStyle(2, attacker.side === "player" ? 0x9aeeff : 0xff98a8, 0.8);
    graphics.lineBetween(attacker.x, attacker.y, targetX, targetY);
    this.time.delayedCall(65, () => graphics.destroy());
  }

  private spawnImpact(x: number, y: number, color: number): void {
    const impact = this.add.circle(x, y, 7, color, 0.5).setDepth(25);
    this.tweens.add({
      targets: impact,
      radius: 23,
      alpha: 0,
      duration: 180,
      onComplete: () => impact.destroy(),
    });
  }

  private checkMatchEnd(): void {
    if (this.enemyCoreHp <= 0) {
      this.endMatch("player", "CORE DESTROYED");
      return;
    }

    if (this.playerCoreHp <= 0) {
      this.endMatch("enemy", "CORE DESTROYED");
      return;
    }

    if (this.remainingMs > 0) return;

    if (this.playerCoreHp !== this.enemyCoreHp) {
      this.endMatch(this.playerCoreHp > this.enemyCoreHp ? "player" : "enemy", "CORE ADVANTAGE");
      return;
    }

    if (Math.abs(this.frontLineY - 395) > 4) {
      this.endMatch(this.frontLineY < 395 ? "player" : "enemy", "TERRITORY ADVANTAGE");
      return;
    }

    this.endMatch(null, "DRAW");
  }

  private endMatch(winner: Side | null, reason: string): void {
    if (this.matchEnded) return;
    this.matchEnded = true;
    this.selectedKind = null;

    this.matchLive = false;
    this.cameras.main.flash(180, winner === "player" ? 90 : 120, winner === "player" ? 220 : 30, winner === "player" ? 255 : 50);

    const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x02070d, 0.84)
      .setDepth(100);

    const result = winner === "player" ? "VICTORY" : winner === "enemy" ? "DEFEAT" : "DRAW";
    const resultColor = winner === "player" ? "#79edff" : winner === "enemy" ? "#ff778c" : "#f2df80";

    const resultText = this.add.text(WIDTH / 2, 330, result, {
      fontFamily: "monospace",
      fontSize: "36px",
      color: resultColor,
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(101);

    const reasonText = this.add.text(WIDTH / 2, 375, reason, {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#a5b9c8",
    }).setOrigin(0.5).setDepth(101);

    const territoryPlayer = Math.max(0, 395 - this.stats.bestPlayerFrontlineY);
    const territoryEnemy = Math.max(0, this.stats.bestEnemyFrontlineY - 395);
    const summary = this.add.text(
      WIDTH / 2,
      424,
      [
        `CORE       ${Math.round(this.playerCoreHp)} : ${Math.round(this.enemyCoreHp)}`,
        `DEPLOYS    ${this.stats.playerDeploys} : ${this.stats.enemyDeploys}`,
        `KILLS      ${this.stats.playerKills} : ${this.stats.enemyKills}`,
        `CORE DMG   ${Math.round(this.stats.damageToEnemyCore)} : ${Math.round(this.stats.damageToPlayerCore)}`,
        `BEST PUSH  ${Math.round(territoryPlayer)} : ${Math.round(territoryEnemy)}`,
      ].join("\n"),
      {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#7894a8",
        align: "center",
        lineSpacing: 6,
      },
    ).setOrigin(0.5).setDepth(101);

    const rematch = this.add.rectangle(WIDTH / 2 - 62, 530, 112, 48, 0x153149)
      .setStrokeStyle(2, 0x66dff5)
      .setInteractive({ useHandCursor: true })
      .setDepth(101);

    const rematchText = this.add.text(WIDTH / 2 - 62, 530, "REMATCH", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#dff9ff",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(102);

    const home = this.add.rectangle(WIDTH / 2 + 78, 530, 112, 48, 0x101d2a)
      .setStrokeStyle(1, 0x6b8497)
      .setInteractive({ useHandCursor: true })
      .setDepth(101);

    const homeText = this.add.text(WIDTH / 2 + 78, 530, "HOME", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#b8c8d3",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(102);

    rematch.on("pointerdown", () => {
      overlay.destroy();
      resultText.destroy();
      reasonText.destroy();
      summary.destroy();
      rematch.destroy();
      rematchText.destroy();
      home.destroy();
      homeText.destroy();
      this.resetMatch();
    });

    home.on("pointerdown", () => {
      home.disableInteractive();
      this.cameras.main.fadeOut(180, 5, 11, 20);
      this.time.delayedCall(180, () => this.scene.start("MenuScene"));
    });
  }

  private renderFrontline(): void {
    this.frontLineGraphics.clear();

    const playerStrength = Phaser.Math.Clamp((395 - this.frontLineY) / 210, -1, 1);
    const lineColor = playerStrength > 0.08 ? 0x69e4ff : playerStrength < -0.08 ? 0xff7085 : 0xf0d968;

    this.frontLineGraphics.fillStyle(lineColor, 0.055);
    this.frontLineGraphics.fillRect(21, this.frontLineY - 17, 348, 34);
    this.frontLineGraphics.lineStyle(7, lineColor, 0.08);
    this.frontLineGraphics.lineBetween(24, this.frontLineY, 366, this.frontLineY);
    this.frontLineGraphics.lineStyle(2, lineColor, 0.92);
    this.frontLineGraphics.lineBetween(24, this.frontLineY, 366, this.frontLineY);

    this.frontLineText.setY(this.frontLineY - 17);
    this.frontLineText.setColor(playerStrength > 0.08 ? "#7eeaff" : playerStrength < -0.08 ? "#ff8395" : "#f5e277");
  }

  private updateTutorial(): void {
    if (this.tutorialStep !== 2 || this.tutorialFinishAt <= 0) return;
    if (this.time.now < this.tutorialFinishAt) return;

    this.tutorialStep = 3;
    this.tutorialFinishAt = 0;
    if (!this.selectedKind) {
      this.statusText.setText("CONTROL THE FRONTLINE // DESTROY THE ENEMY CORE");
    }
  }

  private getLanePressure(lane: number): number {
    let pressure = 0;

    for (const unit of this.units) {
      if (unit.dead || unit.lane !== lane) continue;
      const healthFactor = 0.4 + 0.6 * Phaser.Math.Clamp(unit.hp / unit.maxHp, 0, 1);
      const roleWeight = unit.def.heavy ? 1.25 : unit.def.support ? 0.9 : 1;
      const value = healthFactor * roleWeight;
      pressure += unit.side === "player" ? value : -value;
    }

    return pressure;
  }

  private createEmptyStats(): MatchStats {
    return {
      playerDeploys: 0,
      enemyDeploys: 0,
      playerEnergySpent: 0,
      enemyEnergySpent: 0,
      playerKills: 0,
      enemyKills: 0,
      damageToEnemyCore: 0,
      damageToPlayerCore: 0,
      playerAbilities: 0,
      enemyAbilities: 0,
      bestPlayerFrontlineY: 395,
      bestEnemyFrontlineY: 395,
    };
  }

  private refreshHud(): void {
    const seconds = Math.ceil(this.remainingMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    this.timerText.setText(`${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`);

    this.enemyCoreBar.displayWidth = 102 * Phaser.Math.Clamp(this.enemyCoreHp / this.maxCoreHp, 0, 1);
    this.playerCoreBar.displayWidth = 102 * Phaser.Math.Clamp(this.playerCoreHp / this.maxCoreHp, 0, 1);
    this.energyBar.displayWidth = 222 * Phaser.Math.Clamp(this.playerEnergy / MAX_ENERGY, 0, 1);
    this.energyText.setText(`${this.playerEnergy.toFixed(1)} / 10`);

    const rallyActive = this.frontLineY > 430;
    this.commanderText.setColor(rallyActive ? "#72f2ca" : "#8faabd");
    this.commanderText.setText(rallyActive ? "CMD: AEGIS // RALLY ACTIVE" : "CMD: AEGIS");

    const controlSpan = 606 - 184;
    const playerControl = Phaser.Math.Clamp((606 - this.frontLineY) / controlSpan, 0, 1);
    const enemyControl = 1 - playerControl;
    this.controlMarker.setX(268 + 92 * playerControl);
    this.controlMarker.setFillStyle(
      playerControl > 0.55 ? 0x66e5ff : playerControl < 0.45 ? 0xff7085 : 0xf2d86c,
    );
    this.controlText.setText(`${Math.round(playerControl * 100)}/${Math.round(enemyControl * 100)}`);
    this.controlText.setColor(
      playerControl > 0.55 ? "#72dff5" : playerControl < 0.45 ? "#ff8293" : "#879eae",
    );

    if (this.remainingMs <= 60_000) {
      this.phaseText.setText("FINAL MINUTE // ENERGY FLOW +25%");
      this.phaseText.setColor("#f2d678");
    } else {
      this.phaseText.setText("");
    }

    this.lanePressureTexts.forEach((text, lane) => {
      const pressure = this.getLanePressure(lane);
      if (pressure > 0.35) {
        text.setText(`YOU +${pressure.toFixed(1)}`);
        text.setColor("#67dff5");
      } else if (pressure < -0.35) {
        text.setText(`ENEMY +${Math.abs(pressure).toFixed(1)}`);
        text.setColor("#ff7f92");
      } else {
        text.setText("EVEN");
        text.setColor("#6f8799");
      }
    });
  }

  private refreshCards(): void {
    for (const card of this.cards) {
      const cost = card.kind ? UNIT_DEFS[card.kind].cost : ABILITY_COST[card.ability!];
      const cooldownRemaining =
        card.ability ? Math.max(0, this.abilityReadyAt.player[card.ability] - this.time.now) : 0;
      const offCooldown = cooldownRemaining <= 0;
      const affordable = this.playerEnergy + 0.001 >= cost && offCooldown;
      const selected = !!card.kind && this.selectedKind === card.kind;

      card.rect.setFillStyle(card.baseFill, affordable ? 1 : 0.45);
      card.rect.setStrokeStyle(selected ? 3 : 1, selected ? 0x7df7d3 : 0x45667e, selected ? 1 : 0.9);
      card.title.setAlpha(affordable ? 1 : 0.45);
      card.cost.setAlpha(affordable ? 1 : 0.65);
      card.cost.setText(cooldownRemaining > 0 ? `${Math.ceil(cooldownRemaining / 1000)}s` : String(cost));
      card.cost.setColor(affordable ? "#77f1cf" : cooldownRemaining > 0 ? "#efc76e" : "#61707a");
    }
  }

  private updateLaneHighlights(): void {
    const active = this.selectedKind !== null;
    this.laneHighlights.forEach((highlight, index) => {
      highlight.setFillStyle(0x55dfff, active ? 0.045 : 0);
      highlight.setStrokeStyle(2, 0x55dfff, active ? 0.32 : 0);
      if (active) {
        highlight.setScale(index === 1 ? 1.02 : 1);
      } else {
        highlight.setScale(1);
      }
    });
  }

  private closestLane(x: number): number {
    let bestLane = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    LANES.forEach((laneX, index) => {
      const distance = Math.abs(x - laneX);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestLane = index;
      }
    });
    return bestLane;
  }
}
