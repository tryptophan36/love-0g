'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import ChatFeed from '@/components/ChatFeed'
// import JudgePanel from '@/components/JudgePanel'
import { ChooserPanel } from '@/components/arena/ChooserPanel'
import { RoundTracker } from '@/components/arena/RoundTracker'
import { ContestantCard } from '@/components/arena/ContestantCard'
import { DecisionCard } from '@/components/arena/DecisionCard'
import { WaitingScreen } from '@/components/arena/WaitingScreen'
import { getSocket } from '@/lib/socket'
import { ORCHESTRATOR_URL } from '@/lib/arena/config'
import { AGENT_COLORS, PHASE_BADGE } from '@/lib/arena/constants'
import type { Phase } from '@/lib/arena/types'
import type {
  Message,
  ChooserState,
  ChooserDecision,
  Agent,
} from '@/app/orchestrator/src/types'

export default function ArenaPage() {
  const params = useParams<{ matchId?: string | string[] }>()
  const matchId =
    typeof params.matchId === 'string'
      ? params.matchId
      : Array.isArray(params.matchId)
        ? params.matchId[0]
        : ''

  const [phase, setPhase]               = useState<Phase>('loading')
  const [seatsTaken, setSeatsTaken]     = useState(0)
  const [maxSeats, setMaxSeats]         = useState(2)
  const [contestants, setContestants]   = useState<Agent[]>([])
  const [chooser, setChooser]           = useState<Agent | null>(null)
  const [messages, setMessages]         = useState<Message[]>([])
  const [chooserState, setChooserState] = useState<ChooserState | null>(null)
  const [chooserDecision, setDecision]  = useState<ChooserDecision | null>(null)
  const [currentRound, setCurrentRound] = useState(0)
  const [ogKvHash, setOgKvHash]         = useState('')
  const [winnerId, setWinnerId]         = useState<string | null>(null)

  const startTriggered = useRef(false)

  const triggerStart = useCallback(async () => {
    if (startTriggered.current) return
    startTriggered.current = true
    setPhase('starting')
    try {
      await fetch(`${ORCHESTRATOR_URL}/api/matches/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      })
    } catch (e) {
      console.error('Failed to trigger match start:', e)
    }
  }, [matchId])

  const triggerStartRef = useRef(triggerStart)

  useEffect(() => {
    triggerStartRef.current = triggerStart
  }, [triggerStart])

  useEffect(() => {
    startTriggered.current = false
  }, [matchId])

  /** Poll on-chain match lobby only until the match is live or finished (status ≥ 2); after that the socket + orchestrator carry state. */
  useEffect(() => {
    if (!matchId) return

    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | null = null

    const stopPolling = () => {
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    const poll = async () => {
      if (cancelled) return
      try {
        const res = await fetch(`/api/matches/${encodeURIComponent(matchId)}`)
        if (!res.ok || cancelled) return
        const body = await res.json()
        const snap = body?.match
        if (!snap || cancelled) return
        setSeatsTaken(snap.participantsJoined ?? 0)
        setMaxSeats(snap.maxParticipants ?? 2)

        const s = Number(snap.status)
        if (s === 3) setPhase('complete')
        if (s === 4) setPhase('cancelled')
        if (s === 5) setPhase('failed')
        if (s === 0) setPhase((p) => (p === 'loading' ? 'open' : p))
        if (s === 1) {
          setPhase('full')
          void triggerStartRef.current()
        }
        if (s === 2) {
          setPhase((p) =>
            p === 'loading' || p === 'open' || p === 'full' || p === 'starting' ? 'running' : p,
          )
        }

        if (s >= 2) stopPolling()
      } catch {
        // ignore transient errors
      }
    }

    void poll()
    intervalId = setInterval(poll, 3000)
    return () => {
      cancelled = true
      stopPolling()
    }
  }, [matchId])

  useEffect(() => {
    if (!matchId) return

    const socket = getSocket()
    socket.emit('join_match', matchId)

    fetch(`${ORCHESTRATOR_URL}/api/matches/${encodeURIComponent(matchId)}`)
      .then(r => r.ok ? r.json() : null)
      .then((m: {
        status?: string; contestants?: Agent[]; chooser?: Agent;
        messages?: Message[]; currentRound?: number;
        winnerId?: string; decision?: ChooserDecision;
      } | null) => {
        if (!m) return
        if (m.contestants?.length)  setContestants(m.contestants)
        if (m.chooser)              setChooser(m.chooser)
        if (m.messages?.length)     setMessages(m.messages)
        if (m.currentRound)         setCurrentRound(m.currentRound)
        if (m.winnerId)             setWinnerId(m.winnerId)
        if (m.decision)             setDecision(m.decision)
        if (m.status === 'running') setPhase('running')
        // if (m.status === 'judging') setPhase('judging')
        if (m.status === 'complete') setPhase('complete')
      })
      .catch(() => {})

    socket.on('match_started', (data: { contestants: Agent[]; chooser: Agent }) => {
      setContestants(data.contestants ?? [])
      setChooser(data.chooser ?? null)
      setPhase('running')
    })

    socket.on('round_start', (data: { round: number }) => {
      setCurrentRound(data.round)
    })

    socket.on('message', (data: { message: Message }) => {
      setMessages(m => [...m, data.message])
    })

    socket.on('chooser_message', (data: { message: Message }) => {
      setMessages(m => [...m, data.message])
    })

    socket.on('chooser_state', (data: { state: ChooserState; ogHash: string }) => {
      setChooserState(data.state)
      if (data.ogHash) setOgKvHash(data.ogHash)
    })

    socket.on('chooser_decision', (data: { decision: ChooserDecision }) => {
      setDecision(data.decision)
    })

    socket.on('status', (data: { status: string }) => {
      if (data.status === 'running') setPhase('running')
      // if (data.status === 'judging') setPhase('judging')
    })

    socket.on('complete', (data: { match: {
      contestants: Agent[]; chooser: Agent;
      winnerId: string; decision: ChooserDecision;
    }}) => {
      setPhase('complete')
      if (data.match?.contestants) setContestants(data.match.contestants)
      if (data.match?.chooser)     setChooser(data.match.chooser)
      if (data.match?.winnerId)    setWinnerId(data.match.winnerId)
      if (data.match?.decision)    setDecision(data.match.decision)
    })

    return () => {
      socket.off('match_started')
      socket.off('round_start')
      socket.off('message')
      socket.off('chooser_message')
      socket.off('chooser_state')
      socket.off('chooser_decision')
      socket.off('status')
      socket.off('complete')
    }
  }, [matchId])

  const colorMap = Object.fromEntries(
    contestants.map((a, i) => [a.id, AGENT_COLORS[i % AGENT_COLORS.length]]),
  )

  const phaseBadge = PHASE_BADGE[phase]

  const isWaiting = phase === 'loading' || phase === 'open' || phase === 'full' || phase === 'starting'

  return (
    <div className="min-h-screen bg-[#1A1A1F]">
      <div className="fixed inset-0 hero-grid-bg pointer-events-none" />
      <Navbar />

      <div className="relative mt-[57px] border-b border-og-border bg-og-surface/40 backdrop-blur-sm px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium text-og-text">Arena</span>
          <span className="text-og-border">/</span>
          <span className="font-mono text-og-accent text-sm font-semibold truncate">#{matchId}</span>
          {currentRound > 0 && (
            <>
              <span className="text-og-border hidden sm:inline">/</span>
              <span className="text-xs text-og-label hidden sm:inline">
                {currentRound === 1 ? 'Intro' : 'Interaction'} · Round {currentRound}/4
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${phaseBadge.cls}`}>
            {phaseBadge.label}
          </span>
          {ogKvHash && (
            <a
              href={`https://storagescan.0g.ai/?hash=${ogKvHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-og-label hover:text-og-accent transition-colors font-mono underline underline-offset-2 hidden sm:inline"
            >
              0G: {ogKvHash.slice(0, 10)}…
            </a>
          )}
        </div>
      </div>

      {isWaiting && (
        <div className="relative max-w-xl mx-auto px-6">
          <WaitingScreen
            phase={phase}
            seatsTaken={seatsTaken}
            maxSeats={maxSeats}
            matchId={matchId}
          />
        </div>
      )}

      {!isWaiting && (
        <div className="relative max-w-6xl mx-auto px-6 py-6 space-y-5">
          {(phase === 'cancelled' || phase === 'failed') && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${
                phase === 'cancelled'
                  ? 'border-red-500/35 bg-red-500/10 text-red-200'
                  : 'border-violet-500/35 bg-violet-500/10 text-violet-200'
              }`}
            >
              {phase === 'cancelled'
                ? 'This match was cancelled on-chain.'
                : 'This match failed on-chain (for example after an engine crash). It can be retried via the contract when reset to full.'}
            </div>
          )}

          {chooserDecision && chooser && (
            <DecisionCard decision={chooserDecision} chooserName={chooser.name} chooser={chooser} />
          )}

          {contestants.length > 0 && (
            <div
              className={`grid gap-4 ${
                contestants.length === 1
                  ? 'grid-cols-1 max-w-lg mx-auto'
                  : contestants.length === 2
                    ? 'grid-cols-2'
                    : 'grid-cols-3'
              }`}
            >
              {contestants.map((agent) => (
                <ContestantCard
                  key={agent.id}
                  agent={agent}
                  reaction={chooserState?.reactions[agent.id]}
                  color={colorMap[agent.id] ?? AGENT_COLORS[0]}
                  isWinner={!!winnerId && winnerId === agent.id}
                />
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-3 lg:col-span-2">
              <p className="text-xs text-og-label uppercase tracking-wider font-semibold mb-2">Live chat</p>
              <ChatFeed
                messages={messages}
                contestants={contestants}
                chooserId={chooser?.id}
                chooser={chooser}
              />
            </div>

            <div className="col-span-3 lg:col-span-1 space-y-4">
              <RoundTracker current={currentRound} total={4} />

              <ChooserPanel chooser={chooser} state={chooserState} />

              {/* {phase === 'judging' && (
                <div className="og-card p-4 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-og-accent animate-pulse" />
                  <p className="text-sm text-og-light">Judge is scoring…</p>
                </div>
              )} */}

              {/* {(phase === 'complete' || scores.length > 0) && (
                <JudgePanel scores={scores} contestants={contestants} />
              )} */}

              {phase === 'complete' && contestants.length >= 2 && (
                <div className="og-card p-5">
                  <p className="text-sm font-semibold text-white mb-0.5">Breed top 2 agents</p>
                  <p className="text-xs text-og-label mb-4 leading-relaxed">
                    Creates a child iNFT inheriting traits from both parents
                  </p>
                  <input
                    id="child-name"
                    className="w-full bg-og-surface border border-og-border rounded-lg px-3 py-2 text-sm text-white placeholder-og-label mb-3 focus:outline-none focus:border-og-accent/50"
                    placeholder="Child agent name"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const name = (document.getElementById('child-name') as HTMLInputElement).value
                      const runner = contestants.find((c) => c.id !== winnerId)
                      if (!winnerId || !runner) return
                      fetch(`${ORCHESTRATOR_URL}/api/agents/breed`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          parentAId: winnerId,
                          parentBId: runner.id,
                          childName: name,
                        }),
                      })
                    }}
                    className="w-full py-2.5 rounded-xl bg-og-accent text-white font-semibold text-sm hover:bg-og-purple transition-colors"
                  >
                    Breed agents
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
