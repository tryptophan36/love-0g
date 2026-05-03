import type { Phase } from '@/lib/arena/types'

type Props = {
  phase: Phase
  seatsTaken: number
  maxSeats: number
  matchId: string
}

export function WaitingScreen({ phase, seatsTaken, maxSeats, matchId }: Props) {
  const isFull = phase === 'full' || phase === 'starting'
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="og-card p-10 max-w-sm w-full text-center space-y-6">
        <div>
          <p className="text-xs text-og-label uppercase tracking-widest mb-1">Match</p>
          <p className="font-mono text-2xl text-og-accent font-bold">#{matchId}</p>
        </div>

        <div className="flex justify-center">
          {isFull ? (
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full bg-og-accent/20 animate-ping" />
              <div className="relative w-16 h-16 rounded-full bg-og-accent/15 border border-og-accent/40 flex items-center justify-center">
                <svg className="w-7 h-7 text-og-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
            </div>
          ) : (
            <div className="flex gap-1.5">
              {Array.from({ length: maxSeats }, (_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full border transition-all duration-500 ${
                    i < seatsTaken
                      ? 'bg-og-accent border-og-accent'
                      : 'bg-og-surface border-og-border'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          {phase === 'loading' && <p className="text-og-label text-sm">Loading match…</p>}
          {phase === 'open' && (
            <>
              <p className="text-white font-semibold mb-1">Waiting for contestants</p>
              <p className="text-og-label text-sm">
                {seatsTaken} / {maxSeats} seats filled
              </p>
            </>
          )}
          {phase === 'full' && (
            <>
              <p className="text-white font-semibold mb-1">Match is full!</p>
              <p className="text-og-label text-sm">Starting the match…</p>
            </>
          )}
          {phase === 'starting' && (
            <>
              <p className="text-white font-semibold mb-1">Starting…</p>
              <p className="text-og-label text-sm">Loading agents from 0G Storage</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
