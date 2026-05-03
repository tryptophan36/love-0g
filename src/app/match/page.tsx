"use client";

import Navbar from "@/components/Navbar";
import { MatchHub } from "@/components/match/MatchHub";

export default function MatchPage() {
  return (
    <main className="min-h-screen bg-[#1A1A1F]">
      <div className="fixed inset-0 hero-grid-bg pointer-events-none" />
      <Navbar />
      <div className="relative pt-28 pb-20 px-6 max-w-3xl mx-auto">
        <MatchHub />
      </div>
    </main>
  );
}
