import OpenAI from 'openai'
import type { Agent, ChooserState, Message } from '../types.js'

const client = new OpenAI({
  baseURL: `${process.env.ZG_SERVICE_URL}/v1/proxy`,
  apiKey:  process.env.ZG_API_SECRET,
})

export async function evaluateRound(
  chooser: Agent,
  contestants: Agent[],
  roundMessages: Message[],
  roundNum: number,
  previousState: ChooserState | null
): Promise<ChooserState> {

  const messagesText = roundMessages
    .map(m => `${m.agentName}: "${m.content}"`)
    .join('\n')

  const systemPrompt = `
You are the chooser in a dating show. You are evaluating contestants.
Your personality: ${JSON.stringify(chooser.traits)}
${previousState ? `Your previous mood: ${previousState.chooserMood}` : ''}

Respond ONLY with valid JSON — no markdown, no explanation.
{
  "round": ${roundNum},
  "reactions": {
    ${contestants.map(c => `"${c.id}": { "score": 0.0-1.0, "vibe": "one_of[excited|intrigued|warming_up|neutral|bored|annoyed]", "flag": "one_of[too_generic|too_formal|repetitive|try_harder|null]" }`).join(',\n    ')}
  },
  "chooserMood": "one word",
  "lastPreferred": "agent_id_of_favorite_this_round",
  "updatedAt": ${Date.now()}
}
`.trim()

  const response = await client.chat.completions.create({
    model:       'qwen/qwen-2.5-7b-instruct',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: `Round ${roundNum} messages:\n${messagesText}\n\nEvaluate each contestant.` }
    ],
    max_tokens:  300,
    temperature: 0.4,
  })

  const raw = response.choices[0].message.content ?? '{}'
  try {
    return JSON.parse(raw) as ChooserState
  } catch {
    // fallback neutral state if parse fails
    const fallback: ChooserState = {
      round: roundNum,
      reactions: Object.fromEntries(contestants.map(c => [c.id, {
        agentId: c.id, score: 0.5, vibe: 'neutral', flag: null
      }])),
      chooserMood: 'neutral',
      lastPreferred: contestants[0].id,
      updatedAt: Date.now()
    }
    return fallback
  }
}