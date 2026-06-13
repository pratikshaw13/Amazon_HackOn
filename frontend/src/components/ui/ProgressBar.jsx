'use client'

import { getScoreColor } from '../../lib/constants'

export default function ProgressBar({ label, score, maxScore = 100 }) {
  const percentage = (score / maxScore) * 100
  const color = getScoreColor(score)

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-semibold" style={{ color }}>{score}/{maxScore}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
