import type { NormieTraitEntry } from "@/lib/types";
import {
  TRAIT_TYPES_LEFT,
  TRAIT_TYPES_RIGHT,
  traitValue,
} from "@/lib/traits";

type NormieTraitsPanelProps = {
  traits: NormieTraitEntry | null | undefined;
  loading?: boolean;
  side: "left" | "right";
};

export function NormieTraitsPanel({
  traits,
  loading,
  side,
}: NormieTraitsPanelProps) {
  const labels = side === "left" ? TRAIT_TYPES_LEFT : TRAIT_TYPES_RIGHT;
  const alignRight = side === "left";

  return (
    <dl
      className={`flex flex-col gap-3 ${
        alignRight
          ? "items-center text-center sm:items-end sm:text-right"
          : "items-center text-center sm:items-start sm:text-left"
      }`}
    >
      {labels.map((label) => (
        <div key={label}>
          <dt className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
            {label}
          </dt>
          <dd className="mt-0.5 text-sm text-zinc-800">
            {loading ? (
              <span className="inline-block h-4 w-20 animate-pulse rounded bg-zinc-100" />
            ) : (
              traitValue(traits ?? undefined, label) ?? "—"
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
