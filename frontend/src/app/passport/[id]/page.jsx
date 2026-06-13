'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { passportApi } from '../../../lib/api'
import ScoreRing from '../../../components/ui/ScoreRing'
import ProgressBar from '../../../components/ui/ProgressBar'
import Badge from '../../../components/ui/Badge'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import { ROUTING_OPTIONS, getScoreColor } from '../../../lib/constants'
import { Shield, Clock, Leaf, AlertTriangle } from 'lucide-react'

export default function PassportPage() {
  const params = useParams()
  const [passport, setPassport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchPassport() {
      try {
        const response = await passportApi.get(params.id)
        setPassport(response.data)
      } catch (err) {
        setError('Health Passport not found')
      } finally {
        setLoading(false)
      }
    }
    if (params.id) fetchPassport()
  }, [params.id])

  if (loading) return <LoadingSpinner text="Loading Health Passport..." />
  if (error) return (
    <div className="text-center py-16">
      <p className="text-gray-500">{error}</p>
      <a href="/marketplace" className="text-brand-green hover:underline text-sm mt-2 inline-block">
        ← Back to Marketplace
      </a>
    </div>
  )
  if (!passport) return null

  const scores = passport.scores || {}
  const overallScore = passport.condition_score || 0
  const routingInfo = ROUTING_OPTIONS[passport.routing_action] || {}

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-5 w-5 text-brand-blue" />
              <h1 className="text-xl font-bold text-gray-900">Product Health Passport</h1>
            </div>
            <p className="text-gray-500">{passport.product_name} • {passport.category}</p>
          </div>
          <div className="flex items-center gap-2">
            {passport.ai_verified && <Badge variant="blue">✓ AI Verified</Badge>}
            <Badge variant={overallScore >= 80 ? 'green' : overallScore >= 50 ? 'amber' : 'red'}>
              {passport.condition_grade}
            </Badge>
          </div>
        </div>
      </div>

      {/* Score Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Score Ring */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col items-center justify-center">
          <div className="relative">
            <ScoreRing score={overallScore} size={160} label="Overall Health" />
          </div>
        </div>

        {/* Sub-scores */}
        <div className="md:col-span-2 bg-white border border-gray-100 rounded-xl p-6 space-y-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Condition Breakdown</p>
          <ProgressBar label="Surface Condition" score={scores.surface || 0} />
          <ProgressBar label="Functional Parts" score={scores.parts || 0} />
          <ProgressBar label="Accessories" score={scores.accessories || 0} />
          <ProgressBar label="Packaging" score={scores.packaging || 0} />
        </div>
      </div>

      {/* Defects & AI Reasoning */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Defects */}
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
            <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
            Defects Found
          </p>
          {passport.defects_found && passport.defects_found.length > 0 ? (
            <ul className="space-y-2">
              {passport.defects_found.map((defect, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-brand-amber">•</span> {defect}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-brand-green">✓ No defects detected</p>
          )}

          {passport.missing_accessories && passport.missing_accessories.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-400 mb-2">Missing Accessories</p>
              <ul className="space-y-1">
                {passport.missing_accessories.map((item, i) => (
                  <li key={i} className="text-sm text-gray-500">— {item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* AI Reasoning */}
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">AI Assessment</p>
          <p className="text-sm text-gray-600 leading-relaxed">{passport.ai_reasoning}</p>
        </div>
      </div>

      {/* Routing Recommendation */}
      {passport.routing_action && (
        <div className="bg-brand-blue-light border border-brand-blue/20 rounded-xl p-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">AI Disposition Recommendation</p>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{routingInfo.icon}</span>
            <span className="font-bold text-gray-900 text-lg">{routingInfo.label}</span>
          </div>
          <p className="text-sm text-gray-600">{passport.routing_reasoning}</p>
          {passport.estimated_value && (
            <p className="text-sm mt-2 font-medium text-brand-green">
              Estimated Value: ₹{Number(passport.estimated_value).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Ownership Timeline */}
      {passport.ownership_history && passport.ownership_history.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
            <Clock className="h-3.5 w-3.5 inline mr-1" />
            Ownership Timeline
          </p>
          <div className="space-y-4">
            {passport.ownership_history.map((event, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-brand-green mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{event.description}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(event.date).toLocaleDateString()} • {event.event_type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Green Impact */}
      {passport.green_impact_kg && (
        <div className="bg-brand-green-light border border-brand-green/20 rounded-xl p-4 flex items-center gap-3">
          <Leaf className="h-5 w-5 text-brand-green" />
          <span className="text-sm text-brand-green-dark font-medium">
            Giving this product a second life saves {passport.green_impact_kg} kg CO₂ equivalent
          </span>
        </div>
      )}
    </div>
  )
}
