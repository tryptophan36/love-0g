import { AGE_RANGES, AVATARS, GENDERS } from './constants'
import { Field, TextInput } from './FormBits'
import { StepShell } from './StepShell'
import type { Basics } from './types'

type StepBasicsProps = {
  basics: Basics
  setBasics: React.Dispatch<React.SetStateAction<Basics>>
  onNext: () => void
}

export function StepBasics({ basics, setBasics, onNext }: StepBasicsProps) {
  const set = (key: keyof Basics) => (value: string) => {
    setBasics(prev => ({ ...prev, [key]: value }))
  }

  return (
    <StepShell
      step={1}
      heading="Let's build their profile."
      sub="Think of this like setting up a dating app for your agent."
      onNext={onNext}
      nextDisabled={!basics.name.trim()}
    >
      <div className="space-y-7">
        <Field q="What do you want to call them?">
          <TextInput
            value={basics.name}
            onChange={set('name')}
            placeholder="e.g. Nova, Echo, Ryn…"
            maxLength={32}
          />
        </Field>

        <Field q="Pick an avatar">
          <div className="flex gap-3 flex-wrap">
            {AVATARS.map(em => (
              <button
                key={em}
                onClick={() => set('avatar')(em)}
                className={`text-2xl w-12 h-12 rounded-2xl border flex items-center justify-center
                            transition-all duration-200
                            ${
                              basics.avatar === em
                                ? 'border-og-accent bg-og-accent/15 shadow-[0_0_16px_rgba(183,95,255,0.3)] scale-110'
                                : 'border-og-border hover:border-og-accent/40'
                            }`}
              >
                {em}
              </button>
            ))}
          </div>
        </Field>

        <Field q="How old are they?">
          <div className="flex gap-2 flex-wrap">
            {AGE_RANGES.map(a => (
              <button
                key={a}
                onClick={() => set('age')(a)}
                className={`px-4 py-2 rounded-full text-sm border transition-all ${
                  basics.age === a
                    ? 'bg-og-accent text-white border-og-accent shadow-[0_0_12px_rgba(183,95,255,0.3)]'
                    : 'border-og-border text-og-label hover:border-og-accent/40 hover:text-white'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </Field>

        <Field q="How do they identify?">
          <div className="flex gap-2 flex-wrap">
            {GENDERS.map(g => (
              <button
                key={g}
                onClick={() => set('gender')(g)}
                className={`px-4 py-2 rounded-full text-sm border transition-all ${
                  basics.gender === g
                    ? 'bg-og-accent text-white border-og-accent shadow-[0_0_12px_rgba(183,95,255,0.3)]'
                    : 'border-og-border text-og-label hover:border-og-accent/40 hover:text-white'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </Field>

        <Field q="Where are they from?">
          <TextInput
            value={basics.origin}
            onChange={set('origin')}
            placeholder="City, country, or just a vibe…"
          />
        </Field>

        <Field q="What do they do?">
          <TextInput
            value={basics.profession}
            onChange={set('profession')}
            placeholder="Their profession or craft…"
          />
        </Field>

        <Field q="Where did they study?">
          <TextInput
            value={basics.education}
            onChange={set('education')}
            placeholder="School, field, or life experience…"
          />
        </Field>

        <Field q="What do they love doing?">
          <TextInput
            value={basics.hobbies}
            onChange={set('hobbies')}
            placeholder="Reading, gaming, long walks at 2am…"
          />
        </Field>
      </div>
    </StepShell>
  )
}
