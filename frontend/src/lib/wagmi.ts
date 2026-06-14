import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet } from "wagmi/chains";
import { http } from "viem";
import { MAINNET_RPC_URL } from "./mainnet-rpc";

export const wagmiConfig = getDefaultConfig({
  appName: "The Norm of Normies",
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
    "00000000000000000000000000000000",
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(MAINNET_RPC_URL),
  },
  ssr: true,
});
