// src/scenes/Game.ts
import Phaser from "phaser";
import { Reel } from "./components/Reel";
import {
  IMAGE_WIDTH,
  IMAGE_HEIGHT,
  H_GAP,
  V_GAP,
  REELS_COLUMNS,
  REELS_ROWS,
  SPIN_BUTTON_WIDTH,
  SPIN_BUTTON_HEIGHT,
  TWEEN_DURATION,
  SPIN_START_DURATION,
  SPIN_START_DELAY,
  SYMBOLS,
  PAY_TABLE,
  MINIMUM_WIN_AMOUNT,
  WINNING_ROW,
  getRandomWeightedSymbol,
} from "./helpers";

export class Game extends Phaser.Scene {
  private reels: Reel[] = [];
  private isSpinning = false;
  private coins = 10;

  private baseWidth!: number;
  private baseHeight!: number;
  private currentScale = 1;

  private spinButton!: Phaser.GameObjects.Image;
  private winText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private background!: Phaser.GameObjects.Image;

  constructor() {
    super({ key: "Game", active: true });
  }

  preload() {
    this.load.image("background", "assets/bg.png");
    this.load.image("spinButton", "assets/SpinButton_01.png");
    this.load.image("spinButtonPressed", "assets/SpinButton_01_Pressed.png");
    this.load.audio("spinSound", "assets/sounds/spin.wav");
    this.load.audio("stopSound", "assets/sounds/win.wav");
    SYMBOLS.forEach((s) => {
      this.load.image(s, `assets/symbol/${s}.png`);
      this.load.image(
        `${s}_connect`,
        `assets/symbol-connected/${s}_connect.png`
      );
    });
  }

  create() {
    const { width, height } = this.cameras.main;
    this.baseWidth = width;
    this.baseHeight = height;

    this.background = this.add
      .image(width / 2, height / 2, "background")
      .setDisplaySize(width, height);

    this.createReels(width, height);
    this.createUiElements(width, height);
    this.repositionReels(width, height);

    this.scale.on("resize", this.onResize, this);
  }

  private onResize(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize;
    this.background
      .setPosition(width / 2, height / 2)
      .setDisplaySize(width, height);
    this.coinsText.setPosition(20, 20);
    this.repositionReels(width, height);
  }

  private repositionReels(width: number, height: number) {
    // design block dimensions
    const designW = REELS_COLUMNS * IMAGE_WIDTH + (REELS_COLUMNS - 1) * H_GAP;
    const designH = REELS_ROWS * IMAGE_HEIGHT + (REELS_ROWS - 1) * V_GAP;
    const scaleX = width / designW;
    const scaleY = height / designH;
    const scale = Math.min(scaleX, scaleY, 1);
    this.currentScale = scale;

    const w = IMAGE_WIDTH * scale;
    const h = IMAGE_HEIGHT * scale;
    const gx = H_GAP * scale;
    const gy = V_GAP * scale;

    const blockW = REELS_COLUMNS * w + (REELS_COLUMNS - 1) * gx;
    const blockH = REELS_ROWS * h + (REELS_ROWS - 1) * gy;
    const startX = (width - blockW) / 2 + w / 2;
    const startY = (height - blockH) / 2 + h / 2;

    // position winText above reels
    const winY = startY - h / 2 - 10;
    this.winText.setPosition(width / 2, winY);

    // resize & place spin button
    this.spinButton
      .setDisplaySize(SPIN_BUTTON_WIDTH * scale, SPIN_BUTTON_HEIGHT * scale)
      .setPosition(width / 2, height - (SPIN_BUTTON_HEIGHT * scale) / 2);

    // update reels
    this.reels.forEach((r, i) => {
      const x = startX + i * (w + gx);
      r.resize(w, h, gy);
      r.reposition(x, startY);
    });
  }

  private createUiElements(width: number, height: number) {
    this.winText = this.add
      .text(width / 2, 0, "", {
        fontSize: "32px",
        fontStyle: "bold",
        color: "#000",
      })
      .setOrigin(0.5)
      .setDepth(1000);

    this.coinsText = this.add
      .text(20, 20, `Coins: ${this.coins}`, { fontSize: "32px", color: "#000" })
      .setOrigin(0, 0);

    this.spinButton = this.add
      .image(width / 2, height - SPIN_BUTTON_HEIGHT, "spinButton")
      .setDisplaySize(SPIN_BUTTON_WIDTH, SPIN_BUTTON_HEIGHT)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.spinButton.setTexture("spinButtonPressed"))
      .on("pointerup", () => {
        this.spinButton.setTexture("spinButton");
        this.spinReels();
      })
      .on("pointerout", () => this.spinButton.setTexture("spinButton"));
  }

  private createReels(width: number, height: number) {
    const totalW = REELS_COLUMNS * IMAGE_WIDTH + (REELS_COLUMNS - 1) * H_GAP;
    const totalH = REELS_ROWS * IMAGE_HEIGHT + (REELS_ROWS - 1) * V_GAP;
    const startX = (width - totalW) / 2 + IMAGE_WIDTH / 2;
    const startY = (height - totalH) / 2 + IMAGE_HEIGHT / 2;

    for (let c = 0; c < REELS_COLUMNS; c++) {
      const syms = Array.from({ length: REELS_ROWS }, () =>
        getRandomWeightedSymbol()
      );
      const x = startX + c * (IMAGE_WIDTH + H_GAP);
      this.reels.push(
        new Reel(
          this,
          c,
          x,
          startY,
          IMAGE_WIDTH,
          IMAGE_HEIGHT,
          V_GAP,
          REELS_ROWS,
          syms
        )
      );
    }
  }

  private spinReels() {
    if (this.isSpinning) return;
    if (this.coins <= 0) {
      this.winText.setText("Not enough coins!");
      return;
    }
    this.isSpinning = true;
    this.winText.setText("");
    this.coins--;
    this.coinsText.setText(`Coins: ${this.coins}`);

    const spinSound = this.sound.add("spinSound", { loop: true });
    spinSound.play();
    this.tweens.add({
      targets: this.spinButton,
      alpha: 0,
      duration: 500,
      ease: "Cubic.easeIn",
    });

    let cnt = 0;
    const evt = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        cnt++;
        if (cnt * 100 >= SPIN_START_DELAY - 100) this.lastRandomizeBeforeSpin();
        else this.randomizeSymbols();
      },
    });

    this.time.delayedCall(SPIN_START_DELAY, async () => {
      evt.remove(false);
      const tasks = this.reels.map((r, i) => {
        const sd = (SPIN_START_DURATION + i * 300) * this.currentScale;
        const td = TWEEN_DURATION * this.currentScale;
        return r.spin(sd, td, r.getStepSize());
      });
      await Promise.all(tasks);
      spinSound.stop();
      this.sound.play("stopSound");
      this.evaluateWin();
      this.isSpinning = false;
      this.tweens.add({
        targets: this.spinButton,
        alpha: 1,
        duration: 250,
        ease: "Cubic.easeIn",
      });
    });
  }

  private randomizeSymbols() {
    this.reels.forEach((r) => {
      for (let i = 0; i < REELS_ROWS; i++)
        r.updateSymbol(i, getRandomWeightedSymbol());
    });
  }

  private lastRandomizeBeforeSpin() {
    for (let i = 0; i < REELS_ROWS; i++) {
      this.reels[0].updateSymbol(i, getRandomWeightedSymbol());
    }
    const first = this.reels[0];
    const keys = Array.from(
      { length: REELS_ROWS },
      (_, i) => first.getImageAt(i).texture.key
    );
    for (let c = 1; c < REELS_COLUMNS; c++) {
      for (let r = 0; r < REELS_ROWS; r++) {
        this.reels[c].updateSymbol(r, getRandomWeightedSymbol(keys[r]));
      }
    }
  }

  private evaluateWin() {
    const keys = this.reels.map((r) => r.getImageAt(WINNING_ROW).texture.key);
    const firstKey = keys[0];
    let count = 1;
    for (let i = 1; i < keys.length; i++) {
      if (keys[i] === firstKey) count++;
      else break;
    }
    if (count >= MINIMUM_WIN_AMOUNT && PAY_TABLE[firstKey]) {
      for (let i = 0; i < count; i++) {
        this.reels[i].updateSymbol(WINNING_ROW, `${firstKey}_connect`);
      }
      const payout = PAY_TABLE[firstKey];
      this.coins += payout;
      this.coinsText.setText(`Coins: ${this.coins}`);
      this.winText.setText(`You Win: ${payout} Coins! :D`);
    } else {
      this.winText.setText("Sorry, No Win. :(");
    }
  }
}
