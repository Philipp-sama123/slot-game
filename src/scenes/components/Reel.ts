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
      const img = this.scene.add
        .image(this.x, y, symbol)
        .setDisplaySize(this.imageWidth, this.imageHeight);
      this.images.push(img);
      this.initialYs.push(y);
    }
  }

  public spin(
    spinDuration: number,
    tweenDuration: number,
    rollDistance: number
  ): Promise<void> {
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

  public updateSymbol(rowIndex: number, symbol: string) {
    if (rowIndex < this.images.length) {
      this.images[rowIndex].setTexture(symbol);
    }
  }

  public setImageAt(rowIndex: number, texture: string) {
    this.images.sort((a, b) => a.y - b.y);
    if (rowIndex < this.images.length) {
      this.images[rowIndex].setTexture(texture);
    }
  }

  public getImageAt(rowIndex: number): Phaser.GameObjects.Image {
    this.images.sort((a, b) => a.y - b.y);
    return this.images[rowIndex];
  }
}
