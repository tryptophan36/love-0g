import { NextRequest, NextResponse } from "next/server";
import {
  encodeCreateMatchTx,
  preflightAgentOwnershipForMatchTx,
} from "@/lib/matchEscrow";

/**
 * POST /api/matches/create
 * Returns a wallet transaction payload for the chooser to sign (createMatch + deposit fee).
 *
 * Body: { feeWei: string (decimal wei), maxSeats: number (1–3), agentId: string | number }
 * Response: { to, data, value, chainId }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const feeRaw    = body?.feeWei ?? body?.fee;
    const maxRaw    = body?.maxSeats ?? body?.maxContestants;
    const agentRaw  = body?.agentId;

    if (feeRaw === undefined || feeRaw === null) {
      return NextResponse.json(
        { error: "feeWei is required (wei amount as string or number)" },
        { status: 400 }
      );
    }
    if (agentRaw === undefined || agentRaw === null) {
      return NextResponse.json(
        { error: "agentId is required (your iNFT tokenId)" },
        { status: 400 }
      );
    }

    let feeWei: bigint;
    try {
      feeWei = BigInt(feeRaw);
    } catch {
      return NextResponse.json(
        { error: "feeWei must be a valid integer wei string" },
        { status: 400 }
      );
    }
    if (feeWei <= BigInt(0)) {
      return NextResponse.json({ error: "feeWei must be positive" }, { status: 400 });
    }

    let agentId: bigint;
    try {
      agentId = BigInt(agentRaw);
    } catch {
      return NextResponse.json(
        { error: "agentId must be a valid integer" },
        { status: 400 }
      );
    }

    const maxSeats = Number(maxRaw);
    if (maxSeats !== 1 && maxSeats !== 2 && maxSeats !== 3) {
      return NextResponse.json(
        { error: "maxSeats must be 1, 2, or 3" },
        { status: 400 }
      );
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

    const tx = encodeCreateMatchTx({ feeWei, maxSeats, agentId });
    return NextResponse.json(tx);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to build create tx";
    console.error("POST /api/matches/create:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
