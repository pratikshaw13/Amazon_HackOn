'use client'

import ScoreRing from '../ui/ScoreRing'
import ProgressBar from '../ui/ProgressBar'
import Badge from '../ui/Badge'
import { ROUTING_OPTIONS } from '../../lib/constants'
import { ShoppingBag, CreditCard, Heart } from 'lucide-react'

export default function ValuationResult({ result, onAction }) {
  if (!result) return null

  const { condition, routing, product_name, category, green_impact_kg } = result
  const routingInfo = ROUTING_OPTIONS[routing.action] || ROUTING_OPTIONS.direct_resale

  const gradeVariant = condition.scores.overall >= 80 ? 'green'
    : condition.scores.overall >= 50 ? 'amber' : 'red'

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Product Health Report</h3>
          <p className="text-sm text-gray-500">{product_name} • {category}</p>
        </div>
        <Badge variant="blue">✓ AI Verified</Badge>
      </div>

      {/* Score Ring + Sub-scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Score */}
        <div className="flex justify-center">
          <div className="relative">
            <ScoreRing score={condition.scores.overall} size={140} label="Overall" />
          </div>
        </div>

        {/* Sub-scores */}
        <div className="col-span-2 space-y-3">
          <ProgressBar label="Surface Condition" score={condition.scores.surface} />
          <ProgressBar label="Parts Integrity" score={condition.scores.parts} />
          <ProgressBar label="Accessories" score={condition.scores.accessories} />
          <ProgressBar label="Packaging" score={condition.scores.packaging} />
        </div>
      </div>

      {/* Grade */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <Badge variant={gradeVariant}>{condition.grade}</Badge>
        <p className="text-sm text-gray-600">{condition.reasoning}</p>
      </div>

      {/* Defects */}
      {condition.defects_found && condition.defects_found.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">Defects Found</p>
          <ul className="space-y-1">
            {condition.defects_found.map((defect, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-brand-amber mt-0.5">⚠️</span> {defect}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Routing Recommendation */}
      <div className="border border-brand-blue/20 bg-brand-blue-light rounded-xl p-4">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">AI Recommendation</p>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{routingInfo.icon}</span>
          <span className="font-semibold text-gray-900">{routingInfo.label}</span>
          <Badge variant="blue">{Math.round(routing.confidence * 100)}% confidence</Badge>
        </div>
        <p className="text-sm text-gray-600">{routing.reasoning}</p>
        <div className="grid grid-cols-3 gap-4 mt-3 text-center">
          <div>
            <p className="text-xs text-gray-400">Estimated Value</p>
            <p className="font-bold text-brand-green">₹{routing.estimated_value?.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Buyback Offer</p>
            <p className="font-bold text-brand-blue">₹{routing.buyback_offer?.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Time to Sell</p>
            <p className="font-bold text-gray-700">{routing.time_to_sell_days} days</p>
          </div>
        </div>
      </div>

      {/* Green Impact */}
      {green_impact_kg && (
        <div className="flex items-center gap-2 text-sm text-brand-green bg-brand-green-light px-3 py-2 rounded-lg">
          🌱 This action saves <strong>{green_impact_kg} kg CO₂</strong> equivalent
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => onAction?.('list')}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-brand-green text-white font-semibold rounded-xl hover:bg-brand-green-dark transition-colors"
        >
          <ShoppingBag className="h-4 w-4" />
          List at ₹{routing.estimated_value?.toLocaleString()}
        </button>
        <button
          onClick={() => onAction?.('buyback')}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-brand-blue text-white font-semibold rounded-xl hover:bg-brand-blue/90 transition-colors"
        >
          <CreditCard className="h-4 w-4" />
          Accept ₹{routing.buyback_offer?.toLocaleString()} Buyback
        </button>
        <button
          onClick={() => onAction?.('donate')}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-white border-2 border-brand-green text-brand-green font-semibold rounded-xl hover:bg-brand-green-light transition-colors"
        >
          <Heart className="h-4 w-4" />
          Donate (+75 credits)
        </button>
      </div>
    </div>
  )
}
