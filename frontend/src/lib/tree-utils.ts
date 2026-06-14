import type { TreeData } from "./types";

/** Path from medoid (root) down to `index` (inclusive). */
export function pathFromRoot(index: number, parent: number[]): number[] {
  const path: number[] = [];
  let i = index;
  while (i >= 0) {
    path.push(i);
    i = parent[i]!;
  }
  return path.reverse();
}

export function childIndices(tree: TreeData, index: number): number[] {
  return tree.children[String(index)] ?? [];
}

/** Expand all ancestors so `index` is visible in the tree. */
export function ancestorsToExpand(index: number, parent: number[]): number[] {
  const path = pathFromRoot(index, parent);
  return path.slice(0, -1);
}

export function findIndexByTokenId(tree: TreeData, tokenId: number): number {
  const idx = tree.ids.indexOf(tokenId);
  return idx;
}
