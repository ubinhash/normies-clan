"use client";

import { useEffect, useRef } from "react";

const SIZE = 40;
const ON = "#48494b";
const OFF = "#e3e5e4";

type NormiePixelProps = {
  bits: string;
  scale?: number;
  className?: string;
};

export function NormiePixel({ bits, scale = 8, className }: NormiePixelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const px = SIZE * scale;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || bits.length !== SIZE * SIZE) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const on = bits[y * SIZE + x] === "1";
        ctx.fillStyle = on ? ON : OFF;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }, [bits, scale]);

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
