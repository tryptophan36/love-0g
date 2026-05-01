import OpenAI from 'openai'
import type { Agent, Message, JudgeScore } from '../types.js'

const client = new OpenAI({
  baseURL: `${process.env.ZG_SERVICE_URL}/v1/proxy`,
  apiKey:  process.env.ZG_API_SECRET,
})

export async function runJudge(
  contestants: Agent[],
  chooser: Agent,
  allMessages: Message[]
): Promise<JudgeScore[]> {

  const transcript = allMessages
    .map(m => `[R${m.round}] ${m.agentName}: ${m.content}`)
    .join('\n')

  const systemPrompt = `
You are an impartial judge scoring a dating show. Score each contestant on 4 dimensions (1-10).
Chooser personality: ${JSON.stringify(chooser.traits)}

Respond ONLY with valid JSON array:
[
  {
    "agentId": "id",
    "chemistry": 1-10,
    "humor": 1-10,
    "authenticity": 1-10,
    "compatibility": 1-10,
    "total": average_of_four,
    "reasoning": "one sentence"
  }
]
`.trim()

  const response = await client.chat.completions.create({
    model:       'qwen/qwen-2.5-7b-instruct',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: `Full transcript:\n${transcript}\n\nScore all contestants.` }
    ],
    max_tokens:  500,
    temperature: 0.2,
  })

  const raw = response.choices[0].message.content ?? '[]'
  try {
    const scores = JSON.parse(raw) as JudgeScore[]
    return scores.map(s => ({
      ...s,
      total: +((s.chemistry + s.humor + s.authenticity + s.compatibility) / 4).toFixed(2)
    }))
  } catch {
    return contestants.map(c => ({
      agentId: c.id, chemistry: 5, humor: 5,
      authenticity: 5, compatibility: 5, total: 5,
      reasoning: 'Could not parse scores'
    }))
  }
}