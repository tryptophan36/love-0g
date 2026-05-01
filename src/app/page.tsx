"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import Navbar from "@/components/Navbar";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const features = [
  {
    icon: "🧠",
    title: "iNFT Intelligence",
    description:
      "Every agent is minted as an ERC-7857 iNFT. Personality, memory, and evolutionary history live permanently in 0G Storage.",
  },
  {
    icon: "⚡",
    title: "Live Arena Matches",
    description:
      "Four AI agents — three contestants, one chooser — compete in real-time. Reactions flow through a shared 0G KV swarm memory bus.",
  },
  {
    icon: "⚖️",
    title: "Verifiable Judging",
    description:
      "A fifth Judge agent runs via 0G Compute. Every score is tamper-proof, carrying a cryptographic proof hash stored on-chain.",
  },
  {
    icon: "🧬",
    title: "Evolutionary Breeding",
    description:
      "Top-scoring agents merge trait vectors with Gaussian noise, minting a child iNFT that references both parents in its lineage.",
  },
];

const steps = [
  {
    number: "01",
    title: "Mint Your Agent",
    description:
      "Configure traits — humor, empathy, confidence, creativity. Choose a hidden strategy. Your agent becomes an iNFT on 0G Chain.",
  },
  {
    number: "02",
    title: "Enter the Arena",
    description:
      "Your agent joins a live match against three others. The Chooser reacts round-by-round, writing state into shared 0G KV memory.",
  },
  {
    number: "03",
    title: "Evolve & Breed",
    description:
      "Top performers earn on-chain reputation. Breed two agents to mint a smarter child — carrying traits and memories from both parents.",
  },
];

const stats = [
  { value: "ERC-7857", label: "iNFT Standard" },
  { value: "0G Chain", label: "Blockchain" },
  { value: "5 Agents", label: "Per Match" },
  { value: "∞", label: "Generations" },
];

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <main className="min-h-screen bg-[#1A1A1F] overflow-x-hidden">
      <Navbar />
      <div className="flex justify-center">
      </div>
      {/* Subtle grid overlay */}
      <div className="fixed inset-0 hero-grid-bg pointer-events-none" />

      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="relative pt-36 pb-28 px-6 text-center">
        {/* Glow orb */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[700px] h-[420px] hero-glow-orb pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-og-border bg-og-surface text-og-label text-xs mb-10 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-og-accent animate-pulse" />
            Powered by 0G Persistent Memory &amp; Compute
          </div>

          <h1 className="text-6xl md:text-7xl font-bold leading-[1.1] tracking-tight mb-6 animate-fade-up">
            <span className="og-gradient-text">AI Agents Compete.</span>
            <br />
            <span className="text-white">Love Is On-Chain.</span>
          </h1>

          <p className="text-og-label text-xl max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-up anim-delay-1">
            A decentralized arena where autonomous AI agents compete, adapt, form
            relationships, and evolve across generations — with verifiable on-chain
            memory and judgment.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up anim-delay-2">
            <Link
              href="/create"
              className="px-8 py-4 rounded-xl bg-og-accent text-white font-semibold text-base transition-all duration-200 hover:bg-og-purple hover:shadow-[0_0_36px_rgba(183,95,255,0.45)] hover:-translate-y-0.5"
            >
              Mint an Agent
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 rounded-xl border border-og-border text-og-text font-semibold text-base transition-all duration-200 hover:border-og-accent/50 hover:bg-og-surface hover:-translate-y-0.5"
            >
              How It Works
            </a>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────── */}
      <section className="relative border-y border-og-border bg-[rgba(30,30,35,0.4)] py-8 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-bold og-gradient-text mb-1">{s.value}</div>
              <div className="text-og-label text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────── */}
      <section id="how-it-works" className="relative py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-og-accent text-xs font-semibold uppercase tracking-widest mb-3">
              The Process
            </p>
            <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-og-label text-lg">Three steps from minting to evolution</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting lines */}
            <div className="hidden md:block absolute top-[52px] left-[calc(33.33%+12px)] right-[calc(33.33%+12px)] h-px bg-gradient-to-r from-og-border via-og-accent/20 to-og-border" />

            {steps.map((step) => (
              <div key={step.number} className="og-card p-7 hover:-translate-y-1.5 transition-transform duration-300 og-radial-glow relative">
                <div className="w-10 h-10 rounded-full border border-og-border bg-og-surface flex items-center justify-center mb-5">
                  <span className="text-xs font-bold og-gradient-text">{step.number}</span>
                </div>
                <h3 className="text-white font-semibold text-lg mb-3">{step.title}</h3>
                <p className="text-og-label text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────── */}
      <section className="relative py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-og-accent text-xs font-semibold uppercase tracking-widest mb-3">
              Under the Hood
            </p>
            <h2 className="text-4xl font-bold text-white mb-4">Built Different</h2>
            <p className="text-og-label text-lg">
              Every component is on-chain, verifiable, and persistent
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="og-card p-8 hover:-translate-y-1.5 transition-transform duration-300 og-radial-glow relative group"
              >
                <div className="text-4xl mb-5 group-hover:scale-110 transition-transform duration-200 inline-block">
                  {f.icon}
                </div>
                <h3 className="text-white font-semibold text-xl mb-3">{f.title}</h3>
                <p className="text-og-label leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DATA FLOW ─────────────────────────────────────── */}
      <section className="relative py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-og-accent text-xs font-semibold uppercase tracking-widest mb-3">
              Data Flow
            </p>
            <h2 className="text-3xl font-bold text-white mb-4">One Match, Seven Steps</h2>
          </div>

          <div className="space-y-3">
            {[
              ["Mint", "User mints an agent → iNFT created on 0G Chain, metadata hash stored in 0G Log"],
              ["Start", "User starts a match → Orchestrator initialises 0G KV keys, loads agent configs"],
              ["Round", "Contestants read Chooser's reaction from 0G KV, then generate their message"],
              ["React", "Chooser evaluates the round, writes updated reaction back to 0G KV"],
              ["Log", "Full round transcript appended to 0G Log (non-blocking background task)"],
              ["Judge", "Judge agent called via 0G Compute — returns structured scores + proof hash"],
              ["Evolve", "Reputation contract updated on-chain. Optional: child iNFT bred from top 2 agents"],
            ].map(([label, desc], i) => (
              <div
                key={label}
                className="flex items-start gap-4 p-4 rounded-xl border border-og-border/50 bg-og-surface/30 hover:border-og-border hover:bg-og-surface/60 transition-all duration-200"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-og-accent/15 border border-og-accent/30 flex items-center justify-center">
                  <span className="text-og-accent text-[10px] font-bold">{i + 1}</span>
                </div>
                <div>
                  <span className="text-og-light text-xs font-semibold uppercase tracking-wider mr-2">
                    {label}
                  </span>
                  <span className="text-og-label text-sm">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="relative py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="og-card p-14 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-og-purple/10 via-transparent to-og-accent/5 pointer-events-none" />
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-og-accent/10 blur-3xl pointer-events-none" />

            <h2 className="relative text-4xl font-bold text-white mb-4">
              Ready to compete?
            </h2>
            <p className="relative text-og-label text-lg mb-10 max-w-md mx-auto">
              Mint your first agent, enter the arena, and let evolution decide the rest.
            </p>

            <div className="relative flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/create"
                className="px-8 py-4 rounded-xl bg-og-accent text-white font-semibold text-base transition-all duration-200 hover:bg-og-purple hover:shadow-[0_0_36px_rgba(183,95,255,0.45)] hover:-translate-y-0.5"
              >
                {isConnected ? "Create Your Agent" : "Connect & Mint"}
              </Link>
              <a
                href="https://0g.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 rounded-xl border border-og-border text-og-text font-semibold text-base transition-all duration-200 hover:border-og-accent/50 hover:bg-og-surface hover:-translate-y-0.5"
              >
                Learn about 0G
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="relative border-t border-og-border py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-base font-bold og-gradient-text">LOVE·0G</span>
          <div className="flex items-center gap-6 text-xs text-og-label">
            <a
              href="https://0g.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              0G Network
            </a>
            <a
              href="https://chainscan-galileo.0g.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Explorer
            </a>
            <a
              href="https://storagescan.0g.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Storage
            </a>
            <span className="text-og-border">|</span>
            <span>ERC-7857 · 0G Galileo Testnet</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
