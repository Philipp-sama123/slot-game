export const IMAGE_WIDTH = 100;
export const IMAGE_HEIGHT = 100;
export const SPIN_BUTTON_HEIGHT = 220;
export const SPIN_BUTTON_WIDTH = 480;

export const H_GAP = 10;
export const V_GAP = 10;

export const REELS_COLUMNS = 5;
export const REELS_ROWS = 3;

export const WINNING_ROW = 1;

export const MINIMUM_WIN_AMOUNT = 3;
export const SPIN_START_DELAY = 1500;

export const TWEEN_DURATION = 100;
export const SPIN_START_DURATION = 2000;

export const SYMBOLS = [
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "H8",
  "H9",
  "H7",
  "Bonus",
];

// Pay table mapping symbol to win amount.
export const PAY_TABLE: Record<string, number> = {
  H1: 10,
  H2: 15,
  H3: 20,
  H4: 25,
  H5: 30,
  H6: 35,
  H7: 5,
  H8: 10,
  H9: 50,
  Bonus: 100,
};

export const WEIGHTED_SYMBOLS: { symbol: string; weight: number }[] = [
  { symbol: "H1", weight: 70 },
  { symbol: "H2", weight: 60 },
  { symbol: "H3", weight: 80 },
  { symbol: "H4", weight: 50 },
  { symbol: "H5", weight: 20 },
  { symbol: "H6", weight: 20 },
  { symbol: "H9", weight: 20 },
  { symbol: "H7", weight: 90 },
  { symbol: "H8", weight: 80 },
  { symbol: "Bonus", weight: 20 },
];

export function getRandomWeightedSymbol(preferredSymbol?: string): string {
  // If we have a preferred symbol, 40% chance to return it
  if (preferredSymbol && Math.random() < 0.4) {
    return preferredSymbol;
  }

  const totalWeight = WEIGHTED_SYMBOLS.reduce((sum, sw) => sum + sw.weight, 0);
  let random = Math.random() * totalWeight;
  for (const { symbol, weight } of WEIGHTED_SYMBOLS) {
    if (random < weight) {
      return symbol;
    }
    random -= weight;
  }
  return WEIGHTED_SYMBOLS[0].symbol;
}
