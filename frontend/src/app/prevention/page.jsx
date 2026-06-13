'use client'

import { useState } from 'react'
import { preventionApi } from '../../lib/api'
import Badge from '../../components/ui/Badge'
import { CATEGORIES } from '../../lib/constants'
import { Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react'

export default function PreventionPage() {
  const [productName, setProductName] = useState('')
  const [category, setCategory] = useState('Electronics')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  // Demo user history
  const userHistory = ['Laptop', 'Headphones', 'Monitor', 'Keyboard', 'Mouse', 'Webcam']

  const handleCheck = async () => {
    if (!productName) return
    setLoading(true)
    try {
      const res = await preventionApi.check({
        product_name: productName,
        category,
        user_history: userHistory
      })
      setResult(res.data)
    } catch (err) {
      console.error('Prevention check error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (score) => {
    if (score <= 40) return '#1D9E75'
    if (score <= 60) return '#EF9F27'
    return '#E24B4A'
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-blue-light mb-4">
          <Shield className="h-8 w-8 text-brand-blue" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Return Shield</h1>
        <p className="text-gray-500 mt-1 max-w-md mx-auto">
          AI-powered return risk prediction. Check if a product is likely to be returned based on purchase patterns.
        </p>
      </div>

      {/* Input */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-widest mb-1.5">
              Product Name
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g., Sony WH-1000XM5 Headphones"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-widest mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue"
            >
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={handleCheck}
          disabled={loading || !productName}
          className="w-full py-3 bg-brand-blue text-white font-semibold rounded-xl hover:bg-brand-blue/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Check Return Risk'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-5">
          {/* Risk Meter */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Return Risk Score</p>
            <div className="relative">
              <div className="w-full h-4 rounded-full overflow-hidden"
                style={{ background: 'linear-gradient(to right, #1D9E75, #EF9F27, #E24B4A)' }}>
              </div>
              <div
                className="absolute top-0 w-1 h-6 bg-gray-900 rounded -translate-y-1"
                style={{ left: `${result.return_risk_score}%`, transition: 'left 0.8s ease-out' }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-400">Low (0)</span>
              <span className="text-xs text-gray-400">Medium (50)</span>
              <span className="text-xs text-gray-400">High (100)</span>
            </div>
            <div className="text-center mt-3">
              <span className="text-3xl font-bold" style={{ color: getRiskColor(result.return_risk_score) }}>
                {result.return_risk_score}%
              </span>
              <Badge variant={result.risk_level === 'Low' ? 'green' : result.risk_level === 'Medium' ? 'amber' : 'red'} className="ml-2">
                {result.risk_level} Risk
              </Badge>
            </div>
          </div>

          {/* Risk Reasons */}
          {result.risk_reasons && result.risk_reasons.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">Risk Factors</p>
              <ul className="space-y-2">
                {result.risk_reasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <AlertTriangle className="h-4 w-4 text-brand-amber flex-shrink-0 mt-0.5" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">Recommendations</p>
              <ul className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-brand-green flex-shrink-0 mt-0.5" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Alternative */}
          {result.alternative_suggestion && (
            <div className="p-3 bg-brand-blue-light rounded-lg flex items-start gap-2">
              <Info className="h-4 w-4 text-brand-blue flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">
                <strong className="text-brand-blue">Alternative: </strong>
                {result.alternative_suggestion}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
