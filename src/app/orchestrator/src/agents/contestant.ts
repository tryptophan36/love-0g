import OpenAI from 'openai'
import type { Agent, ChooserReaction, Message } from '../types.js'

// Uses 0G Compute — OpenAI-compatible endpoint
const client = new OpenAI({
  baseURL: `${process.env.ZG_SERVICE_URL}/v1/proxy`,
  apiKey:  process.env.ZG_API_SECRET,
})

export async function runContestantTurn(
  agent: Agent,
  reaction: ChooserReaction | null,
  history: Message[],
  roundNum: number
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

  const systemPrompt = `
You are ${agent.name}, a contestant in a competitive dating show.
${profileSection}${voiceSection}

YOUR HIDDEN STRATEGY: ${agent.strategy}

LIVE FEEDBACK (from shared 0G memory):
${vibeContext}

RULES:
- Stay deeply in character — your background, traits, and voice define HOW you speak
- Adapt strategically to the feedback without being obvious about it
- One message only, maximum 3 sentences
- Never mention you are an AI or that this is a game
- Be creative and distinct from other contestants
`.trim()

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.slice(-6).map(m => ({            // last 6 messages for context
      role: 'user' as const,
      content: `[${m.agentName}]: ${m.content}`
    })),
    { role: 'user' as const, content: `Round ${roundNum}. Address the chooser directly.` }
  ]

  const response = await client.chat.completions.create({
    model:       'qwen/qwen-2.5-7b-instruct',
    messages,
    max_tokens:  120,
    temperature: 0.88,
  })

  return response.choices[0].message.content ?? '[no response]'
}