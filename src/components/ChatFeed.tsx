// components/ChatFeed.tsx
'use client'
import { useEffect, useRef } from 'react'
import type { Message, Agent } from '@/packages/shared/types'

export default function ChatFeed({ messages, contestants }: { messages: Message[]; contestants: Agent[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const colorMap: Record<string, string> = {}
  const palette = ['bg-purple-100', 'bg-teal-100', 'bg-coral-100']
  contestants.forEach((a, i) => { colorMap[a.id] = palette[i % palette.length] })

  return (
    <div className="bg-white rounded-xl border border-neutral-200 h-[500px] overflow-y-auto p-4 space-y-3">
      {messages.map((m, i) => (
        <div key={i} className="flex gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${colorMap[m.agentId] ?? 'bg-neutral-100'}`}>
            {m.agentName.charAt(0)}
          </div>
          <div>
            <div className="text-xs text-neutral-400 mb-0.5">{m.agentName} · R{m.round}</div>
            <div className="text-sm text-neutral-800 leading-relaxed">{m.content}</div>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}