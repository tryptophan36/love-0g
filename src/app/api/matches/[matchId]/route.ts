import { NextRequest, NextResponse } from "next/server";
import { readMatchOnChain } from "@/lib/matchEscrow";
import { matchStatusLabel } from "@/lib/matchStatus";

type RouteParams = { params: Promise<{ matchId: string }> };

/**
 * GET /api/matches/[matchId]
 * Read-only match snapshot from chain (no wallet tx).
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { matchId: raw } = await params;
    if (raw === undefined || raw === null || raw === "") {
      return NextResponse.json({ error: "matchId is required" }, { status: 400 });
    }

    let matchId: bigint;
    try {
      matchId = BigInt(raw);
    } catch {
      return NextResponse.json({ error: "matchId must be an integer" }, { status: 400 });
    }

    if (matchId <= BigInt(0)) {
      return NextResponse.json({ error: "matchId must be positive" }, { status: 400 });
    }

    let snapshot;
    try {
      snapshot = await readMatchOnChain(matchId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (
        msg.includes("MatchNotFound") ||
        msg.includes("execution reverted") ||
        msg.includes("0x")
      ) {
        return NextResponse.json({ error: "Match not found" }, { status: 404 });
      }
      throw e;
    }

    const status = Number(snapshot.status);
    const participantsJoined = Number(snapshot.seatsTaken);
    const maxParticipants = Number(snapshot.maxContestants);

    return NextResponse.json({
      match: {
        matchId: matchId.toString(),
        feeWei: snapshot.fee.toString(),
        status,
        statusLabel: matchStatusLabel(status),
        participantsJoined,
        maxParticipants,
        seatsTaken: participantsJoined,
        maxContestants: maxParticipants,
        joinDeadline: snapshot.joinDeadline.toString(),
        createdAt: snapshot.createdAt.toString(),
        chooser: snapshot.chooser,
        chooserAgentId: snapshot.chooserAgentId.toString(),
        winnerAgentId: snapshot.winnerAgentId.toString(),
        runnerUpAgentId: snapshot.runnerUpAgentId.toString(),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to read match";
    console.error("GET /api/matches/[matchId]:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
