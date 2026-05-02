'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { StepBasics } from '@/components/create-agent/StepBasics'
import { StepBinary } from '@/components/create-agent/StepBinary'
import { StepPrompt } from '@/components/create-agent/StepPrompt'
import { RevealScreen } from '@/components/create-agent/RevealScreen'
import { StepStrategy } from '@/components/create-agent/StepStrategy'
import { StepVibes } from '@/components/create-agent/StepVibes'
import type { Basics, BinaryAnswers } from '@/components/create-agent/types'

export default function CreateAgent() {
  const { address } = useAccount()

  const [step, setStep] = useState(1)

  // Step 1
  const [basics, setBasics] = useState<Basics>({
    name: '', avatar: '', imageUrl: '', age: '', gender: '', origin: '', profession: '', education: '', hobbies: '',
  })

  // Step 2
  const [vibes, setVibes] = useState<string[]>([])

  // Step 3
  const [binaries, setBinaries] = useState<BinaryAnswers>([null, null, null])

  // Step 4
  const [promptIdx, setPromptIdx] = useState(0)
  const [promptAnswer, setPromptAnswer] = useState('')

  // Step 5
  const [strategy, setStrategy] = useState('')

  const next = () => setStep(s => s + 1)
  const back = () => setStep(s => s - 1)

  if (step === 1) return <StepBasics basics={basics} setBasics={setBasics} onNext={next} />
  if (step === 2) return <StepVibes vibes={vibes} setVibes={setVibes} onBack={back} onNext={next} />
  if (step === 3) return <StepBinary binaries={binaries} setBinaries={setBinaries} onBack={back} onNext={next} />
  if (step === 4) return (
    <StepPrompt
      promptIdx={promptIdx}
      setPromptIdx={setPromptIdx}
      promptAnswer={promptAnswer}
      setPromptAnswer={setPromptAnswer}
      onBack={back}
      onNext={next}
    />
  )
  if (step === 5) return <StepStrategy strategy={strategy} setStrategy={setStrategy} onBack={back} onNext={next} />

  return (
    <RevealScreen
      basics={basics}
      vibes={vibes}
      binaries={binaries}
      promptIdx={promptIdx}
      promptAnswer={promptAnswer}
      strategy={strategy}
      onBack={back}
      address={address}
    />
  )
}
