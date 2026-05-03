'use client'
import { useEffect, useMemo, useRef } from 'react'
import type { Message, Agent } from '@/app/orchestrator/src/types'
import { AgentAvatar } from '@/components/arena/AgentAvatar'

const CONTESTANT_COLORS = [
  { ring: 'bg-og-accent',     text: 'text-og-accent',   bubble: 'bg-og-accent/10 border-og-accent/20'  },
  { ring: 'bg-pink-400',      text: 'text-pink-400',    bubble: 'bg-pink-500/10 border-pink-500/20'    },
  { ring: 'bg-emerald-400',   text: 'text-emerald-400', bubble: 'bg-emerald-500/10 border-emerald-500/20' },
]
const CHOOSER_STYLE = { ring: 'bg-amber-400', text: 'text-amber-300', bubble: 'bg-amber-500/10 border-amber-500/20' }

interface ChatFeedProps {
  messages: Message[]
  contestants: Agent[]
  chooserId?: string
  chooser?: Agent | null
}

export default function ChatFeed({ messages, contestants, chooserId, chooser }: ChatFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const colorMap: Record<string, typeof CONTESTANT_COLORS[0]> = {}
  contestants.forEach((a, i) => {
    colorMap[a.id] = CONTESTANT_COLORS[i % CONTESTANT_COLORS.length]
  })

  const agentById = useMemo(() => {
    const m: Record<string, Agent> = {}
    for (const a of contestants) m[a.id] = a
    if (chooser) m[chooser.id] = chooser
    return m
  }, [contestants, chooser])

  if (messages.length === 0) {
    return (
      <div className="og-card h-[460px] flex items-center justify-center">
        <p className="text-og-label text-sm">Messages will appear here once the match starts…</p>
      </div>
    )
  }

  return (
    <div className="og-card h-[460px] overflow-y-auto p-4 space-y-3 scroll-smooth">
      {messages.map((m, i) => {
        const isChooser = m.agentId === chooserId
        const style = isChooser ? CHOOSER_STYLE : (colorMap[m.agentId] ?? CONTESTANT_COLORS[0])
        const speaker = agentById[m.agentId]

        if (isChooser) {
          return (
            <div key={i} className="flex flex-col items-center gap-1 py-1">
              <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border max-w-[90%] ${style.bubble}`}>
                <AgentAvatar agent={speaker} fallbackName={m.agentName} ringClass={style.ring} size="xs" />
                <div>
                  <span className={`text-xs font-semibold ${style.text} mr-2`}>{m.agentName}</span>
                  <span className="text-xs text-og-label">R{m.round}</span>
                  <p className={`text-sm mt-0.5 italic ${style.text}`}>{m.content}</p>
                </div>
              </div>
            </div>
          )
        }

        return (
          <div key={i} className="flex gap-3 items-start">
            <AgentAvatar agent={speaker} fallbackName={m.agentName} ringClass={style.ring} size="md" />
            <div className={`flex-1 px-3 py-2.5 rounded-xl rounded-tl-none border ${style.bubble}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold ${style.text}`}>{m.agentName}</span>
                <span className="text-xs text-og-label">Round {m.round}</span>
              </div>
              <p className="text-sm text-og-text leading-relaxed">{m.content}</p>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
