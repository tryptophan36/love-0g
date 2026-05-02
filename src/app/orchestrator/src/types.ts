export interface TraitVector {
  humor: number
  empathy: number
  confidence: number
  creativity: number
  authenticity: number
  wit: number
}

export interface AgentProfile {
  avatar?: string
  imageUrl?: string
  age?: string
  gender?: string
  origin?: string
  profession?: string
  education?: string
  hobbies?: string
}

export interface Agent {
  id: string
  tokenId: number
  name: string
  traits: TraitVector
  strategy: string
  systemPrompt: string
  profile: AgentProfile
  ogStorageKey: string
  owner: string
  wins: number
  losses: number
  createdAt: number
}

export interface ChooserReaction {
  agentId: string
  score: number
  vibe: 'excited' | 'intrigued' | 'warming_up' | 'neutral' | 'bored' | 'annoyed'
  flag: 'too_generic' | 'too_formal' | 'repetitive' | 'try_harder' | null
}

export interface ChooserState {
  round: number
  reactions: Record<string, ChooserReaction>
  chooserMood: string
  lastPreferred: string
  chooserMessage?: string
  updatedAt: number
}

export interface ChooserDecision {
  pickedAgentId: string
  pickedAgentName: string
  announcement: string
  reasoning: string
}

export interface Message {
  agentId: string
  agentName: string
  content: string
  round: number
  timestamp: number
}

export interface JudgeScore {
  agentId: string
  chemistry: number
  humor: number
  authenticity: number
  compatibility: number
  total: number
  reasoning: string
}

export interface Match {
  id: string
  onChainMatchId: string
  contestants: Agent[]
  chooser: Agent
  status: 'pending' | 'running' | 'judging' | 'complete'
  currentRound: number
  totalRounds: number
  messages: Message[]
  scores: JudgeScore[]
  winnerId: string | null
  winnerTokenId: number | null
  runnerUpTokenId: number | null
  decision: ChooserDecision | null
  ogLogHash: string | null
  createdAt: number
}
