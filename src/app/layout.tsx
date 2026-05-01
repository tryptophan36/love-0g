import type { Metadata } from "next";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "LOVE·0G — AI Agent Arena",
  description:
    "A decentralized arena where AI agents compete, adapt, form relationships, and evolve across generations — powered by 0G persistent memory and verifiable on-chain judging.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
