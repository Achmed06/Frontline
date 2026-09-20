import Phaser from "phaser";
import "./style.css";
import { FrontlineScene } from "./scenes/FrontlineScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#07111f",
  width: 390,
  height: 844,
  resolution: Math.min(window.devicePixelRatio || 1, 2),
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 390,
    height: 844,
  },
  render: {
    antialias: true,
    roundPixels: true,
  },
  scene: [FrontlineScene],
};

new Phaser.Game(config);