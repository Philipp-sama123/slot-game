import { Reel } from "./components/Reel";
import Phaser from "phaser";
import { getRandomWeightedSymbol, H_GAP, IMAGE_HEIGHT, IMAGE_WIDTH, MINIMUM_WIN_AMOUNT, PAY_TABLE, REELS_COLUMNS, REELS_ROWS, SYMBOLS, V_GAP, WINNING_ROW } from "./helpers";
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
    this.load.image("spinButton", "assets/logo.png");

    SYMBOLS.forEach((symbol) => {
      this.load.image(symbol, `assets/symbol/${symbol}.png`);
      this.load.image(
        symbol + "_connect",
        `assets/symbol-connected/${symbol}_connect.png`
      );
    });
  }

  create() {
    this.add.image(640, 360, "background");
    this.winText = this.add
      .text(640, 20, "", { fontSize: "32px", color: "#FFF" })
      .setOrigin(0.5)
      .setDepth(1000);

    // Calculate grid layout to center the board.
    const totalReelWidth =
      REELS_COLUMNS * IMAGE_WIDTH +
      (REELS_COLUMNS - 1) * H_GAP;
    const totalReelHeight =
      REELS_ROWS * IMAGE_HEIGHT + (REELS_ROWS - 1) * V_GAP;
    const startX =
      (this.cameras.main.width - totalReelWidth) / 2 + IMAGE_WIDTH / 2;
    const startY =
      (this.cameras.main.height - totalReelHeight) / 2 + IMAGE_HEIGHT / 2;

    // Create reels.
    for (let col = 0; col < REELS_COLUMNS; col++) {
      const initialSymbols: string[] = [];
      for (let row = 0; row <REELS_ROWS; row++) {
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

    // Create spin button.
    this.spinButton = this.add.image(640, 650, "spinButton").setInteractive();
    this.spinButton.on("pointerdown", () => this.spinReels());
  }



  private spinReels(): void {
    if (this.isSpinning) return;
    this.isSpinning = true;
    this.winText.setText("");

    // Immediately update all images with a new random symbol.
    this.reels.forEach((reel) => {
      for (let row = 0; row < REELS_ROWS; row++) {
        reel.updateSymbol(row, getRandomWeightedSymbol());
      }
    });

    // Delay before starting the spin.
    this.time.delayedCall(500, async () => {
      // Spin each reel with a staggered duration.
      const spinPromises = this.reels.map((reel, index) => {
        const spinDuration = 2000 + index * 300;
        const tweenDuration = 100;
        const rollDistance = IMAGE_HEIGHT + V_GAP;
        return reel.spin(spinDuration, tweenDuration, rollDistance);
      });
      await Promise.all(spinPromises);

      this.evaluateWin();
      this.isSpinning = false;
    });
  }

  private evaluateWin(): void {
    // Gather winning symbols (middle row from each reel).
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
      // Change winning images to their connected version.
      for (let i = 0; i < matchCount; i++) {
        this.reels[i].setImageAt(WINNING_ROW, firstSymbol + "_connect");
      }
      const payout = PAY_TABLE[firstSymbol];
      this.winText.setText(`You Win: ${payout}!`);
    } else {
      this.winText.setText("Sorry, No Win ... ");
    }
  }
}
