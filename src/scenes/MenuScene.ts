import Phaser from "phaser";

const WIDTH = 390;
const HEIGHT = 844;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#050b14");

    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x07111f);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x18334a, 0.32);
    for (let x = 26; x < WIDTH; x += 42) {
      grid.lineBetween(x, 0, x, HEIGHT);
    }
    for (let y = 30; y < HEIGHT; y += 42) {
      grid.lineBetween(0, y, WIDTH, y);
    }

    this.add.text(WIDTH / 2, 150, "FRONTLINE", {
      fontFamily: "monospace",
      fontSize: "42px",
      color: "#f5f9fc",
      fontStyle: "bold",
      stroke: "#07111f",
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, 198, "PUSH. CONTROL. BREAK THROUGH.", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#70a6c6",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.add.rectangle(WIDTH / 2, 315, 326, 132, 0x0a1725, 0.96)
      .setStrokeStyle(1, 0x315675, 0.9);

    this.add.text(WIDTH / 2, 272, "FIELD LOADOUT", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#93b3c8",
      fontStyle: "bold",
    }).setOrigin(0.5);

    const units = ["VAN", "STR", "RNG", "HNT", "RUN", "WRD"];
    units.forEach((name, index) => {
      const x = 64 + index * 52;
      const circle = this.add.circle(x, 318, 18, 0x17334a)
        .setStrokeStyle(1, 0x5aa7cc, 0.75);
      this.add.text(circle.x, circle.y, name, {
        fontFamily: "monospace",
        fontSize: "7px",
        color: "#d9edf8",
        fontStyle: "bold",
      }).setOrigin(0.5);
    });

    this.add.text(WIDTH / 2, 358, "CMD AEGIS  //  SURGE  //  REPULSE", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#668aa2",
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, 440, "3 MINUTE TACTICAL MATCH", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#718da1",
    }).setOrigin(0.5);

    const playButton = this.add.rectangle(WIDTH / 2, 510, 226, 62, 0x15394d)
      .setStrokeStyle(2, 0x6be6ff)
      .setInteractive({ useHandCursor: true });

    const playText = this.add.text(WIDTH / 2, 510, "PLAY", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#eafcff",
      fontStyle: "bold",
    }).setOrigin(0.5);

    playButton.on("pointerover", () => playButton.setFillStyle(0x1c4a62));
    playButton.on("pointerout", () => playButton.setFillStyle(0x15394d));
    playButton.on("pointerdown", () => {
      playButton.disableInteractive();
      playText.setText("DEPLOYING...");
      this.cameras.main.fadeOut(220, 5, 11, 20);
      this.time.delayedCall(220, () => this.scene.start("FrontlineScene"));
    });

    this.add.text(WIDTH / 2, 605, "WIN BY CORE DESTRUCTION OR BREAKTHROUGH", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#547187",
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, 780, "PROTOTYPE v0.5", {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#3f5c70",
    }).setOrigin(0.5);
  }
}
