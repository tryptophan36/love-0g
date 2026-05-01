import { VIBES } from './constants'
import { StepShell } from './StepShell'

type StepVibesProps = {
  vibes: string[]
  setVibes: React.Dispatch<React.SetStateAction<string[]>>
  onBack: () => void
  onNext: () => void
}

export function StepVibes({ vibes, setVibes, onBack, onNext }: StepVibesProps) {
  const toggle = (vibe: string) => {
    setVibes(prev =>
      prev.includes(vibe)
        ? prev.filter(x => x !== vibe)
        : prev.length < 4
          ? [...prev, vibe]
          : prev,
    )
  }

  return (
    <StepShell
      step={2}
      heading="What's their vibe?"
      sub="Pick up to 4 that feel right. These shape their personality."
      onBack={onBack}
      onNext={onNext}
      nextDisabled={vibes.length === 0}
    >
      <div className="flex flex-wrap gap-3">
        {VIBES.map(v => {
          const selected = vibes.includes(v)
          const maxed = !selected && vibes.length >= 4
          return (
            <button
              key={v}
              onClick={() => toggle(v)}
              disabled={maxed}
              className={`px-5 py-2.5 rounded-full text-sm font-medium border transition-all duration-200
                          ${
                            selected
                              ? 'bg-og-accent text-white border-og-accent shadow-[0_0_18px_rgba(183,95,255,0.35)] scale-105'
                              : maxed
                                ? 'border-og-border text-og-label/30 cursor-not-allowed'
                                : 'border-og-border text-og-label hover:border-og-accent/50 hover:text-white'
                          }`}
            >
              {v}
            </button>
          )
        })}
      </div>
      {vibes.length > 0 && (
        <p className="mt-6 text-xs text-og-label">
          {vibes.length === 4 ? 'Max 4 selected' : `${vibes.length} selected · ${4 - vibes.length} left`}
        </p>
      )}
    </StepShell>
  )
}
