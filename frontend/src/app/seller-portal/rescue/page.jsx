'use client'

import { useEffect, useState } from 'react'
import { Zap, AlertTriangle, CheckCircle, ChevronRight, ArrowLeft } from 'lucide-react'
import api from '../../../lib/api'

function getSellerToken() {
  return localStorage.getItem('sl_certified_seller_token')
}
function sellerFetch(path) {
  return api.get(path, { headers: { Authorization: `Bearer ${getSellerToken()}` } })
}
function sellerPost(path, data = {}) {
  return api.post(path, data, { headers: { Authorization: `Bearer ${getSellerToken()}` } })
}

export default function RescueEnginePage() {
  const [deadItems, setDeadItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [strategies, setStrategies] = useState([])
  const [strategiesLoading, setStrategiesLoading] = useState(false)
  const [applyMsg, setApplyMsg] = useState('')

  useEffect(() => { fetchDead() }, [])

  async function fetchDead() {
    try {
      const res = await sellerFetch('/api/v1/rescue/dead-inventory')
      setDeadItems(res.data.dead_inventory || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleSelectProduct(item) {
    setSelectedProduct(item)
    setStrategies([])
    setStrategiesLoading(true)
    setApplyMsg('')
    try {
      const res = await sellerPost(`/api/v1/rescue/strategies/${item.product_id}`)
      setStrategies(res.data.strategies || [])
    } catch (err) { console.error(err) }
    finally { setStrategiesLoading(false) }
  }

  async function handleApplyStrategy(strategyId) {
    if (!selectedProduct) return
    try {
      const res = await sellerPost(`/api/v1/rescue/apply?product_id=${selectedProduct.product_id}&strategy_id=${strategyId}`)
      setApplyMsg(res.data.message)
      // Remove from dead list
      setDeadItems(prev => prev.filter(i => i.product_id !== selectedProduct.product_id))
      setTimeout(() => { setSelectedProduct(null); setStrategies([]); setApplyMsg('') }, 3000)
    } catch (err) { console.error(err) }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-gray-200 border-t-brand-green rounded-full animate-spin" /></div>

  // Strategy detail view
  if (selectedProduct && strategies.length > 0) {
    return (
      <div className="space-y-6">
        <button onClick={() => { setSelectedProduct(null); setStrategies([]) }}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Dead Inventory
        </button>

        {applyMsg && (
          <div className="bg-brand-green-light border border-brand-green/20 rounded-xl p-3 text-sm text-brand-green-dark flex items-center gap-2">
            <CheckCircle className="h-4 w-4" /> {applyMsg}
          </div>
        )}

        {/* Product header */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 flex items-center gap-4">
          <img src={selectedProduct.image_url} alt="" className="w-16 h-16 rounded-lg object-cover bg-gray-100" />
          <div className="flex-1">
            <h2 className="font-bold text-gray-900">{selectedProduct.product_name}</h2>
            <p className="text-sm text-gray-500">{selectedProduct.category} • {selectedProduct.warehouse_city} • Demand: {selectedProduct.demand_score}/100</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">₹{Number(selectedProduct.current_price || 0).toLocaleString()}</p>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{selectedProduct.status}</span>
          </div>
        </div>

        {/* 7 Strategies */}
        <div className="space-y-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">AI Rescue Strategies (7)</p>

          {strategies.map((strategy) => (
            <div key={strategy.id} className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-sm transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl">{strategy.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{strategy.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{strategy.description}</p>

                    {/* Strategy-specific details */}
                    <div className="mt-3 bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                      {strategy.id === 'cross_city' && (
                        <>
                          <p>🏙️ Best city: <strong className="text-brand-green">{strategy.recommendation.best_city}</strong> (demand: {strategy.recommendation.demand_score}/100)</p>
                          <p>📈 Increase: <strong className="text-green-600">{strategy.recommendation.increase}</strong> points</p>
                          <p>📊 Sale probability: <strong>{strategy.recommendation.sale_probability}</strong></p>
                        </>
                      )}
                      {strategy.id === 'dynamic_pricing' && (
                        <div className="space-y-1">
                          {strategy.recommendation.price_tiers.map((tier, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <span>₹{tier.price.toLocaleString()}</span>
                              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">{tier.probability} in {tier.days} days</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {strategy.id === 'bundle' && (
                        <>
                          <p>Bundle with: <strong>{strategy.recommendation.bundle_items.join(', ')}</strong></p>
                          <p>Demand increase: <strong className="text-green-600">{strategy.recommendation.expected_demand_increase}</strong></p>
                          <p>Bundle price: <strong>₹{strategy.recommendation.bundle_price.toLocaleString()}</strong></p>
                        </>
                      )}
                      {strategy.id === 'buyer_matching' && (
                        <div className="flex flex-wrap gap-2">
                          {strategy.recommendation.potential_buyers.map((b, i) => (
                            <span key={i} className="px-2 py-1 bg-brand-blue-light text-brand-blue rounded text-xs">
                              {b.profile} ({b.match_score}%)
                            </span>
                          ))}
                        </div>
                      )}
                      {strategy.id === 'rental' && (
                        <>
                          <p>Monthly rent: <strong>₹{strategy.recommendation.monthly_rent.toLocaleString()}</strong></p>
                          <p>12-month revenue: <strong className="text-brand-green">₹{strategy.recommendation.projected_12month_revenue.toLocaleString()}</strong></p>
                          <p>Suitable: <strong>{strategy.recommendation.suitable ? '✅ Yes' : '⚠️ Limited'}</strong></p>
                        </>
                      )}
                      {strategy.id === 'donation' && (
                        <>
                          <p>Partners: {strategy.recommendation.partners.map(p => p.name).join(', ')}</p>
                          <p>Green credits: <strong className="text-brand-green">+{strategy.recommendation.green_credits_earned}</strong></p>
                          <p>Tax deduction: <strong>{strategy.recommendation.tax_deduction}</strong></p>
                        </>
                      )}
                      {strategy.id === 'green_boost' && (
                        <>
                          <p>Badge: <strong>{strategy.recommendation.badge}</strong></p>
                          <p>Visibility boost: <strong className="text-brand-green">{strategy.recommendation.visibility_boost}</strong></p>
                          <p>CO₂ if landfilled: <strong className="text-red-600">{strategy.recommendation.co2_if_landfilled}kg</strong></p>
                        </>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-gray-400">
                      Impact: {strategy.impact} • Confidence: {Math.round(strategy.confidence * 100)}%
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleApplyStrategy(strategy.id)}
                  className="px-4 py-2 bg-brand-green text-white text-xs font-medium rounded-lg hover:bg-brand-green-dark flex-shrink-0 flex items-center gap-1">
                  Apply <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Dead inventory list
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="h-5 w-5 text-brand-green" /> Dead Inventory Rescue Engine
          </h1>
          <p className="text-sm text-gray-500 mt-1">AI-powered strategies to recover value from dead & returned inventory</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
          <p className="text-xs text-red-600 font-medium">{deadItems.length} items at risk</p>
        </div>
      </div>

      {strategiesLoading && (
        <div className="bg-white border border-gray-100 rounded-xl p-8 text-center">
          <div className="h-6 w-6 border-2 border-gray-200 border-t-brand-green rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">AI generating 7 rescue strategies...</p>
        </div>
      )}

      {deadItems.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          <CheckCircle className="h-12 w-12 text-brand-green mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No dead inventory! All items are healthy. 🎉</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deadItems.map(item => (
            <button
              key={item.product_id}
              onClick={() => handleSelectProduct(item)}
              className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md hover:border-brand-green/30 transition text-left"
            >
              <div className="flex items-start gap-3">
                <img src={item.image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-sm truncate">{item.product_name}</h3>
                  <p className="text-xs text-gray-400">{item.category} • {item.warehouse_city}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm font-bold text-gray-900">₹{Number(item.current_price || 0).toLocaleString()}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      item.status === 'dead' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>{item.status}</span>
                    <span className="text-[10px] text-gray-400">Demand: {item.demand_score}</span>
                  </div>
                </div>
                <Zap className="h-4 w-4 text-brand-green flex-shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
