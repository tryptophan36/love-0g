// app/arena/[matchId]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getSocket } from '../../../lib/socket'
import ChatFeed from '@/components/ChatFeed'
import JudgePanel from '@/components/JudgePanel'
import Navbar from '@/components/Navbar'
import dynamic from 'next/dynamic'

const TraitRadar = dynamic(() => import('@/components/TraitRadar'), { ssr: false })
import type { Message, JudgeScore, ChooserState, Match } from '@/app/orchestrator/src/types'

export default function ArenaPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const [match, setMatch]           = useState<Match | null>(null)
  const [messages, setMessages]     = useState<Message[]>([])
  const [scores, setScores]         = useState<JudgeScore[]>([])
  const [chooserState, setCS]       = useState<ChooserState | null>(null)
  const [status, setStatus]         = useState<string>('loading')
  const [ogKvHash, setOgKvHash]     = useState<string>('')

  useEffect(() => {
    fetch(`/api/matches/${matchId}`)
      .then(r => r.json())
      .then(setMatch)

    const socket = getSocket()
    socket.emit('join_match', matchId)

    socket.on('message',       (data: any) => setMessages(m => [...m, data.message]))
    socket.on('chooser_state', (data: any) => { setCS(data.state); setOgKvHash(data.ogHash) })
    socket.on('status',        (data: any) => setStatus(data.status))
    socket.on('complete',      (data: any) => { setMatch(data.match); setScores(data.match.scores) })

    return () => { socket.off('message'); socket.off('chooser_state'); socket.off('status'); socket.off('complete') }
  }, [matchId])

  return (
    <div className="min-h-screen bg-[#1A1A1F]">
      <Navbar />

      {/* Sub-header */}
      <div className="mt-[57px] border-b border-og-border bg-og-surface/40 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-og-text">
          Arena — Match{' '}
          <span className="font-mono text-og-accent">{matchId.slice(0, 8)}</span>
        </span>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium
            ${status === 'running'  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : ''}
            ${status === 'judging'  ? 'bg-amber-500/15  text-amber-400  border border-amber-500/20'  : ''}
            ${status === 'complete' ? 'bg-og-accent/15  text-og-light   border border-og-accent/20'  : ''}
            ${status === 'loading'  ? 'bg-og-surface    text-og-label   border border-og-border'      : ''}
          `}>{status}</span>
          {ogKvHash && (
            <a href={`https://storagescan.0g.ai/?hash=${ogKvHash}`} target="_blank"
               className="text-xs text-og-label hover:text-og-accent transition-colors font-mono underline underline-offset-2">
              0G KV: {ogKvHash.slice(0, 12)}…
            </a>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-3 gap-6">
        {/* Agent trait radars */}
        <div className="col-span-3 grid grid-cols-3 gap-4">
          {match?.contestants.map(agent => {
            const reaction = chooserState?.reactions[agent.id]
            return (
              <div key={agent.id} className="og-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-sm text-white">{agent.name}</span>
                  {reaction && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border
                      ${reaction.vibe === 'excited'    ? 'bg-pink-500/15   text-pink-400   border-pink-500/20'    : ''}
                      ${reaction.vibe === 'intrigued'  ? 'bg-og-accent/15  text-og-light   border-og-accent/20'   : ''}
                      ${reaction.vibe === 'bored'      ? 'bg-og-surface    text-og-label   border-og-border'       : ''}
                      ${reaction.vibe === 'neutral'    ? 'bg-og-surface    text-og-label   border-og-border'       : ''}
                      ${reaction.vibe === 'warming_up' ? 'bg-amber-500/15  text-amber-400  border-amber-500/20'   : ''}
                      ${reaction.vibe === 'annoyed'    ? 'bg-red-500/15    text-red-400    border-red-500/20'      : ''}
                    `}>{reaction.vibe}</span>
                  )}
                </div>
                <TraitRadar traits={agent.traits} size={140} />
                {reaction && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-og-label mb-1">
                      <span>Chooser score</span>
                      <span className="text-og-light">{(reaction.score * 10).toFixed(1)}/10</span>
                    </div>
                    <div className="w-full bg-og-surface rounded-full h-1.5 border border-og-border">
                      <div
                        className="bg-gradient-to-r from-og-purple to-og-accent h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${reaction.score * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Chat feed */}
        <div className="col-span-2">
          <ChatFeed messages={messages} contestants={match?.contestants ?? []} />
        </div>

        {/* Judge panel */}
        <div>
          <JudgePanel scores={scores} contestants={match?.contestants ?? []} />

          {/* Breed button — shows after match complete */}
          {status === 'complete' && scores.length >= 2 && (
            <div className="mt-4 og-card p-5">
              <p className="text-sm font-semibold text-white mb-1">🧬 Breed top 2 agents</p>
              <p className="text-xs text-og-label mb-4">
                Creates a child iNFT inheriting traits from both parents
              </p>
              <input
                className="w-full bg-og-surface border border-og-border rounded-lg px-3 py-2 text-sm text-white placeholder-og-label mb-3 focus:outline-none focus:border-og-accent/50"
                placeholder="Child agent name"
                id="child-name"
              />
              <button
                onClick={() => {
                  const name = (document.getElementById('child-name') as HTMLInputElement).value
                  fetch('/api/agents/breed', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      parentAId: scores[0].agentId,
                      parentBId: scores[1].agentId,
                      childName: name
                    })
                  })
                }}
                className="w-full bg-og-accent text-white rounded-lg py-2 text-sm font-medium hover:bg-og-purple transition-colors"
              >
                Breed agents
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}