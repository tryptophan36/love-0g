import { NextRequest, NextResponse } from "next/server";
import { readAgentMatchStatus } from "@/lib/matchEscrow";

/**
 * POST /api/agents/match-status
 * Batch-fetch match status for a list of agent tokenIds from the MatchEscrow contract.
 *
 * Body: { tokenIds: number[] }
 * Response: { [tokenId]: { matchId: string, status: number, seatsTaken: number, maxContestants: number } }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tokenIds: number[] = Array.isArray(body?.tokenIds) ? body.tokenIds : [];

    if (tokenIds.length === 0) {
      return NextResponse.json({});
    }

    const results = await Promise.allSettled(
      tokenIds.map((id) => readAgentMatchStatus(BigInt(id)))
    );

    const map: Record<
      string,
      { matchId: string; status: number; seatsTaken: number; maxContestants: number }
    > = {};

    tokenIds.forEach((id, i) => {
      const r = results[i];
      if (r.status === "fulfilled") {
        map[String(id)] = {
          matchId:       r.value.matchId.toString(),
          status:        r.value.status,
          seatsTaken:    r.value.seatsTaken,
          maxContestants: r.value.maxContestants,
        };
      }
    });

    return NextResponse.json(map);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch match statuses";
    console.error("POST /api/agents/match-status:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
