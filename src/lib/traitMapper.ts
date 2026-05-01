import type { TraitVector } from '@/packages/shared/types'

// ── Vibe tag → trait offsets ──────────────────────────────────────────────────
const VIBE_MAP: Record<string, Partial<TraitVector>> = {
  Witty:         { wit: 0.8, humor: 0.7 },
  Warm:          { empathy: 0.85, authenticity: 0.6 },
  Confident:     { confidence: 0.9, wit: 0.4 },
  'Deep-thinker':{ creativity: 0.7, authenticity: 0.7, empathy: 0.5 },
  Playful:       { humor: 0.85, wit: 0.6 },
  Honest:        { authenticity: 0.9, empathy: 0.5 },
  Creative:      { creativity: 0.9, wit: 0.5 },
  Spontaneous:   { humor: 0.6, confidence: 0.6, creativity: 0.5 },
  Mysterious:    { confidence: 0.5, authenticity: 0.4, wit: 0.5 },
  Energetic:     { confidence: 0.7, humor: 0.6, creativity: 0.4 },
}

// ── Binary "this or that" choices ────────────────────────────────────────────
// Each choice is { left: offsets, right: offsets }
export const BINARY_QUESTIONS = [
  {
    question: 'They always…',
    left:  { label: 'Make the first move',  offsets: { confidence: 0.8 } as Partial<TraitVector> },
    right: { label: 'Wait and observe',     offsets: { empathy: 0.7, authenticity: 0.5 } as Partial<TraitVector> },
  },
  {
    question: 'Their style is…',
    left:  { label: 'Drops memes & jokes',  offsets: { humor: 0.85, wit: 0.6 } as Partial<TraitVector> },
    right: { label: 'Sends long paragraphs',offsets: { empathy: 0.8, authenticity: 0.6 } as Partial<TraitVector> },
  },
  {
    question: 'In a tough moment…',
    left:  { label: 'Goes for the joke',    offsets: { humor: 0.8, wit: 0.7 } as Partial<TraitVector> },
    right: { label: 'Gets real, fast',      offsets: { authenticity: 0.9, empathy: 0.6 } as Partial<TraitVector> },
  },
]

export type BinaryChoice = 'left' | 'right'

// ── Hinge-style prompts ───────────────────────────────────────────────────────
export const ICEBREAKER_PROMPTS = [
  'My opening line that never fails…',
  'The way to win me over is…',
  "I'll always find a way to talk about…",
]

// ── Strategy cards ────────────────────────────────────────────────────────────
export const STRATEGY_CARDS = [
  { value: 'mirror',       icon: '🪞', label: 'The Mirror',      caption: 'Matches your energy and reflects it back' },
  { value: 'bold',         icon: '⚡', label: 'The Bold One',    caption: 'Says what others are only thinking' },
  { value: 'sincere',      icon: '🫀', label: 'The Sincere One', caption: 'Always means what they say' },
  { value: 'playful',      icon: '🎲', label: 'The Playful One', caption: 'Turns every exchange into a game' },
  { value: 'intellectual', icon: '🧠', label: 'The Thinker',     caption: 'Goes deep on every topic' },
]

// ── Core mapping function ─────────────────────────────────────────────────────

function clamp(v: number) { return Math.min(1, Math.max(0, v)) }

function applyOffsets(base: TraitVector, offsets: Partial<TraitVector>, weight = 1): TraitVector {
  const result = { ...base }
  for (const key of Object.keys(offsets) as (keyof TraitVector)[]) {
    result[key] = clamp(result[key] + (offsets[key]! * weight))
  }
  return result
}

function normalize(traits: TraitVector): TraitVector {
  const keys = Object.keys(traits) as (keyof TraitVector)[]
  const max = Math.max(...keys.map(k => traits[k]))
  if (max === 0) return traits
  const result = { ...traits }
  for (const k of keys) result[k] = clamp(result[k] / max)
  return result
}

export function answersToTraits(
  vibes: string[],
  binaries: (BinaryChoice | null)[],
): TraitVector {
  let traits: TraitVector = {
    humor: 0.3,
    empathy: 0.3,
    confidence: 0.3,
    creativity: 0.3,
    authenticity: 0.3,
    wit: 0.3,
  }

  // Apply vibe tags (equal weight, diminishing returns for more selections)
  const vibeWeight = vibes.length > 0 ? 0.5 / vibes.length : 0
  for (const vibe of vibes) {
    const offsets = VIBE_MAP[vibe]
    if (offsets) traits = applyOffsets(traits, offsets, vibeWeight)
  }

  // Apply binary choices
  for (let i = 0; i < BINARY_QUESTIONS.length; i++) {
    const choice = binaries[i]
    if (choice === 'left')  traits = applyOffsets(traits, BINARY_QUESTIONS[i].left.offsets,  0.35)
    if (choice === 'right') traits = applyOffsets(traits, BINARY_QUESTIONS[i].right.offsets, 0.35)
  }

  return normalize(traits)
}

// ── Human-readable trait summary ──────────────────────────────────────────────
const TRAIT_LABELS: Record<keyof TraitVector, string> = {
  humor:        'Funny',
  empathy:      'Empathetic',
  confidence:   'Confident',
  creativity:   'Creative',
  authenticity: 'Authentic',
  wit:          'Witty',
}

export function topTraits(traits: TraitVector, n = 3): string[] {
  return (Object.entries(traits) as [keyof TraitVector, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key]) => TRAIT_LABELS[key])
}
