import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import {
  answersToTraits,
  ICEBREAKER_PROMPTS,
  STRATEGY_CARDS,
  topTraits,
} from '@/lib/traitMapper'
import { TOTAL_STEPS } from './constants'
import type { Basics, BinaryAnswers } from './types'

const TraitRadar = dynamic(() => import('@/components/TraitRadar'), { ssr: false })

type RevealScreenProps = {
  basics: Basics
  vibes: string[]
  binaries: BinaryAnswers
  promptIdx: number
  promptAnswer: string
  strategy: string
  onBack: () => void
  address: string | undefined
}

export function RevealScreen({
  basics,
  vibes,
  binaries,
  promptIdx,
  promptAnswer,
  strategy,
  onBack,
  address,
}: RevealScreenProps) {
  const [minting, setMinting] = useState(false)
  const [tokenId, setTokenId] = useState<number | null>(null)
  const [visible, setVisible] = useState(false)

  const traits = answersToTraits(vibes, binaries)
  const top = topTraits(traits)
  const card = STRATEGY_CARDS.find(c => c.value === strategy)

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(true), 120)
    return () => clearTimeout(timeout)
  }, [])

  const handleMint = async () => {
    setMinting(true)
    const systemPrompt = [
      basics.origin && `From ${basics.origin}.`,
      basics.age && `Age: ${basics.age}.`,
      basics.gender && `Gender: ${basics.gender}.`,
      basics.profession && `Works as: ${basics.profession}.`,
      basics.education && `Education: ${basics.education}.`,
      basics.hobbies && `Into: ${basics.hobbies}.`,
      `${ICEBREAKER_PROMPTS[promptIdx]} ${promptAnswer}`,
    ]
      .filter(Boolean)
      .join(' ')

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: basics.name,
          traits,
          strategy,
          owner: address,
          systemPrompt,
          // profile fields — forwarded so the orchestrator can use them in LLM context
          avatar:     basics.avatar,
          age:        basics.age,
          gender:     basics.gender,
          origin:     basics.origin,
          profession: basics.profession,
          education:  basics.education,
          hobbies:    basics.hobbies,
        }),
      })
      const data = await res.json()
      setTokenId(data.tokenId)
    } catch (error) {
      console.error(error)
    } finally {
      setMinting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#1A1A1F]">
      <Navbar />
      <div className="flex-1 flex flex-col max-w-xl mx-auto w-full px-6 pt-24 pb-16">
        <div className="flex gap-1.5 mb-10">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="h-1 flex-1 rounded-full bg-og-accent" />
          ))}
        </div>

        <div
          className={`transition-all duration-700 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex items-center gap-3 mb-6">
            <span className="text-4xl">{basics.avatar || '🤖'}</span>
            <div>
              <h1 className="text-2xl font-bold text-white">{basics.name}</h1>
              {(basics.age || basics.gender || basics.origin) && (
                <p className="text-og-label text-sm">
                  {[basics.age, basics.gender, basics.origin].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>

          <div className="og-card p-6 mb-5 flex flex-col items-center">
            <p className="text-xs text-og-label uppercase tracking-widest mb-4">Personality Profile</p>
            <TraitRadar traits={traits} size={260} />
            <div className="mt-4 flex gap-2 flex-wrap justify-center">
              {top.map(trait => (
                <span
                  key={trait}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-og-accent/15 border border-og-accent/30 text-og-accent"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>

          {card && (
            <div className="og-card px-5 py-4 mb-5 flex items-center gap-3">
              <span className="text-xl">{card.icon}</span>
              <div>
                <p className="text-white text-sm font-semibold">{card.label}</p>
                <p className="text-og-label text-xs">{card.caption}</p>
              </div>
            </div>
          )}

          {promptAnswer && (
            <div className="og-card px-5 py-4 mb-8">
              <p className="text-og-label text-xs italic mb-1">&ldquo;{ICEBREAKER_PROMPTS[promptIdx]}&rdquo;</p>
              <p className="text-white text-sm">{promptAnswer}</p>
            </div>
          )}

          {tokenId ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-400 text-sm">
              Agent minted — iNFT #{tokenId} on 0G Chain.{' '}
              <a
                href={`https://chainscan-galileo.0g.ai/token/${process.env.NEXT_PUBLIC_INFT_CONTRACT}/${tokenId}`}
                target="_blank"
                className="underline underline-offset-2 hover:text-emerald-300 transition-colors"
              >
                View on explorer →
              </a>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={onBack}
                className="px-5 py-3 rounded-xl border border-og-border text-og-label text-sm hover:border-og-accent/40 hover:text-white transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleMint}
                disabled={!address || minting}
                className="flex-1 py-3 rounded-xl bg-og-accent text-white text-base font-semibold
                           disabled:opacity-40 disabled:cursor-not-allowed
                           hover:bg-og-purple hover:shadow-[0_0_24px_rgba(183,95,255,0.4)]
                           transition-all duration-200"
              >
                {minting ? 'Minting iNFT…' : 'Mint this Agent'}
              </button>
            </div>
          )}

          {!address && (
            <p className="text-center text-og-label text-xs mt-3">Connect your wallet to mint</p>
          )}
        </div>
      </div>
    </div>
  )
}
