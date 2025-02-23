import { Reel } from "./components/Reel";
import Phaser from "phaser";
import {
  getRandomWeightedSymbol,
  H_GAP,
  IMAGE_HEIGHT,
  IMAGE_WIDTH,
  MINIMUM_WIN_AMOUNT,
  PAY_TABLE,
  REELS_COLUMNS,
  REELS_ROWS,
  SPIN_START_DELAY,
  SPIN_START_DURATION,
  SYMBOLS,
  TWEEN_DURATION as TWEEN_DURATION,
  V_GAP,
  WINNING_ROW,
} from "./helpers";

export class Game extends Phaser.Scene {
  private reels: Reel[] = [];
  private spinButton!: Phaser.GameObjects.Image;
  private winText!: Phaser.GameObjects.Text;
  private isSpinning = false;

  constructor() {
    super({ key: "Game", active: true });
  }

  preload() {
    this.load.image("background", "assets/bg.png");
    this.load.image("spinButton", "assets/SpinButton_01.png");
    this.load.image("spinButtonPressed", "assets/SpinButton_01_Pressed.png");

    SYMBOLS.forEach((symbol) => {
      this.load.image(symbol, `assets/symbol/${symbol}.png`);
      this.load.image(
        symbol + "_connect",
        `assets/symbol-connected/${symbol}_connect.png`
      );
    });
  }
  create() {
    const { width, height } = this.cameras.main;

    const background = this.add.image(width / 2, height / 2, "background");
    background.setDisplaySize(width, height);

    this.createReels(width, height);
    this.createUiElements(width, height);
  }
  private createUiElements(width: number, height: number) {
    this.winText = this.add
      .text(width / 2, 20, "", { fontSize: "48px", color: "#000" })
      .setOrigin(0.5)
      .setDepth(1000);

    this.spinButton = this.add
      .image(width / 2, height / 2, "spinButton")
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.spinButton.setTexture("spinButtonPressed");
      })
      .on("pointerup", () => {
        this.spinButton.setTexture("spinButton");
        this.spinReels();
      })
      .on("pointerout", () => {
        this.spinButton.setTexture("spinButton");
      });
  }
  private createReels(width: number, height: number) {
    const totalReelWidth =
      REELS_COLUMNS * IMAGE_WIDTH + (REELS_COLUMNS - 1) * H_GAP;
    const totalReelHeight =
      REELS_ROWS * IMAGE_HEIGHT + (REELS_ROWS - 1) * V_GAP;
    const startX = (width - totalReelWidth) / 2 + IMAGE_WIDTH / 2;
    const startY = (height - totalReelHeight) / 2 + IMAGE_HEIGHT / 2;

    for (let col = 0; col < REELS_COLUMNS; col++) {
      const initialSymbols: string[] = [];
      for (let row = 0; row < REELS_ROWS; row++) {
        initialSymbols.push(getRandomWeightedSymbol());
      }
      const reelX = startX + col * (IMAGE_WIDTH + H_GAP);
      const reel = new Reel(
        this,
        col,
        reelX,
        startY,
        IMAGE_WIDTH,
        IMAGE_HEIGHT,
        V_GAP,
        REELS_ROWS,
        initialSymbols
      );
      this.reels.push(reel);
    }
  }
  private spinReels(): void {
    this.animateSpinButton(0, 500);

    if (this.isSpinning) return;

    this.isSpinning = true;
    this.winText.setText("");

    const randomizeEvent: Phaser.Time.TimerEvent = this.time.addEvent({
      delay: 100,
      callback: () => this.randomizeSymbols(),
      loop: true,
    });

    this.time.delayedCall(SPIN_START_DELAY, async (): Promise<void> => {
      randomizeEvent.remove(false);

      const spinPromises: Promise<void>[] = this.reels.map((reel, index) => {
        const spinDuration = SPIN_START_DURATION + index * 300;
        const rollDistance = IMAGE_HEIGHT + V_GAP;
        return reel.spin(spinDuration, TWEEN_DURATION, rollDistance);
      });

      await Promise.all(spinPromises);

      this.evaluateWin();
      this.isSpinning = false;
      this.animateSpinButton(1, 250);
    });
  }
  private randomizeSymbols(): void {
    this.reels.forEach((reel) => {
      for (let row = 0; row < REELS_ROWS; row++) {
        reel.updateSymbol(row, getRandomWeightedSymbol());
      }
    });
  }
  private evaluateWin(): void {
    // Gather winning symbols from the middle row.
    const winningSymbols = this.reels.map(
      (reel) => reel.getImageAt(WINNING_ROW).texture.key
    );
    const firstSymbol = winningSymbols[0];
    let matchCount = 1;
    for (let i = 1; i < winningSymbols.length; i++) {
      if (winningSymbols[i] === firstSymbol) {
        matchCount++;
      } else {
        break;
      }
    }

    if (matchCount >= MINIMUM_WIN_AMOUNT && PAY_TABLE[firstSymbol]) {
      for (let i = 0; i < matchCount; i++) {
        this.reels[i].setImageAt(WINNING_ROW, firstSymbol + "_connect");
      }
      const payout = PAY_TABLE[firstSymbol];
      this.winText.setText(`You Win: ${payout} Coins!`);
    } else {
      this.winText.setText("Sorry, No Win ... ");
    }
  }
  private animateSpinButton(alpha: number, durationInMs: number): void {
    this.tweens.add({
      targets: this.spinButton,
      alpha: alpha,
      duration: durationInMs,
      ease: "Cubic.easeIn",
    });
  }
}
