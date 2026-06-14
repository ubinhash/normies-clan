const PIXEL_LEN = 1600;
const BYTES_PER = 200;

/** Popcount lookup for XOR-of-bytes Hamming on packed pixels. */
const POPCOUNT = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  let v = i;
  let c = 0;
  while (v) {
    c += v & 1;
    v >>= 1;
  }
  POPCOUNT[i] = c;
}

export function packBits(bits: string): Uint8Array {
  if (bits.length !== PIXEL_LEN) {
    throw new Error(`expected ${PIXEL_LEN} bits, got ${bits.length}`);
  }
  const out = new Uint8Array(BYTES_PER);
  for (let i = 0; i < PIXEL_LEN; i++) {
    if (bits[i] === "1") {
      out[i >> 3]! |= 1 << (7 - (i & 7));
    }
  }
  return out;
}

export function hammingPacked(a: Uint8Array, b: Uint8Array): number {
  let d = 0;
  for (let i = 0; i < BYTES_PER; i++) {
    d += POPCOUNT[a[i]! ^ b[i]!]!;
  }
  return d;
}
