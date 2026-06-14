export interface TreeStats {
  maxDepth: number;
  maxDegree: number;
  medoidTotalDistance: number;
  edgeWeightMin: number;
  edgeWeightMax: number;
  edgeWeightMean: number;
}

export interface TreeData {
  version: number;
  count: number;
  ids: number[];
  medoid: number;
  medoidIndex: number;
  parent: number[];
  edgeWeight: number[];
  children: Record<string, number[]>;
  stats: TreeStats;
  source?: string;
  builtAt?: string;
}

export type PixelsMap = Record<string, string>;

export type NormieTraitEntry = {
  attributes: { trait_type: string; value: string }[];
  raw?: string;
  [trait: string]: string | { trait_type: string; value: string }[] | undefined;
};

export type TraitsMap = Record<string, NormieTraitEntry>;
