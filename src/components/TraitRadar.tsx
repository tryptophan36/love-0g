// components/TraitRadar.tsx
'use client'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import type { TraitVector } from '@/packages/shared/types'

export default function TraitRadar({ traits, size = 200 }: { traits: TraitVector; size?: number }) {
  const data = Object.entries(traits).map(([key, value]) => ({
    trait: key.charAt(0).toUpperCase() + key.slice(1),
    value: value * 10
  }))

  return (
    <ResponsiveContainer width={size} height={size}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e5e5e5" />
        <PolarAngleAxis dataKey="trait" tick={{ fontSize: 10, fill: '#737373' }} />
        <Radar dataKey="value" stroke="#171717" fill="#171717" fillOpacity={0.12} strokeWidth={1.5} />
      </RadarChart>
    </ResponsiveContainer>
  )
}