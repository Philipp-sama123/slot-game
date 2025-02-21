import Phaser from "phaser";

export class Game extends Phaser.Scene {
  // List of symbols (M1–M6, H1–H6, A, Bonus, 9, 10, J, Q, K)
  private symbols = [
    "M1",
    "M2",
    "M3",
    "M4",
    "M5",
    "M6",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "A",
    "Bonus",
    "9",
    "10",
    "J",
    "Q",
    "K",
  ];

  // Each column is an array of images.
  private reels: Phaser.GameObjects.Image[][] = [];
  // Store each column’s initial y positions (for snapping back when stopping).
  private reelInitialYs: number[][] = [];
  private spinButton!: Phaser.GameObjects.Image;
  private winText!: Phaser.GameObjects.Text;
  private payTable: Record<string, number> = {
    M1: 10,
    M2: 15,
    M3: 20,
    M4: 25,
    M5: 30,
    M6: 35,
    H1: 10,
    H2: 15,
    H3: 20,
    H4: 25,
    H5: 30,
    H6: 35,
    A: 50,
    Bonus: 100,
    "9": 5,
    "10": 10,
    J: 15,
    Q: 20,
    K: 25,
  };

  private isSpinning = false;

  // Image dimensions and spacing.
  private readonly IMAGE_WIDTH = 200;
  private readonly IMAGE_HEIGHT = 200;
  private readonly H_GAP = 20;
  private readonly V_GAP = 20;

  constructor() {
    super({ key: "Game", active: true });
  }

  preload() {
    // Load background and spin button.
    this.load.image("background", "assets/bg.png");
    this.load.image("spinButton", "assets/logo.png");
    // Load both normal and connected versions for each symbol.
    this.symbols.forEach((symbol) => {
      this.load.image(symbol, `assets/symbol/${symbol}.png`);
      this.load.image(
        symbol + "_connect",
        `assets/symbol-connected/${symbol}_connect.png`
      );
    });
  }

  create() {
    // Add background.
    this.add.image(640, 360, "background");

    // Create win text.
    this.winText = this.add
      .text(640, 20, "", { fontSize: "32px", color: "#FFF" })
      .setOrigin(0.5)
      .setDepth(1000);

    // Calculate grid positions so the reels are centered.
    const reelsColumns = 5;
    const reelsRows = 3;
    const totalReelWidth =
      reelsColumns * this.IMAGE_WIDTH + (reelsColumns - 1) * this.H_GAP;
    const totalReelHeight =
      reelsRows * this.IMAGE_HEIGHT + (reelsRows - 1) * this.V_GAP;
    const startX =
      (this.cameras.main.width - totalReelWidth) / 2 + this.IMAGE_WIDTH / 2;
    const startY =
      (this.cameras.main.height - totalReelHeight) / 2 + this.IMAGE_HEIGHT / 2;

    // Create each reel (column) as an array of images.
    for (let col = 0; col < reelsColumns; col++) {
      this.reels[col] = [];
      this.reelInitialYs[col] = [];
      for (let row = 0; row < reelsRows; row++) {
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

  private getRandomSymbol(): string {
    return this.symbols[Math.floor(Math.random() * this.symbols.length)];
  }

  /**
   * Initiates the spin. For each column, a final outcome is pre‑determined,
   * and a predetermined spin sequence is generated.
   */
  private spinReels() {
    if (this.isSpinning) return;
    this.isSpinning = true;
    this.winText.setText("");

    let reelsFinished = 0;
    const finalSymbols: string[][] = [];
    const spinSequences: string[][] = [];
    const reelsColumns = 5;
    const reelsRows = 3;
    const tweenDuration = 100;
    const baseSpinDuration = 2000;
    const spinDelayIncrement = 300;

    // Pre-determine final outcome and spin sequence for each column.
    for (let col = 0; col < reelsColumns; col++) {
      finalSymbols[col] = [];
      spinSequences[col] = [];
      // Pre-determine the final symbols.
      for (let row = 0; row < reelsRows; row++) {
        finalSymbols[col][row] = this.getRandomSymbol();
      }
      // Determine the number of roll iterations for this column.
      const spinDuration = baseSpinDuration + col * spinDelayIncrement;
      const iterations = Math.floor(spinDuration / tweenDuration);
      // Generate a predetermined spin sequence.
      // The sequence length should cover all roll iterations plus the initial reel length.
      for (let i = 0; i < iterations + reelsRows; i++) {
        spinSequences[col][i] = this.getRandomSymbol();
      }
    }

    // Spin each column.
    for (let col = 0; col < reelsColumns; col++) {
      const spinDuration = baseSpinDuration + col * spinDelayIncrement;
      this.spinColumnSmooth(
        col,
        spinDuration,
        finalSymbols[col],
        spinSequences[col],
        () => {
          reelsFinished++;
          if (reelsFinished === reelsColumns) {
            // When all reels are done, evaluate the win (using the middle row).
            this.evaluateWin(finalSymbols);
            this.isSpinning = false;
          }
        }
      );
    }
  }

  private spinColumnSmooth(
    col: number,
    spinDuration: number,
    finalSymbols: string[],
    spinSequence: string[],
    onComplete: () => void
  ) {
    const tweenDuration = 100; // duration of one roll iteration (ms)
    const iterations = Math.floor(spinDuration / tweenDuration);
    const rollDistance = this.IMAGE_HEIGHT + this.V_GAP;
    let iterationsLeft = iterations;
    let spinIndex = this.reels[col].length;

    const rollIteration = () => {
      // Tween all images in the column upward by rollDistance.
      this.tweens.add({
        targets: this.reels[col],
        y: (target: Phaser.GameObjects.Image) => target.y - rollDistance,
        duration: tweenDuration,
        ease: "Linear",
        onComplete: () => {
          // Recycle the top image to the bottom.
          const topImage = this.reels[col].shift()!;
          const lastImage = this.reels[col][this.reels[col].length - 1];
          topImage.y = lastImage.y + rollDistance;
          // Use the predetermined spin sequence.
          topImage.setTexture(spinSequence[spinIndex]);
          spinIndex++;
          this.reels[col].push(topImage);

          iterationsLeft--;
          if (iterationsLeft > 0) {
            rollIteration();
          } else {
            // Once spinning is done, reset positions and apply final textures.
            this.reels[col].sort((a, b) => a.y - b.y);
            let tweensCompleted = 0;
            this.reels[col].forEach((image, index) => {
              image.setTexture(finalSymbols[index]);
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

  private evaluateWin(finalSymbols: string[][]) {
    const winningRow = 1;
    const winningSymbol = finalSymbols[0][winningRow];
    let matchCount = 1;
    for (let col = 1; col < 5; col++) {
      if (finalSymbols[col][winningRow] === winningSymbol) {
        matchCount++;
      } else {
        break;
      }
    }

    let payout = 0;
    if (matchCount >= 3 && this.payTable[winningSymbol]) {
      payout = this.payTable[winningSymbol];
      // For winning columns, change the middle cell to its connected version.
      for (let col = 0; col < matchCount; col++) {
        this.reels[col].sort((a, b) => a.y - b.y);
        this.reels[col][winningRow].setTexture(winningSymbol + "_connect");
      }
    }
    if (payout > 0) {
      this.winText.setText(`Win: ${payout}`);
    }
  }
}
