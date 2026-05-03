'use client'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import type { TraitVector } from '@/app/orchestrator/src/types'

export default function TraitRadar({ traits, size = 200 }: { traits: TraitVector | null | undefined; size?: number }) {
  const safe = traits && typeof traits === 'object' ? traits : ({} as TraitVector)
  const data = Object.entries(safe).map(([key, value]) => ({
    trait: key.charAt(0).toUpperCase() + key.slice(1),
    value: value * 10,
  }))

  return (
    <ResponsiveContainer width={size} height={size}>
      <RadarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <PolarGrid stroke="rgba(255,255,255,0.08)" />
        <PolarAngleAxis dataKey="trait" tick={{ fontSize: 9, fill: '#8b8b8b' }} />
        <Radar
          dataKey="value"
          stroke="#b75fff"
          fill="#b75fff"
          fillOpacity={0.18}
          strokeWidth={1.5}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
