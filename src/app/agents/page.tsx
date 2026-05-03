"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import Navbar from "@/components/Navbar";
import { matchStatusLabel, matchStatusBadgeClassName } from "@/lib/matchStatus";

interface TraitVector {
  humor: number;
  empathy: number;
  confidence: number;
  creativity: number;
  authenticity: number;
  wit: number;
}

interface AgentProfile {
  avatar?: string;
  imageUrl?: string;
  age?: string;
  gender?: string;
  origin?: string;
  profession?: string;
  education?: string;
  hobbies?: string;
}

interface Agent {
  id: string;
  tokenId: number;
  name: string;
  traits: TraitVector;
  strategy: string;
  systemPrompt: string;
  profile: AgentProfile;
  owner: string;
  wins: number;
  losses: number;
  createdAt: number;
  ogStorageKey: string;
}

interface AgentMatchInfo {
  matchId: string;
  status: number;
  seatsTaken: number;
  maxContestants: number;
}

type Stat = {
  label: string;
  value: number;
};

type FieldItem = {
  label: string;
  value: string;
  span?: "single" | "double" | "triple";
};

function shortenAddress(value: string): string {
  if (!value) return "N/A";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function winRate(agent: Agent): number {
  const wins = agent.wins ?? 0;
  const losses = agent.losses ?? 0;
  const total = wins + losses;
  return total > 0 ? Math.round((wins / total) * 100) : 0;
}

function dateLabel(createdAt: number): string {
  return createdAt ? new Date(createdAt).toLocaleDateString() : "N/A";
}

function StatCard({ label, value }: Stat) {
  return (
    <div className="og-card p-4">
      <p className="text-xs uppercase tracking-wide text-og-label mb-1">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function InfoGrid({ fields }: { fields: FieldItem[] }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-xs text-og-label mb-3">
      {fields.map((field) => (
        <div
          key={field.label}
          className={`bg-og-surface/50 border border-og-border rounded-lg p-2.5 ${
            field.span === "triple" ? "col-span-3" : field.span === "double" ? "col-span-2" : ""
          }`}
        >
          <p className="mb-1">{field.label}</p>
          <p
            className={`text-white ${
              field.label === "Avatar" ? "text-base" : "text-sm"
            } ${
              field.label === "Agent ID" || field.label === "System Prompt" || field.label === "Image URL"
                ? "break-words"
                : ""
            }`}
          >
            {field.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function MatchStatusChip({ info }: { info: AgentMatchInfo | undefined }) {
  if (!info || info.matchId === "0") {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full border border-og-border bg-og-surface text-og-label">
        No active match
      </span>
    );
  }
  const label = matchStatusLabel(info.status);
  const cls   = matchStatusBadgeClassName(info.status);
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${cls} tabular-nums`}>
      {label} · {info.seatsTaken}/{info.maxContestants} · #{info.matchId}
    </span>
  );
}

function AgentCard({ agent, matchInfo }: { agent: Agent; matchInfo?: AgentMatchInfo }) {
  const quickStats: FieldItem[] = [
    { label: "Owner",    value: shortenAddress(agent.owner) },
    { label: "Win Rate", value: `${winRate(agent)}%` },
    { label: "Record",   value: `${agent.wins ?? 0}W / ${agent.losses ?? 0}L` },
    { label: "Created",  value: dateLabel(agent.createdAt), span: "triple" },
  ];

  const profileFields: FieldItem[] = [
    { label: "Avatar",        value: agent.profile?.imageUrl ? "Profile image set" : agent.profile?.avatar || "N/A" },
    { label: "Age",           value: agent.profile?.age || "Unknown" },
    { label: "Gender",        value: agent.profile?.gender || "Unknown" },
    { label: "Origin",        value: agent.profile?.origin || "Unknown" },
    { label: "Profession",    value: agent.profile?.profession || "Unknown" },
    { label: "Education",     value: agent.profile?.education || "Unknown" },
    { label: "Hobbies",       value: agent.profile?.hobbies || "Unknown", span: "triple" },
    { label: "System Prompt", value: agent.systemPrompt || "N/A", span: "triple" },
    { label: "Agent ID",      value: agent.id, span: "triple" },
  ];

  return (
    <article className="og-card p-4 relative og-radial-glow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {agent.profile?.imageUrl ? (
            <img
              src={agent.profile.imageUrl}
              alt={`${agent.name || "Agent"} avatar`}
              className="w-12 h-12 rounded-full object-cover border border-og-border"
            />
          ) : (
            <div className="w-12 h-12 rounded-full border border-og-border bg-og-surface/60 flex items-center justify-center text-2xl">
              {agent.profile?.avatar || "🤖"}
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold leading-tight">{agent.name || "Unnamed Agent"}</h2>
            <p className="text-xs text-og-label mt-1">Token #{agent.tokenId}</p>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full border border-og-border bg-og-surface text-og-label">
          {agent.strategy || "Unknown strategy"}
        </span>
      </div>

      {/* Match status row */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-og-label">Match</span>
        <MatchStatusChip info={matchInfo} />
      </div>

      <InfoGrid fields={quickStats} />
      <InfoGrid fields={profileFields} />
    </article>
  );
}

export default function AgentsPage() {
  const { address } = useAccount();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchStatuses, setMatchStatuses] = useState<Record<string, AgentMatchInfo>>({});

  /** Orchestrator returns every agent it is authorized to manage; scope UI to the connected wallet. */
  const myAgents = useMemo(() => {
    if (!address) return agents;
    const a = address.toLowerCase();
    return agents.filter(
      (agent) => typeof agent.owner === "string" && agent.owner.toLowerCase() === a
    );
  }, [agents, address]);

  const sortedAgents = useMemo(
    () => [...myAgents].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [myAgents]
  );

  const totalWins = useMemo(
    () => myAgents.reduce((sum, agent) => sum + (agent.wins ?? 0), 0),
    [myAgents]
  );

  const totalMatches = useMemo(
    () => myAgents.reduce((sum, agent) => sum + (agent.wins ?? 0) + (agent.losses ?? 0), 0),
    [myAgents]
  );

  const stats: Stat[] = useMemo(
    () => [
      { label: "Total Agents",  value: myAgents.length },
      { label: "Total Wins",    value: totalWins },
      { label: "Total Matches", value: totalMatches },
    ],
    [myAgents.length, totalMatches, totalWins]
  );

  useEffect(() => {
    let mounted = true;

    async function loadAgents() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/agents", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          const message = data?.error ?? "Failed to load agents";
          throw new Error(message);
        }

        const agentList: Agent[] = Array.isArray(data) ? data : [];
        if (mounted) setAgents(agentList);

        // Batch-fetch match status for all agents that have a tokenId
        const tokenIds = agentList
          .map((a) => a.tokenId)
          .filter((id) => typeof id === "number" && id > 0);

        if (tokenIds.length > 0) {
          try {
            const msRes = await fetch("/api/agents/match-status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tokenIds }),
              cache: "no-store",
            });
            if (msRes.ok) {
              const msData = await msRes.json();
              if (mounted) setMatchStatuses(msData ?? {});
            }
          } catch {
            // Non-fatal — match status is enrichment only
          }
        } else if (mounted) {
          setMatchStatuses({});
        }
      } catch (err) {
        if (mounted) {
          const message = err instanceof Error ? err.message : "Unknown error";
          setError(message);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAgents();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#1A1A1F] text-white overflow-x-hidden">
      <Navbar />
      <div className="fixed inset-0 hero-grid-bg pointer-events-none" />

      <section className="relative pt-32 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
            <div>
              <p className="text-og-accent text-xs font-semibold uppercase tracking-widest mb-3">
                Agent Directory
              </p>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                <span className="og-gradient-text">
                  {address ? "Your Agents" : "All Minted Agents"}
                </span>
              </h1>
              <p className="text-og-label mt-3 max-w-2xl">
                {address
                  ? `Showing agents owned by ${shortenAddress(address)}. Switch wallet in the header to see another account.`
                  : "Browse agents this app knows about. Connect a wallet to show only agents you own."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {stats.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>

          {loading && (
            <div className="og-card p-8 text-center">
              <p className="text-og-label">Loading agents...</p>
            </div>
          )}

          {error && !loading && (
            <div className="og-card p-8 border border-red-400/20 bg-red-500/5 text-center">
              <p className="text-red-300">Failed to load agents: {error}</p>
            </div>
          )}

          {!loading && !error && sortedAgents.length === 0 && (
            <div className="og-card p-10 text-center">
              <p className="text-lg font-medium mb-1">No agents found</p>
              <p className="text-og-label text-sm">
                Create your first agent and it will show up here.
              </p>
            </div>
          )}

          {!loading && !error && sortedAgents.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-12">
              {sortedAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  matchInfo={matchStatuses[String(agent.tokenId)]}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
