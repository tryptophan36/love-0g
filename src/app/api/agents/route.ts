import { NextRequest, NextResponse } from 'next/server'

const ORCHESTRATOR = process.env.ORCHESTRATOR_URL ?? 'http://localhost:3001'

export async function GET() {
  try {
    const res = await fetch(`${ORCHESTRATOR}/api/agents`)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Orchestrator unavailable' }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Shape the payload the orchestrator expects, including new wizard fields
    const {
      name,
      traits,
      strategy,
      owner,
      systemPrompt,
      // basics fields forwarded as profile
      avatar,
      age,
      gender,
      origin,
      profession,
      education,
      hobbies,
      // pass-through fields
      id,
      tokenId,
      ogStorageKey,
    } = body

    const profile = { avatar, age, gender, origin, profession, education, hobbies }

    const payload = {
      id,
      tokenId,
      name,
      traits,
      strategy,
      systemPrompt,
      profile,
      ogStorageKey,
      owner,
    }

    const res = await fetch(`${ORCHESTRATOR}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Orchestrator unavailable' }, { status: 503 })
  }
}
