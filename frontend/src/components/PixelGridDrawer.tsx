"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchNormiePixels } from "@/lib/normies-api";
import type { PixelSource } from "@/lib/pixel-source";

const SIZE = 40;
const PIXEL_COUNT = SIZE * SIZE;
const ON = "#48494b";
const OFF = "#e3e5e4";

export function emptyGridBits(): string {
  return "0".repeat(PIXEL_COUNT);
}

export function gridToBits(grid: boolean[]): string {
  let out = "";
  for (let i = 0; i < PIXEL_COUNT; i++) {
    out += grid[i] ? "1" : "0";
  }
  return out;
}

export function bitsToGrid(bits: string): boolean[] {
  if (bits.length !== PIXEL_COUNT) {
    throw new Error(`expected ${PIXEL_COUNT} bits, got ${bits.length}`);
  }
  const grid = Array<boolean>(PIXEL_COUNT);
  for (let i = 0; i < PIXEL_COUNT; i++) {
    grid[i] = bits[i] === "1";
  }
  return grid;
}

function hasInk(bits: string): boolean {
  return bits.includes("1");
}

type Tool = "pen" | "eraser";

type PixelGridDrawerProps = {
  scale?: number;
  disabled?: boolean;
  searching?: boolean;
  pixelSource?: PixelSource;
  originalPixels?: Record<string, string> | null;
  fallbackPixels?: Record<string, string> | null;
  defaultPreloadId?: number | null;
  onPreload?: () => void;
  onSearch: (bits: string) => void;
  onLoadSuccess?: () => void;
};

export function PixelGridDrawer({
  scale = 8,
  disabled,
  searching,
  pixelSource = "original",
  originalPixels,
  fallbackPixels,
  defaultPreloadId,
  onPreload,
  onSearch,
  onLoadSuccess,
}: PixelGridDrawerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<boolean[]>(Array(PIXEL_COUNT).fill(false));
  const paintingRef = useRef(false);
  const toolRef = useRef<Tool>("pen");
  const lastCellRef = useRef<number | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [bits, setBits] = useState(emptyGridBits);
  const [tick, setTick] = useState(0);
  const [preloadInput, setPreloadInput] = useState(
    defaultPreloadId != null ? String(defaultPreloadId) : "",
  );
  const [loadedFrom, setLoadedFrom] = useState<number | null>(null);
  const [preloadError, setPreloadError] = useState<string | null>(null);
  const [preloadLoading, setPreloadLoading] = useState(false);
  const px = SIZE * scale;

  const applyBits = useCallback((nextBits: string) => {
    gridRef.current = bitsToGrid(nextBits);
    setBits(nextBits);
    setTick((t) => t + 1);
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const grid = gridRef.current;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const on = grid[y * SIZE + x];
        ctx.fillStyle = on ? ON : OFF;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }, [scale]);

  useEffect(() => {
    redraw();
  }, [redraw, tick, bits]);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  const paintCell = (index: number | null) => {
    if (index == null || index < 0 || index >= PIXEL_COUNT) return;
    if (lastCellRef.current === index) return;
    lastCellRef.current = index;
    gridRef.current[index] = toolRef.current === "pen";
    setBits(gridToBits(gridRef.current));
    setTick((t) => t + 1);
  };

  const cellFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / scale);
    const y = Math.floor((e.clientY - rect.top) / scale);
    if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return null;
    return y * SIZE + x;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    paintingRef.current = true;
    lastCellRef.current = null;
    paintCell(cellFromEvent(e));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!paintingRef.current || disabled) return;
    paintCell(cellFromEvent(e));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    paintingRef.current = false;
    lastCellRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleClear = () => {
    gridRef.current = Array(PIXEL_COUNT).fill(false);
    setBits(emptyGridBits());
    setLoadedFrom(null);
    setPreloadError(null);
    setTick((t) => t + 1);
  };

  const handlePreload = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(preloadInput.trim(), 10);
    if (Number.isNaN(id) || id < 0 || id > 9999) {
      setPreloadError("Enter a valid token ID (0–9999)");
      return;
    }

    setPreloadError(null);
    setPreloadLoading(true);

    let bits: string | undefined;

    if (pixelSource === "original") {
      bits = originalPixels?.[String(id)];
    } else {
      try {
        bits = await fetchNormiePixels(id);
      } catch {
        bits = fallbackPixels?.[String(id)];
      }
    }

    setPreloadLoading(false);

    if (!bits) {
      setPreloadError(
        pixelSource === "original"
          ? `Token #${id} not in local pixel data`
          : `Could not load #${id} from API or local cache`,
      );
      return;
    }

    applyBits(bits);
    setLoadedFrom(id);
    onPreload?.();
    onLoadSuccess?.();
  };

  const handleSearch = () => {
    if (!hasInk(bits)) return;
    onSearch(bits);
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
      <form
        onSubmit={handlePreload}
        className="flex flex-wrap items-center gap-2 border-b border-zinc-100 pb-3"
      >
        <label htmlFor="preload-token" className="text-xs font-medium text-zinc-600">
          Pre-load Normie
        </label>
        <input
          id="preload-token"
          type="number"
          min={0}
          max={9999}
          placeholder="Token ID"
          value={preloadInput}
          onChange={(e) => setPreloadInput(e.target.value)}
          disabled={
            disabled ||
            preloadLoading ||
            (pixelSource === "original" && !originalPixels)
          }
          className="w-28 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={
            disabled ||
            preloadLoading ||
            (pixelSource === "original" && !originalPixels)
          }
          className="btn-secondary px-3 py-1.5 text-xs"
        >
          {preloadLoading ? "Loading…" : "Load"}
        </button>
        {loadedFrom != null && (
          <span className="text-[11px] text-zinc-400">
            Editing from #{loadedFrom}
          </span>
        )}
        {preloadError && (
          <span className="w-full text-xs text-red-600">{preloadError}</span>
        )}
      </form>

      <div className="mt-3 flex flex-wrap items-start gap-3">
        <canvas
          ref={canvasRef}
          width={px}
          height={px}
          className={`touch-none rounded border border-zinc-200 ${
            disabled ? "cursor-not-allowed opacity-50" : "cursor-crosshair"
          }`}
          style={{ width: px, height: px, imageRendering: "pixelated" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        <div className="flex min-w-[10rem] flex-col gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setTool("pen")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                tool === "pen"
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-200 text-zinc-600 hover:border-zinc-400"
              }`}
            >
              Pen
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setTool("eraser")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                tool === "eraser"
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-200 text-zinc-600 hover:border-zinc-400"
              }`}
            >
              Eraser
            </button>
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={handleClear}
            className="btn-secondary text-xs"
          >
            Clear
          </button>

          <button
            type="button"
            disabled={disabled || searching || !hasInk(bits)}
            onClick={handleSearch}
            className="btn-primary cursor-pointer text-sm disabled:cursor-not-allowed"
          >
            {searching ? "Searching…" : "Find similar"}
          </button>

          {!hasInk(bits) && (
            <p className="text-[11px] text-zinc-400">
              Draw at least one pixel to search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
