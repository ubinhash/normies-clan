"use client";

import { useEffect, useRef } from "react";
import { PIXEL_COUNT } from "@/lib/average-face";

const SIZE = 40;
const OFF = { r: 227, g: 229, b: 228 };
const ON = { r: 72, g: 73, b: 75 };

type NormieSoftAverageProps = {
  means: number[];
  scale?: number;
  className?: string;
};

export function NormieSoftAverage({
  means,
  scale = 5,
  className,
}: NormieSoftAverageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const px = SIZE * scale;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || means.length !== PIXEL_COUNT) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const m = Math.min(1, Math.max(0, means[y * SIZE + x]!));
        const r = Math.round(OFF.r + (ON.r - OFF.r) * m);
        const g = Math.round(OFF.g + (ON.g - OFF.g) * m);
        const b = Math.round(OFF.b + (ON.b - OFF.b) * m);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }, [means, scale]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={px}
      height={px}
      style={{ width: px, height: px, imageRendering: "pixelated" }}
      aria-hidden
    />
  );
}
