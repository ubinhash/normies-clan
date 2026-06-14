/** Minimal ABI for NormiesClanWar proxy reads + joinClan. */
export const normiesClanWarAbi = [
  {
    type: "function",
    name: "joinClan",
    stateMutability: "payable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "clan", type: "uint8" },
      { name: "fromBurnPool", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "joinFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "pot",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "round",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "roundJoinDeadline",
    stateMutability: "view",
    inputs: [{ name: "round_", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "roundResults",
    stateMutability: "view",
    inputs: [{ name: "round", type: "uint256" }],
    outputs: [
      { name: "winningClan", type: "uint8" },
      { name: "potPaid", type: "uint256" },
      { name: "winnerCount", type: "uint256" },
      { name: "resolved", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "avgEditDistance",
    stateMutability: "view",
    inputs: [
      { name: "round", type: "uint256" },
      { name: "clan", type: "uint8" },
    ],
    outputs: [{ name: "avg", type: "uint256" }],
  },
  {
    type: "function",
    name: "getClanMembers",
    stateMutability: "view",
    inputs: [
      { name: "round_", type: "uint256" },
      { name: "clan", type: "uint8" },
    ],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { name: "tokenId", type: "uint256" },
          { name: "enlistedBy", type: "address" },
          { name: "fromBurnPool", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "fighters",
    stateMutability: "view",
    inputs: [
      { name: "round", type: "uint256" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [
      { name: "clan", type: "uint8" },
      { name: "enlistedBy", type: "address" },
      { name: "fromBurnPool", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "resolveWar",
    stateMutability: "nonpayable",
    inputs: [{ name: "emergencyEnd", type: "bool" }],
    outputs: [],
  },
  {
    type: "function",
    name: "evictFromClan",
    stateMutability: "payable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "evictedFromClan",
    stateMutability: "view",
    inputs: [
      { name: "round", type: "uint256" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [{ type: "uint8" }],
  },
] as const;
