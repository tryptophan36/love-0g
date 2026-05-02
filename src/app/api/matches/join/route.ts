import { NextRequest, NextResponse } from "next/server";
import {
  encodeJoinMatchTx,
  MATCH_STATUS_OPEN,
  preflightAgentOwnershipForMatchTx,
  readMatchOnChain,
} from "@/lib/matchEscrow";

/**
 * POST /api/matches/join
 * Reads fee + status from chain, returns tx payload for contestant to sign.
 *
 * Body: { matchId: string | number, agentId: string | number, sender?: `0x${string}` }
 * Response: { to, data, value, chainId, match: { feeWei, status, seatsTaken, maxContestants, joinDeadline } }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const matchIdRaw = body?.matchId ?? body?.match_id;
    const agentRaw   = body?.agentId;

    if (matchIdRaw === undefined || matchIdRaw === null || matchIdRaw === "") {
      return NextResponse.json({ error: "matchId is required" }, { status: 400 });
    }
    if (agentRaw === undefined || agentRaw === null || agentRaw === "") {
      return NextResponse.json({ error: "agentId is required (your iNFT tokenId)" }, { status: 400 });
    }

    let matchId: bigint;
    try {
      matchId = BigInt(matchIdRaw);
    } catch {
      return NextResponse.json({ error: "matchId must be an integer" }, { status: 400 });
    }
    if (matchId <= BigInt(0)) {
      return NextResponse.json({ error: "matchId must be positive" }, { status: 400 });
    }

    let agentId: bigint;
    try {
      agentId = BigInt(agentRaw);
    } catch {
      return NextResponse.json({ error: "agentId must be a valid integer" }, { status: 400 });
    }

    const sender =
      typeof body?.sender === "string" && body.sender.startsWith("0x")
        ? (body.sender as `0x${string}`)
        : null;

    const preflightErr = await preflightAgentOwnershipForMatchTx({
      agentId,
      sender,
    });
    if (preflightErr) {
      return NextResponse.json({ error: preflightErr }, { status: 400 });
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
    if (status !== MATCH_STATUS_OPEN) {
      return NextResponse.json(
        {
          error: "Match is not open for joins",
          status,
          matchId: matchId.toString(),
        },
        { status: 400 }
      );
    }

    const feeWei = snapshot.fee;
    const tx = encodeJoinMatchTx({ matchId, agentId, feeWei });

    return NextResponse.json({
      ...tx,
      match: {
        matchId:       matchId.toString(),
        feeWei:        feeWei.toString(),
        status,
        seatsTaken:    Number(snapshot.seatsTaken),
        maxContestants: Number(snapshot.maxContestants),
        joinDeadline:  snapshot.joinDeadline.toString(),
        chooser:       snapshot.chooser,
        chooserAgentId: snapshot.chooserAgentId.toString(),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to build join tx";
    console.error("POST /api/matches/join:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
