/** Ethereum mainnet JSON-RPC (PublicNode). Override via NEXT_PUBLIC_MAINNET_RPC_URL. */
export const MAINNET_RPC_URL =
  process.env.NEXT_PUBLIC_MAINNET_RPC_URL?.trim() ||
  "https://ethereum-rpc.publicnode.com";
