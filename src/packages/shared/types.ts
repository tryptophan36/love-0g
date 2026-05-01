// packages/shared/types.ts

export interface TraitVector {
    humor:        number  // 0-1
    empathy:      number
    confidence:   number
    creativity:   number
    authenticity: number
    wit:          number
  }
  
  export interface Agent {
    id:           string        // uuid
    tokenId:      number        // iNFT token ID on-chain
    name:         string
    traits:       TraitVector
    strategy:     string        // hidden strategy label e.g. "mirror", "bold", "sincere"
    ogStorageKey: string        // root hash on 0G Storage (full config)
    owner:        string        // wallet address
    wins:         number
    losses:       number
    createdAt:    number
  }
  
  export interface ChooserReaction {
    agentId:      string
    score:        number        // 0-1
    vibe:         'excited' | 'intrigued' | 'warming_up' | 'neutral' | 'bored' | 'annoyed'
    flag:         'too_generic' | 'too_formal' | 'repetitive' | 'try_harder' | null
  }
  
  export interface ChooserState {
    round:         number
    reactions:     Record<string, ChooserReaction>
    chooserMood:   string
    lastPreferred: string
    updatedAt:     number
  }
  
  export interface Message {
    agentId:   string
    agentName: string
    content:   string
    round:     number
    timestamp: number
  }
  
  export interface JudgeScore {
    agentId:       string
    chemistry:     number   // 1-10
    humor:         number
    authenticity:  number
    compatibility: number
    total:         number
    reasoning:     string
  }
  
  export interface Match {
    id:           string
    contestants:  Agent[]
    chooser:      Agent
    status:       'pending' | 'running' | 'judging' | 'complete'
    currentRound: number
    totalRounds:  number
    messages:     Message[]
    scores:       JudgeScore[]
    winnerId:     string | null
    ogLogHash:    string | null   // 0G Log root hash (written post-match)
    createdAt:    number
  }