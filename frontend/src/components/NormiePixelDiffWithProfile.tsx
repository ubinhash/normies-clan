"use client";

import { useId, useMemo } from "react";
import {
  colDiffTotal,
  computeDiffProfile,
  rowDiffTotal,
} from "@/lib/pixel-diff-profile";
import { NormiePixelDiff } from "./NormiePixelDiff";

const GRID = 40;
const BAR_A = "#a1a1aa";
const BAR_B = "#d4d4d8";
const AXIS = "#aaaaaa";
const BAR_RADIUS = 1.25;
const AXIS_STROKE = 0.75;

export const DIFF_BAR_MAX = 18;
export const DIFF_AXIS_PAD = 6;
/** How far axis lines extend past the image edge before the arrowhead */
export const DIFF_ARROW_EXTEND = 3;
export const DIFF_ARROW_ROOM = DIFF_ARROW_EXTEND + 4;
/** Extra inset so arrowheads stay inside the clickable frame */
export const DIFF_ARROW_HIT_PAD = 4;

type NormiePixelDiffWithProfileProps = {
  queryBits: string;
  bits: string;
  scale?: number;
  barMax?: number;
  axisPad?: number;
};

function barColor(index: number): string {
  return index % 2 === 0 ? BAR_A : BAR_B;
}

/** Column bar with rounded top corners (sits on axis at bottom). */
function columnBarPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  const rr = Math.min(r, w / 2, h);
  return `M ${x} ${y + h} V ${y + rr} Q ${x} ${y} ${x + rr} ${y} H ${x + w - rr} Q ${x + w} ${y} ${x + w} ${y + rr} V ${y + h} Z`;
}

/** Row bar with rounded outer (left) corners. */
function rowBarPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  const rr = Math.min(r, w, h / 2);
  return `M ${x + w} ${y} H ${x + rr} Q ${x} ${y} ${x} ${y + rr} V ${y + h - rr} Q ${x} ${y + h} ${x + rr} ${y + h} H ${x + w} Z`;
}

/**
 * L-shaped axes at the image top-left corner:
 *   ----→  columns (top)
 *   |
 *   ↓ rows (left)
 */
export function NormiePixelDiffWithProfile({
  queryBits,
  bits,
  scale = 3,
  barMax = DIFF_BAR_MAX,
  axisPad = DIFF_AXIS_PAD,
}: NormiePixelDiffWithProfileProps) {
  const uid = useId().replace(/:/g, "");
  const arrowRightId = `diff-arrow-right-${uid}`;
  const arrowDownId = `diff-arrow-down-${uid}`;

  const imgSize = GRID * scale;
  const rowH = imgSize / GRID;
  const colW = imgSize / GRID;
  const colPlotH = barMax + axisPad;
  const rowPlotW = barMax + axisPad;

  const profile = useMemo(
    () => computeDiffProfile(queryBits, bits),
    [queryBits, bits],
  );

  if (!profile) {
    return <NormiePixelDiff queryBits={queryBits} bits={bits} scale={scale} />;
  }

  /** Shared corner = top-left of image */
  const topAxisY = colPlotH - 0.5;
  const leftAxisX = rowPlotW - 0.5;

  return (
    <div
      className="inline-grid shrink-0 overflow-visible"
      style={{
        gridTemplateColumns: `${rowPlotW}px ${imgSize}px`,
        gridTemplateRows: `${colPlotH}px ${imgSize}px`,
        gap: 0,
      }}
    >
      <div aria-hidden />

      {/* Top: column bars + horizontal axis ----→ */}
      <div
        className="relative overflow-visible"
        style={{ width: imgSize, height: colPlotH }}
      >
        <svg
          width={imgSize + DIFF_ARROW_ROOM}
          height={colPlotH}
          viewBox={`0 0 ${imgSize + DIFF_ARROW_ROOM} ${colPlotH}`}
          className="absolute left-0 top-0 overflow-visible"
          aria-hidden
        >
          <defs>
            <marker
              id={arrowRightId}
              markerWidth="4"
              markerHeight="4"
              refX="4"
              refY="2"
              orient="auto"
            >
              <path d="M4 2 L0 0 L0 4 Z" fill={AXIS} />
            </marker>
          </defs>

          <line
            x1={0}
            y1={topAxisY}
            x2={imgSize + DIFF_ARROW_EXTEND}
            y2={topAxisY}
            stroke={AXIS}
            strokeWidth={AXIS_STROKE}
            markerEnd={`url(#${arrowRightId})`}
          />

          {profile.colMissing.map((_, col) => {
            const total = colDiffTotal(profile, col);
            const barH = total > 0 ? Math.max(0.5, (total / GRID) * barMax) : 0;
            if (barH <= 0) return null;
            const x = col * colW + 0.15;
            const w = colW - 0.3;
            const y = topAxisY - barH;
            return (
              <path
                key={col}
                d={columnBarPath(x, y, w, barH, BAR_RADIUS)}
                fill={barColor(col)}
              >
                <title>{`col ${col + 1}: ${total} px`}</title>
              </path>
            );
          })}
        </svg>
      </div>

      {/* Left: row bars + vertical axis |↓ */}
      <div
        className="relative overflow-visible"
        style={{ width: rowPlotW, height: imgSize }}
      >
        <svg
          width={rowPlotW}
          height={imgSize + DIFF_ARROW_ROOM}
          viewBox={`0 0 ${rowPlotW} ${imgSize + DIFF_ARROW_ROOM}`}
          className="absolute left-0 top-0 overflow-visible"
          aria-hidden
        >
          <defs>
            <marker
              id={arrowDownId}
              markerWidth="4"
              markerHeight="4"
              refX="4"
              refY="2"
              orient="90"
            >
              <path d="M4 2 L0 0 L0 4 Z" fill={AXIS} />
            </marker>
          </defs>

          <line
            x1={leftAxisX}
            y1={0}
            x2={leftAxisX}
            y2={imgSize + DIFF_ARROW_EXTEND}
            stroke={AXIS}
            strokeWidth={AXIS_STROKE}
            markerEnd={`url(#${arrowDownId})`}
          />

          {profile.rowMissing.map((_, row) => {
            const total = rowDiffTotal(profile, row);
            const barW = total > 0 ? Math.max(0.5, (total / GRID) * barMax) : 0;
            if (barW <= 0) return null;
            const y = row * rowH + 0.15;
            const h = rowH - 0.3;
            const x = leftAxisX - barW;
            return (
              <path
                key={row}
                d={rowBarPath(x, y, barW, h, BAR_RADIUS)}
                fill={barColor(row)}
              >
                <title>{`row ${row + 1}: ${total} px`}</title>
              </path>
            );
          })}
        </svg>
      </div>

      <NormiePixelDiff
        queryBits={queryBits}
        bits={bits}
        scale={scale}
        className="block"
      />
    </div>
  );
}

/** Mini L-bar chart for diff profile legend */
export function DiffProfileLegendIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      aria-hidden
      className={className}
    >
      <rect x="5" y="0.5" width="1.8" height="2.5" rx="0.4" fill={BAR_A} />
      <rect x="7.2" y="0" width="1.8" height="3" rx="0.4" fill={BAR_B} />
      <rect x="9.4" y="1" width="1.8" height="2" rx="0.4" fill={BAR_A} />
      <line x1="4" y1="3.5" x2="12" y2="3.5" stroke={AXIS} strokeWidth="0.6" />

      <rect x="0.5" y="5" width="2.5" height="1.6" rx="0.4" fill={BAR_A} />
      <rect x="0" y="7" width="3" height="1.6" rx="0.4" fill={BAR_B} />
      <rect x="0.8" y="9" width="2.2" height="1.6" rx="0.4" fill={BAR_A} />
      <line x1="4" y1="3.5" x2="4" y2="12" stroke={AXIS} strokeWidth="0.6" />

      <rect x="4.5" y="4" width="7.5" height="7.5" fill="#f4f4f5" rx="0.5" />
    </svg>
  );
}
