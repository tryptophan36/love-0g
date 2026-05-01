import { STRATEGY_CARDS } from '@/lib/traitMapper'
import { StepShell } from './StepShell'

type StepStrategyProps = {
  strategy: string
  setStrategy: (strategy: string) => void
  onBack: () => void
  onNext: () => void
}

export function StepStrategy({ strategy, setStrategy, onBack, onNext }: StepStrategyProps) {
  return (
    <StepShell
      step={5}
      heading="How do they play?"
      sub="Pick the one that fits how your agent moves in a conversation."
      onBack={onBack}
      onNext={onNext}
      nextDisabled={!strategy}
    >
      <div className="space-y-3">
        {STRATEGY_CARDS.map(card => {
          const chosen = strategy === card.value
          return (
            <button
              key={card.value}
              onClick={() => setStrategy(card.value)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border text-left
                          transition-all duration-200
                          ${
                            chosen
                              ? 'bg-og-accent/10 border-og-accent shadow-[0_0_20px_rgba(183,95,255,0.2)]'
                              : 'border-og-border hover:border-og-accent/40'
                          }`}
            >
              <span className="text-2xl">{card.icon}</span>
              <div>
                <p className={`text-sm font-semibold ${chosen ? 'text-white' : 'text-og-text'}`}>
                  {card.label}
                </p>
                <p className="text-xs text-og-label mt-0.5">{card.caption}</p>
              </div>
              {chosen && (
                <div className="ml-auto w-4 h-4 rounded-full bg-og-accent flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                    <path
                      d="M10 3L5 8.5 2 5.5"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </StepShell>
  )
}
