import OpenAI from 'openai'
import type { Agent, ChooserState, ChooserDecision, Message } from '../types.js'

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

const ROUND_DESCRIPTIONS: Record<number, string> = {
  1: 'Round 1 — Introduction: Contestants are introducing themselves for the first time. Form your initial impressions.',
  2: 'Round 2 — Connection: Contestants are trying to connect with you through real conversation. Who is actually engaging vs. being generic?',
  3: 'Round 3 — Depth: Contestants are showing their true selves and going deeper. Notice who feels genuine.',
  4: 'Round 4 — Final Pitch: This is their last chance to win you over. Who made the strongest lasting impression?',
}

const client = new OpenAI({
  baseURL: 'https://router-api-testnet.integratenetwork.work/v1',
  apiKey:  process.env.ZG_API_SECRET ?? '',
})

export async function evaluateRound(
  chooser: Agent,
  contestants: Agent[],
  roundMessages: Message[],
  roundNum: number,
  previousState: ChooserState | null,
  allMessages: Message[] = []
): Promise<ChooserState> {

  const roundMessagesText = roundMessages
    .map(m => `${labelFor(m.agentId, chooser, contestants)}: "${m.content}"`)
    .join('\n')

  // Full transcript of all prior rounds so the chooser has full context
  const priorMessages = allMessages.filter(m => m.round < roundNum)
  const transcriptSection = priorMessages.length
    ? `\nFULL CONVERSATION HISTORY (all previous rounds):\n${formatTranscript(priorMessages, chooser, contestants)}`
    : ''

  const contestantsList = contestants.map((c, i) => `  Contestant-${i + 1}: ${c.name}`).join('\n')
  const castSection = `\nCAST:\n  Chooser: ${chooser.name}\n${contestantsList}`

  const roundContext = ROUND_DESCRIPTIONS[roundNum]
    ?? `Round ${roundNum} — Continue evaluating contestants as the show progresses.`

  const isIntro = roundNum === 1

  const systemPrompt = `
You are ${chooser.name}, the chooser in a competitive dating show. Contestants are trying to win your heart.
Your personality traits: ${JSON.stringify(chooser.traits)}
${castSection}
${previousState ? `Your current mood: ${previousState.chooserMood}. You last preferred: ${previousState.lastPreferred}.` : 'This is the opening round — you are meeting everyone for the first time.'}

CURRENT ROUND: ${roundContext}
${transcriptSection}

${isIntro
  ? 'Give each contestant a neutral-to-first-impression score. Say something welcoming to start the show.'
  : 'Score each contestant honestly based on what they said THIS round AND how they have evolved across all rounds. React as a real person would — warmth, curiosity, or disappointment.'
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

  const chooserMessages = [
    { role: 'system' as const, content: systemPrompt },
    {
      role: 'user' as const,
      content: `Round ${roundNum} messages:\n${roundMessagesText}\n\nEvaluate each contestant and respond.`,
    },
  ]

  console.log(
    `[llm:chooser:evaluateRound] ${chooser.name} round=${roundNum}\n` +
    chooserMessages.map(m => `--- ${m.role} ---\n${m.content}`).join('\n\n')
  )

  const response = await client.chat.completions.create({
    model:       'qwen/qwen-2.5-7b-instruct',
    messages:    chooserMessages,
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

  const decisionMessages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: 'Make your final decision. Announce it.' },
  ]

  const response = await client.chat.completions.create({
    model:       'qwen/qwen-2.5-7b-instruct',
    messages:    decisionMessages,
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
