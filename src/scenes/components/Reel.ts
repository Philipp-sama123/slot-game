
export class Reel {
  private images: Phaser.GameObjects.Image[] = [];
  private initialYs: number[] = [];

  constructor(
    private scene: Phaser.Scene,
    private colIndex: number,
    private x: number,
    startY: number,
    private imageWidth: number,
    private imageHeight: number,
    private vGap: number,
    private rowCount: number,
    initialSymbols: string[]
  ) {
    for (let row = 0; row < rowCount; row++) {
      const symbol = initialSymbols[row];
      const y = startY + row * (this.imageHeight + this.vGap);
      const img = this.scene.add.image(this.x, y, symbol);
      this.images.push(img);
      this.initialYs.push(y);
    }
  }

  /**
   * Spins this reel with a smooth rolling animation.
   * Returns a promise that resolves when the reel finishes spinning.
   */
  public spin(spinDuration: number, tweenDuration: number, rollDistance: number): Promise<void> {
    return new Promise((resolve) => {
      let iterations = Math.floor(spinDuration / tweenDuration);

      const rollIteration = () => {
        if (iterations <= 0) {
          // Final snap: sort images by y and tween back to initial positions.
          this.images.sort((a, b) => a.y - b.y);
          let completed = 0;
          this.images.forEach((img, index) => {
            this.scene.tweens.add({
              targets: img,
              y: this.initialYs[index],
              duration: tweenDuration,
              ease: "Linear",
              onComplete: () => {
                completed++;
                if (completed === this.images.length) {
                  resolve();
                }
              },
            });
          });
          return;
        }

        // Tween all images upward.
        this.scene.tweens.add({
          targets: this.images,
          y: (target: Phaser.GameObjects.Image) => target.y - rollDistance,
          duration: tweenDuration,
          ease: "Linear",
          onComplete: () => {
            // Cycle the top image to the bottom.
            const topImage = this.images.shift()!;
            const lastImage = this.images[this.images.length - 1];
            topImage.y = lastImage.y + rollDistance;
            this.images.push(topImage);
            iterations--;
            rollIteration();
          },
        });
      };

      rollIteration();
    });
  }

  /**
   * Update the symbol for the given row in this reel.
   */
  public updateSymbol(rowIndex: number, symbol: string) {
    if (rowIndex < this.images.length) {
      this.images[rowIndex].setTexture(symbol);
    }
  }

  /**
   * Replace the symbol at the given row with a new texture (useful for win effects).
   */
  public setImageAt(rowIndex: number, texture: string) {
    this.images.sort((a, b) => a.y - b.y);
    if (rowIndex < this.images.length) {
      this.images[rowIndex].setTexture(texture);
    }
  }

  /**
   * Get the image object at the specified row.
   */
  public getImageAt(rowIndex: number): Phaser.GameObjects.Image {
    this.images.sort((a, b) => a.y - b.y);
    return this.images[rowIndex];
  }
}
