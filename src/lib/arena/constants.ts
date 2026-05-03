import type { Phase } from './types'

export const AGENT_COLORS = [
  {
    ring: 'bg-og-accent',
    text: 'text-og-accent',
    bar: 'from-og-purple to-og-accent',
    vibe: 'border-og-accent/30',
  },
  {
    ring: 'bg-pink-400',
    text: 'text-pink-400',
    bar: 'from-pink-600 to-pink-400',
    vibe: 'border-pink-400/30',
  },
  {
    ring: 'bg-emerald-400',
    text: 'text-emerald-400',
    bar: 'from-emerald-600 to-emerald-400',
    vibe: 'border-emerald-400/30',
  },
] as const

export type AgentColor = (typeof AGENT_COLORS)[number]

export function vibeBadgeClass(vibe?: string) {
  switch (vibe) {
    case 'excited':
      return 'bg-pink-500/15 text-pink-400 border-pink-500/30'
    case 'intrigued':
      return 'bg-og-accent/15 text-og-light border-og-accent/30'
    case 'warming_up':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    case 'bored':
      return 'bg-og-surface text-og-label border-og-border'
    case 'neutral':
      return 'bg-og-surface text-og-label border-og-border'
    case 'annoyed':
      return 'bg-red-500/15 text-red-400 border-red-500/30'
    default:
      return 'bg-og-surface text-og-label border-og-border'
  }
}

export const PHASE_BADGE: Record<
  Phase,
  { label: string; cls: string }
> = {
  loading: {
    label: 'Loading',
    cls: 'bg-og-surface text-og-label border-og-border',
  },
  open: {
    label: 'Open',
    cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  },
  full: {
    label: 'Full',
    cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  },
  starting: {
    label: 'Starting',
    cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  },
  running: {
    label: 'Running',
    cls: 'bg-sky-500/15 text-sky-400 border-sky-500/20 animate-pulse',
  },
  judging: {
    label: 'Judging',
    cls: 'bg-og-accent/15 text-og-light border-og-accent/20 animate-pulse',
  },
  complete: {
    label: 'Settled',
    cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
  },
  cancelled: {
    label: 'Cancelled',
    cls: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
  failed: {
    label: 'Failed',
    cls: 'bg-violet-500/15 text-violet-300 border-violet-500/35',
  },
}
