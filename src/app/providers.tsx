"use client";

import { useState, useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

import { zgTestnet } from "../lib/config";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ReturnType<typeof getDefaultConfig> | null>(null);

  useEffect(() => {
    const wagmiConfig = getDefaultConfig({
      appName: "Agentic ID",
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
      chains: [zgTestnet],
    });
    setConfig(wagmiConfig);
  }, []);

  if (!config) {
    return <div className="min-h-screen bg-gray-950" />;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
