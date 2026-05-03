type Props = { current: number; total: number }

export function RoundTracker({ current, total }: Props) {
  const steps = Array.from({ length: total }, (_, i) => i + 1)
  return (
    <div className="og-card p-4">
      <p className="text-xs text-og-label uppercase tracking-wider font-semibold mb-3">
        Round progress
      </p>
      <div className="flex items-center gap-1">
        {steps.map((n) => (
          <div key={n} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                n < current
                  ? 'bg-og-accent'
                  : n === current
                    ? 'bg-og-accent animate-pulse'
                    : 'bg-og-surface border border-og-border'
              }`}
            />
            <span
              className={`text-[10px] ${n <= current ? 'text-og-accent' : 'text-og-label'}`}
            >
              {n === 1 ? 'Intro' : `R${n}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
