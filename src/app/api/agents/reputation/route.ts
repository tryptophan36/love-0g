import { NextRequest, NextResponse } from "next/server";
import { getReputationStats } from "@/lib/reputation";

/**
 * POST /api/agents/reputation
 * Batch-fetch on-chain reputation stats for a list of agent tokenIds.
 *
 * Body:    { tokenIds: number[] }
 * Response: { [tokenId]: { reputationScore: number, matchesPlayed: number, wins: number } }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tokenIds: number[] = Array.isArray(body?.tokenIds) ? body.tokenIds : [];

    if (tokenIds.length === 0) {
      return NextResponse.json({});
    }

    const results = await Promise.allSettled(
      tokenIds.map((id) => getReputationStats(id))
    );

    const map: Record<string, { reputationScore: number; matchesPlayed: number; wins: number }> = {};

    tokenIds.forEach((id, i) => {
      const r = results[i];
      if (r.status === "fulfilled" && r.value !== null) {
        map[String(id)] = r.value;
      }
    });

    return NextResponse.json(map);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch reputation stats";
    console.error("POST /api/agents/reputation:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
