import Phaser from "phaser";

export class Reel {
  private images: Phaser.GameObjects.Image[] = [];
  private initialYs: number[] = [];
  private x: number;
  private imageWidth: number;
  private imageHeight: number;
  private vGap: number;
  private rowCount: number;

  constructor(
    private scene: Phaser.Scene,
    private colIndex: number,
    x: number,
    startY: number,
    imageWidth: number,
    imageHeight: number,
    vGap: number,
    rowCount: number,
    initialSymbols: string[]
  ) {
    this.x = x;
    this.imageWidth = imageWidth;
    this.imageHeight = imageHeight;
    this.vGap = vGap;
    this.rowCount = rowCount;

    for (let row = 0; row < rowCount; row++) {
      const symbol = initialSymbols[row];
      const y = startY + row * (imageHeight + vGap);
      const img = this.scene.add
        .image(x, y, symbol)
        .setDisplaySize(imageWidth, imageHeight);
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
      const roll = () => {
        if (iterations <= 0) {
          this.images.sort((a, b) => a.y - b.y);
          let done = 0;
          this.images.forEach((img, i) => {
            this.scene.tweens.add({
              targets: img,
              y: this.initialYs[i],
              duration: tweenDuration,
              ease: "Linear",
              onComplete: () => {
                if (++done === this.images.length) resolve();
              },
            });
          });
          return;
        }
        this.scene.tweens.add({
          targets: this.images,
          y: (t: Phaser.GameObjects.Image) => t.y - rollDistance,
          duration: tweenDuration,
          ease: "Linear",
          onComplete: () => {
            const top = this.images.shift()!;
            const last = this.images[this.images.length - 1];
            top.y = last.y + rollDistance;
            this.images.push(top);
            iterations--;
            roll();
          },
        });
      };
      roll();
    });
  }

  public updateSymbol(row: number, symbol: string) {
    this.images.sort((a, b) => a.y - b.y);
    if (row < this.images.length) this.images[row].setTexture(symbol);
  }

  public getImageAt(row: number) {
    this.images.sort((a, b) => a.y - b.y);
    return this.images[row];
  }

  public resize(w: number, h: number, gap: number) {
    this.imageWidth = w;
    this.imageHeight = h;
    this.vGap = gap;
    this.images.forEach((img) => img.setDisplaySize(w, h));
  }

  public reposition(nx: number, startY: number) {
    this.x = nx;
    for (let i = 0; i < this.images.length; i++) {
      const img = this.images[i];
      img.setPosition(nx, startY + i * (this.imageHeight + this.vGap));
      this.initialYs[i] = img.y;
    }
  }

  public getStepSize() {
    return this.imageHeight + this.vGap;
  }
}
