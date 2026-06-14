const GRID = 40;

export type DiffProfile = {
  rowMissing: number[];
  rowExtra: number[];
  colMissing: number[];
  colExtra: number[];
};

export function computeDiffProfile(
  queryBits: string,
  bits: string,
): DiffProfile | null {
  if (queryBits.length !== GRID * GRID || bits.length !== GRID * GRID) {
    return null;
  }

  const rowMissing = new Array<number>(GRID).fill(0);
  const rowExtra = new Array<number>(GRID).fill(0);
  const colMissing = new Array<number>(GRID).fill(0);
  const colExtra = new Array<number>(GRID).fill(0);

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const i = row * GRID + col;
      const queryOn = queryBits[i] === "1";
      const on = bits[i] === "1";
      if (queryOn && !on) {
        rowMissing[row]!++;
        colMissing[col]!++;
      } else if (!queryOn && on) {
        rowExtra[row]!++;
        colExtra[col]!++;
      }
    }
  }

  return { rowMissing, rowExtra, colMissing, colExtra };
}

export function rowDiffTotal(profile: DiffProfile, row: number): number {
  return profile.rowMissing[row]! + profile.rowExtra[row]!;
}

export function colDiffTotal(profile: DiffProfile, col: number): number {
  return profile.colMissing[col]! + profile.colExtra[col]!;
}
