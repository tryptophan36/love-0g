import OpenAI from 'openai'
import type { Agent, ChooserState, ChooserDecision, Message } from '../types.js'

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

  const isIntro = roundNum === 1

  const systemPrompt = `
You are the chooser in a competitive dating show. You are evaluating contestants who are trying to win your heart.
Your personality traits: ${JSON.stringify(chooser.traits)}
${previousState ? `Your current mood: ${previousState.chooserMood}. You last preferred: ${previousState.lastPreferred}.` : 'This is the opening round — you are meeting everyone for the first time.'}

${isIntro
  ? 'Give each contestant a neutral-to-first-impression score. Say something welcoming to start the show.'
  : 'Score each contestant honestly based on what they said. React as a real person would — warmth, curiosity, or disappointment.'
}

Respond ONLY with valid JSON — no markdown, no explanation.
{
  "round": ${roundNum},
  "reactions": {
    ${contestants.map(c => `"${c.id}": { "score": 0.0-1.0, "vibe": "one_of[excited|intrigued|warming_up|neutral|bored|annoyed]", "flag": "one_of[too_generic|too_formal|repetitive|try_harder|null]" }`).join(',\n    ')}
  },
  "chooserMood": "one word describing your mood right now",
  "lastPreferred": "agent_id_of_your_favorite_this_round",
  "chooserMessage": "your spoken response to contestants this round (1-2 sentences, stay in character, natural and direct)",
  "updatedAt": ${Date.now()}
}
`.trim()

  const response = await client.chat.completions.create({
    model:       'qwen/qwen-2.5-7b-instruct',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: `Round ${roundNum} messages:\n${messagesText}\n\nEvaluate each contestant and respond.` }
    ],
    max_tokens:  400,
    temperature: 0.5,
  })

  const raw = response.choices[0].message.content ?? '{}'
  try {
    return JSON.parse(raw) as ChooserState
  } catch {
    const fallback: ChooserState = {
      round: roundNum,
      reactions: Object.fromEntries(contestants.map(c => [c.id, {
        agentId: c.id, score: 0.5, vibe: 'neutral', flag: null
      }])),
      chooserMood:    'neutral',
      lastPreferred:  contestants[0].id,
      chooserMessage: isIntro ? 'Hello everyone, welcome. I\'m excited to get to know you all.' : 'Interesting... keep going.',
      updatedAt:      Date.now()
    }
    return fallback
  }
}

export async function runChooserDecision(
  chooser: Agent,
  contestants: Agent[],
  lastState: ChooserState | null,
): Promise<ChooserDecision> {

  const preferredId   = lastState?.lastPreferred ?? contestants[0].id
  const preferredName = contestants.find(c => c.id === preferredId)?.name ?? contestants[0].name

  const scoresSummary = lastState
    ? contestants.map(c => {
        const r = lastState.reactions[c.id]
        return `${c.name}: score ${r?.score?.toFixed(2) ?? '?'}, vibe ${r?.vibe ?? '?'}`
      }).join('; ')
    : contestants.map(c => c.name).join(', ')

  const systemPrompt = `
You are ${chooser.name}, the chooser in a dating show. The show is over. You must announce your final choice.
Your personality: ${JSON.stringify(chooser.traits)}
Your final mood: ${lastState?.chooserMood ?? 'reflective'}

Contestant summary: ${scoresSummary}

Respond ONLY with valid JSON — no markdown, no explanation.
{
  "pickedAgentId":   "${preferredId}",
  "pickedAgentName": "${preferredName}",
  "announcement":    "your dramatic final announcement to all contestants (2-3 sentences, name the winner, say goodbye to the others)",
  "reasoning":       "one sentence: why you chose them"
}
`.trim()

  const response = await client.chat.completions.create({
    model:       'qwen/qwen-2.5-7b-instruct',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: 'Make your final decision. Announce it.' },
    ],
    max_tokens:  200,
    temperature: 0.6,
  })

  const raw = response.choices[0].message.content ?? '{}'
  try {
    return JSON.parse(raw) as ChooserDecision
  } catch {
    return {
      pickedAgentId:   preferredId,
      pickedAgentName: preferredName,
      announcement:    `After much thought, I choose ${preferredName}. Thank you all for being here.`,
      reasoning:       'They felt the most genuine and connected.',
    }
  }
}
