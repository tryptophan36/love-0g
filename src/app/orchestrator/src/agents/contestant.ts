import OpenAI from 'openai'
import type { Agent, ChooserReaction, Message } from '../types.js'

/** Returns a labelled role string for a message, e.g. "Contestant-2 (Jordan)" or "Chooser (Sarah)" */
function labelFor(agentId: string, chooser: Agent, contestants: Agent[]): string {
  if (agentId === chooser.id) return `Chooser (${chooser.name})`
  const idx = contestants.findIndex(c => c.id === agentId)
  const name = idx >= 0 ? contestants[idx].name : agentId
  return `Contestant-${idx + 1} (${name})`
}

function formatTranscript(messages: Message[], chooser: Agent, contestants: Agent[]): string {
  return messages
    .map(m => `[R${m.round}] ${labelFor(m.agentId, chooser, contestants)}: "${m.content}"`)
    .join('\n')
}

// Integrate Network router (testnet) — OpenAI-compatible endpoint
const client = new OpenAI({
  baseURL: 'https://router-api-testnet.integratenetwork.work/v1',
  apiKey:  process.env.ZG_API_SECRET ?? '',
})

const ROUND_DESCRIPTIONS: Record<number, string> = {
  1: 'Round 1 — Introduction: Make your first impression. Introduce who you are, what makes you unique. The chooser is meeting everyone for the first time.',
  2: 'Round 2 — Connection: Move past introductions. Find common ground, ask or react meaningfully, have a real back-and-forth with the chooser.',
  3: 'Round 3 — Depth: Show your true self. Be a little vulnerable, go deeper than small talk, reveal something genuine.',
  4: 'Round 4 — Final Pitch: This is your last chance. Make the strongest case for why the chooser should pick you. Leave a lasting impression.',
}

export async function runContestantTurn(
  agent: Agent,
  reaction: ChooserReaction | null,
  history: Message[],
  roundNum: number,
  allContestants: Agent[] = [],
  chooser: Agent | null = null,
): Promise<string> {

  const vibeContext = reaction
    ? `Chooser's current vibe toward you: ${reaction.vibe} (score ${reaction.score.toFixed(2)}/1.0).${
        reaction.flag ? ` You were flagged: ${reaction.flag}. Correct this.` : ''
      }`
    : 'First round — no feedback yet. Make a strong first impression.'

  // Build profile context from the wizard basics
  const profileLines: string[] = []
  const p = agent.profile ?? {}
  if (p.age)        profileLines.push(`Age: ${p.age}`)
  if (p.gender)     profileLines.push(`Gender: ${p.gender}`)
  if (p.origin)     profileLines.push(`From: ${p.origin}`)
  if (p.profession) profileLines.push(`Works as: ${p.profession}`)
  if (p.education)  profileLines.push(`Education: ${p.education}`)
  if (p.hobbies)    profileLines.push(`Into: ${p.hobbies}`)

  const profileSection = profileLines.length
    ? `\nYOUR BACKGROUND:\n${profileLines.join('\n')}`
    : ''

  const voiceSection = agent.systemPrompt
    ? `\nYOUR VOICE:\n${agent.systemPrompt}`
    : ''

  const roundContext = ROUND_DESCRIPTIONS[roundNum]
    ?? `Round ${roundNum} — Keep building on previous rounds and engaging the chooser authentically.`

  // Cast list so every agent knows who's in the show
  const contestantsList = allContestants.map((c, i) => `  Contestant-${i + 1}: ${c.name}`).join('\n')
  const castSection = chooser
    ? `\nCAST:\n  Chooser: ${chooser.name}\n${contestantsList}`
    : ''

  // Full conversation transcript with consistent role labels
  const transcriptBody = chooser && allContestants.length
    ? formatTranscript(history, chooser, allContestants)
    : history.map(m => `[R${m.round}] ${m.agentName}: "${m.content}"`).join('\n')

  const transcriptSection = history.length
    ? `\nFULL CONVERSATION SO FAR:\n${transcriptBody}`
    : '\nFULL CONVERSATION SO FAR:\n(none — this is the first message of the show)'

  const systemPrompt = `
You are ${agent.name}, a contestant in a competitive dating show.
${profileSection}${voiceSection}
${castSection}

YOUR HIDDEN STRATEGY: ${agent.strategy}

CURRENT ROUND: ${roundContext}

LIVE FEEDBACK (from shared 0G memory):
${vibeContext}
${transcriptSection}

RULES:
- Stay deeply in character — your background, traits, and voice define HOW you speak
- Adapt strategically to the feedback without being obvious about it
- Build on what has already been said — do NOT repeat yourself or ignore prior conversation
- One message only, maximum 3 sentences
- Never mention you are an AI or that this is a game
- Be creative and distinct from other contestants
`.trim()

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: `It is now Round ${roundNum}. Address the chooser directly.` }
  ]

  const response = await client.chat.completions.create({
    model:       'qwen/qwen-2.5-7b-instruct',
    messages,
    max_tokens:  120,
    temperature: 0.88,
  })

  return response.choices[0].message.content ?? '[no response]'
}