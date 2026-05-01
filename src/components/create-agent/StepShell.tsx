import Navbar from '@/components/Navbar'
import { TOTAL_STEPS } from './constants'

type StepShellProps = {
  step: number
  heading: string
  sub?: string
  children: React.ReactNode
  onBack?: () => void
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
}

export function StepShell({
  step,
  heading,
  sub,
  children,
  onBack,
  onNext,
  nextLabel = 'Continue →',
  nextDisabled = false,
}: StepShellProps) {
  return (
    <div className="flex flex-col min-h-screen bg-[#1A1A1F]">
      <Navbar />
      <div className="flex-1 flex flex-col max-w-xl mx-auto w-full px-6 pt-24 pb-16">
        <div className="flex gap-1.5 mb-10">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i < step ? 'bg-og-accent' : 'bg-og-border'
              }`}
            />
          ))}
        </div>

        <div className="mb-8">
          <p className="text-xs text-og-label uppercase tracking-widest mb-2">
            Step {step} of {TOTAL_STEPS}
          </p>
          <h1 className="text-2xl font-bold text-white leading-snug">{heading}</h1>
          {sub && <p className="text-og-label mt-1.5 text-sm">{sub}</p>}
        </div>

        <div className="flex-1">{children}</div>

        <div className="mt-10 flex gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-5 py-3 rounded-xl border border-og-border text-og-label text-sm hover:border-og-accent/40 hover:text-white transition-all"
            >
              ← Back
            </button>
          )}
          <button
            onClick={onNext}
            disabled={nextDisabled}
            className="flex-1 py-3 rounded-xl bg-og-accent text-white text-base font-semibold
                       disabled:opacity-40 disabled:cursor-not-allowed
                       hover:bg-og-purple hover:shadow-[0_0_24px_rgba(183,95,255,0.4)]
                       transition-all duration-200"
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
