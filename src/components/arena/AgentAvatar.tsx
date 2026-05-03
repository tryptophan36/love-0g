import type { Agent } from '@/app/orchestrator/src/types'

/** Resolved image URL for an agent profile (imageUrl or http(s) avatar). */
export function profileImageUrl(agent?: Agent | null): string | undefined {
  const p = agent?.profile
  if (!p) return undefined
  if (p.imageUrl) return p.imageUrl
  if (p.avatar?.startsWith('http')) return p.avatar
  return undefined
}

export type AgentAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASSES: Record<AgentAvatarSize, { box: string; text: string }> = {
  xs: { box: 'w-5 h-5 min-w-[1.25rem]', text: 'text-[10px]' },
  sm: { box: 'w-7 h-7 min-w-[1.75rem]', text: 'text-xs' },
  md: { box: 'w-8 h-8 min-w-[2rem]', text: 'text-xs' },
  lg: { box: 'w-10 h-10 min-w-[2.5rem]', text: 'text-sm' },
  xl: { box: 'w-12 h-12 min-w-[3rem]', text: 'text-base' },
}

type Props = {
  agent?: Agent | null
  /** Initial / label when no image; defaults to `agent.name` */
  fallbackName?: string
  /** Background (+ optional border) classes for the non-image fallback ring */
  ringClass: string
  /** Text color on fallback; default solid rings use white */
  fallbackTextClass?: string
  size?: AgentAvatarSize
  className?: string
}

export function AgentAvatar({
  agent,
  fallbackName,
  ringClass,
  fallbackTextClass = 'text-white',
  size = 'md',
  className = '',
}: Props) {
  const name = fallbackName ?? agent?.name ?? '?'
  const url = profileImageUrl(agent)
  const { box, text } = SIZE_CLASSES[size]

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user-provided arbitrary URLs; remotePatterns vary
      <img
        src={url}
        alt=""
        className={`${box} rounded-full object-cover border border-og-border/40 flex-shrink-0 ${className}`}
      />
    )
  }

  const glyph = agent?.profile?.avatar || name.charAt(0)
  return (
    <span
      className={`${box} rounded-full flex-shrink-0 inline-flex items-center justify-center font-bold ${ringClass} ${fallbackTextClass} ${text} ${className}`}
    >
      {glyph}
    </span>
  )
}
