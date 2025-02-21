import Phaser from "phaser";

export class Game extends Phaser.Scene {
  private symbols = [
    "M1", "M2", "M3", "M4", "M5", "M6",
    "H1", "H2", "H3", "H4", "H5", "H6",
    "A", "Bonus", "9", "10", "J", "Q", "K",
  ];

  // Each reel (column) is an array of 3 images.
  private reels: Phaser.GameObjects.Image[][] = [];

  // The initial Y positions (for snapping back).
  private reelInitialYs: number[][] = [];

  private spinButton!: Phaser.GameObjects.Image;
  private winText!: Phaser.GameObjects.Text;
  
  private payTable: Record<string, number> = {
    M1: 10, M2: 15, M3: 20, M4: 25, M5: 30, M6: 35,
    H1: 10, H2: 15, H3: 20, H4: 25, H5: 30, H6: 35,
    A: 50, Bonus: 100, "9": 5, "10": 10, J: 15, Q: 20, K: 25,
  };

  private isSpinning = false;

  // Layout constants.
  private readonly IMAGE_WIDTH = 200;
  private readonly IMAGE_HEIGHT = 200;
  private readonly H_GAP = 20;
  private readonly V_GAP = 20;
  private readonly REELS_COLUMNS = 5;
  private readonly REELS_ROWS = 3; // exactly 3 images per column
  // The winning row is the middle row (index 1).
  private readonly WINNING_ROW = 1;

  constructor() {
    super({ key: "GameWeighted", active: true });
  }

  preload() {
    this.load.image("background", "assets/bg.png");
    this.load.image("spinButton", "assets/logo.png");
    // Load both normal and connected versions for each symbol.
    this.symbols.forEach((symbol) => {
      this.load.image(symbol, `assets/symbol/${symbol}.png`);
      this.load.image(symbol + "_connect", `assets/symbol-connected/${symbol}_connect.png`);
    });
  }

  create() {
    this.add.image(640, 360, "background");

    this.winText = this.add
      .text(640, 20, "", { fontSize: "32px", color: "#FFF" })
      .setOrigin(0.5)
      .setDepth(1000);

    // Calculate grid positions to center the 5x3 board.
    const totalReelWidth =
      this.REELS_COLUMNS * this.IMAGE_WIDTH + (this.REELS_COLUMNS - 1) * this.H_GAP;
    const totalReelHeight =
      this.REELS_ROWS * this.IMAGE_HEIGHT + (this.REELS_ROWS - 1) * this.V_GAP;
    const startX =
      (this.cameras.main.width - totalReelWidth) / 2 + this.IMAGE_WIDTH / 2;
    const startY =
      (this.cameras.main.height - totalReelHeight) / 2 + this.IMAGE_HEIGHT / 2;

    // Create each column (reel) with the 3 REELS_COLUMNS images.
    for (let col = 0; col < this.REELS_COLUMNS; col++) {
      this.reels[col] = [];
      this.reelInitialYs[col] = [];
      for (let row = 0; row < this.REELS_ROWS; row++) {
        // Start with a random symbol.
        const symbol = this.getRandomSymbol();
        const posX = startX + col * (this.IMAGE_WIDTH + this.H_GAP);
        const posY = startY + row * (this.IMAGE_HEIGHT + this.V_GAP);
        const sprite = this.add.image(posX, posY, symbol);
        this.reels[col].push(sprite);
        this.reelInitialYs[col].push(posY);
      }
    }

    // Create spin button.
    this.spinButton = this.add.image(640, 650, "spinButton").setInteractive();
    this.spinButton.on("pointerdown", () => this.spinReels());
  }

  // --- Weighted Random Selector ---
  private getRandomSymbol(): string {
    const symbolsWithWeights: { symbol: string; weight: number }[] = [
      { symbol: "M1", weight: 5 },
      { symbol: "M2", weight: 5 },
      { symbol: "M3", weight: 5 },
      { symbol: "M4", weight: 5 },
      { symbol: "M5", weight: 5 },
      { symbol: "M6", weight: 5 },
      { symbol: "H1", weight: 5 },
      { symbol: "H2", weight: 5 },
      { symbol: "H3", weight: 5 },
      { symbol: "H4", weight: 5 },
      { symbol: "H5", weight: 5 },
      { symbol: "H6", weight: 5 },
      { symbol: "A", weight: 100 },      
      { symbol: "Bonus", weight: 5 },   
      { symbol: "9", weight: 5 },
      { symbol: "10", weight: 5 },
      { symbol: "J", weight: 5 },
      { symbol: "Q", weight: 5 },
      { symbol: "K", weight: 5 },
    ];

    const totalWeight = symbolsWithWeights.reduce((sum, sw) => sum + sw.weight, 0);
    let random = Math.random() * totalWeight;
    for (const { symbol, weight } of symbolsWithWeights) {
      if (random < weight) {
        return symbol;
      }
      random -= weight;
    }
    return symbolsWithWeights[0].symbol;
  }

  private spinReels() {
    if (this.isSpinning) return;
    this.isSpinning = true;
    this.winText.setText("");

    // (1) Immediately randomize all images on the board using weighted selection.
    for (let col = 0; col < this.REELS_COLUMNS; col++) {
      for (let row = 0; row < this.REELS_ROWS; row++) {
        this.reels[col][row].setTexture(this.getRandomSymbol());
      }
    }

    // (2) Wait 1 second before starting the spin.
    this.time.delayedCall(500, () => {
      let reelsFinished = 0;
      // (3) Spin each column.
      for (let col = 0; col < this.REELS_COLUMNS; col++) {
        // You can adjust spin duration per column if you want a staggered stop.
        const spinDuration = 2000 + col * 300;
        this.spinColumnSmooth(col, spinDuration, () => {
          reelsFinished++;
          if (reelsFinished === this.REELS_COLUMNS) {
            // (5) Evaluate win after all columns have stopped.
            this.evaluateWin();
            this.isSpinning = false;
          }
        });
      }
    });
  }
  private spinColumnSmooth(
    col: number,
    spinDuration: number,
    onComplete: () => void
  ) {
    const tweenDuration = 100; // duration for each roll iteration (ms)
    const iterations = Math.floor(spinDuration / tweenDuration);
    const rollDistance = this.IMAGE_HEIGHT + this.V_GAP;
    let iterationsLeft = iterations;

    const rollIteration = () => {
      this.tweens.add({
        targets: this.reels[col],
        // Animate each image upward by rollDistance.
        y: (target: Phaser.GameObjects.Image) => target.y - rollDistance,
        duration: tweenDuration,
        ease: "Linear",
        onComplete: () => {
          // Cycle the top image to the bottom.
          const topImage = this.reels[col].shift()!;
          const lastImage = this.reels[col][this.reels[col].length - 1];
          topImage.y = lastImage.y + rollDistance;
          this.reels[col].push(topImage);

          iterationsLeft--;
          if (iterationsLeft > 0) {
            rollIteration();
          } else {
            // When done, sort images by their y positions and snap them back.
            this.reels[col].sort((a, b) => a.y - b.y);
            let tweensCompleted = 0;
            this.reels[col].forEach((image, index) => {
              this.tweens.add({
                targets: image,
                y: this.reelInitialYs[col][index],
                duration: tweenDuration,
                ease: "Linear",
                onComplete: () => {
                  tweensCompleted++;
                  if (tweensCompleted === this.reels[col].length) {
                    onComplete();
                  }
                }
              });
            });
          }
        }
      });
    };

    rollIteration();
  }

  private evaluateWin() {
    const winningSymbols: string[] = [];
    for (let col = 0; col < this.REELS_COLUMNS; col++) {
      // Ensure images are sorted by their Y position.
      this.reels[col].sort((a, b) => a.y - b.y);
      winningSymbols.push(this.reels[col][this.WINNING_ROW].texture.key);
    }
    // Check for three or more consecutive columns (from left) with the same symbol.
    const winningSymbol = winningSymbols[0];
    let matchCount = 1;
    for (let col = 1; col < this.REELS_COLUMNS; col++) {
      if (winningSymbols[col] === winningSymbol) {
        matchCount++;
      } else {
        break;
      }
    }
    if (matchCount >= 3 && this.payTable[winningSymbol]) {
      // Optionally, change the winning images to their connected version.
      for (let col = 0; col < matchCount; col++) {
        this.reels[col]
          .sort((a, b) => a.y - b.y)[this.WINNING_ROW]
          .setTexture(winningSymbol + "_connect");
      }
      const payout = this.payTable[winningSymbol];
      this.winText.setText(`Win: ${payout}`);
    } else {
      this.winText.setText("No Win");
    }
  }
}
