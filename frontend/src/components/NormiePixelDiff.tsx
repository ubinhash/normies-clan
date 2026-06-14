"use client";

import { useEffect, useRef } from "react";

const SIZE = 40;
const ON = "#48494b";
const OFF = "#e3e5e4";
/** Query on, similar off — pixel removed vs query. */
const MISSING = "#f87171";
/** Query off, similar on — pixel added vs query. */
const EXTRA = "#60a5fa";

type NormiePixelDiffProps = {
  queryBits: string;
  bits: string;
  scale?: number;
  className?: string;
};

/** Renders `bits` with pixels that differ from `queryBits` highlighted. */
export function NormiePixelDiff({
  queryBits,
  bits,
  scale = 8,
  className,
}: NormiePixelDiffProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const px = SIZE * scale;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || bits.length !== SIZE * SIZE || queryBits.length !== SIZE * SIZE) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = y * SIZE + x;
        const queryOn = queryBits[i] === "1";
        const on = bits[i] === "1";

        let color: string;
        if (queryOn && !on) {
          color = MISSING;
        } else if (!queryOn && on) {
          color = EXTRA;
        } else {
          color = on ? ON : OFF;
        }

        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }, [queryBits, bits, scale]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={px}
      height={px}
      style={{ width: px, height: px, imageRendering: "pixelated" }}
    />
  );
}
