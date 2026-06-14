'use client'

import { useEffect, useState } from 'react'
import { Truck, MapPin, ArrowRight, CheckCircle, Zap, TrendingUp } from 'lucide-react'
import api from '../../../lib/api'

function getSellerToken() {
  return localStorage.getItem('sl_certified_seller_token')
}

function sellerFetch(path) {
  return api.get(path, { headers: { Authorization: `Bearer ${getSellerToken()}` } })
}

function sellerPost(path, data) {
  return api.post(path, data, { headers: { Authorization: `Bearer ${getSellerToken()}` } })
}

export default function SellerRoutingPage() {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [detailProduct, setDetailProduct] = useState(null)
  const [recommendations, setRecommendations] = useState(null)

  useEffect(() => { fetchQueue() }, [])

  async function fetchQueue() {
    try {
      const res = await sellerFetch('/api/v1/seller-routing/queue')
      setQueue(res.data.routing_queue || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleGetRecommendation(productId) {
    setActionLoading(productId)
    try {
      const res = await sellerPost(`/api/v1/seller-routing/recommend/${productId}`)
      setDetailProduct(res.data)
      setRecommendations(res.data.recommendations || [])
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleApprove(productId, targetCity) {
    setActionLoading(productId)
    try {
      const res = await sellerPost('/api/v1/seller-routing/approve', {
        product_id: productId,
        target_city: targetCity,
      })
      setSuccessMsg(res.data.message)
      setDetailProduct(null)
      setRecommendations(null)
      fetchQueue()
      setTimeout(() => setSuccessMsg(''), 5000)
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-gray-200 border-t-brand-green rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Truck className="h-5 w-5" /> Warehouse Routing Engine
        </h1>
        <span className="text-sm text-gray-400">{queue.length} products in queue</span>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="bg-brand-green-light border border-brand-green/20 rounded-xl p-3 text-sm text-brand-green-dark flex items-center gap-2">
          <CheckCircle className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {/* AI Recommendation Detail Panel */}
      {detailProduct && recommendations && (
        <div className="bg-white border-2 border-brand-blue/20 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">{detailProduct.product_name}</h2>
              <p className="text-sm text-gray-500">{detailProduct.category} • Currently in {detailProduct.current_city} (demand: {detailProduct.current_demand})</p>
            </div>
            <button onClick={() => { setDetailProduct(null); setRecommendations(null) }}
              className="text-xs text-gray-400 hover:text-gray-600">Close ✕</button>
          </div>

          <p className="text-sm text-brand-blue bg-brand-blue-light p-3 rounded-lg">
            🤖 {detailProduct.ai_summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recommendations.map((rec, i) => (
              <div key={i} className={`border rounded-xl p-4 ${i === 0 ? 'border-brand-green bg-brand-green-light/30' : 'border-gray-100'}`}>
                {i === 0 && <span className="text-xs font-medium text-brand-green bg-brand-green-light px-2 py-0.5 rounded-full mb-2 inline-block">Best Option</span>}
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-brand-blue" />
                  <span className="font-bold text-gray-900">{rec.city}</span>
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <p>Demand: <strong className="text-brand-green">{rec.demand_score}/100</strong> ({rec.demand_level})</p>
                  <p>Increase: <strong className="text-green-600">+{rec.demand_increase}</strong> points</p>
                  <p>Sale probability: <strong>{rec.sale_probability}%</strong></p>
                  <p>Expected sale: <strong>{rec.expected_days_to_sell} days</strong></p>
                  {rec.reasoning && <p className="text-gray-400 mt-1">{rec.reasoning}</p>}
                </div>
                <button
                  onClick={() => handleApprove(detailProduct.product_id, rec.city)}
                  disabled={actionLoading === detailProduct.product_id}
                  className="mt-3 w-full py-2 bg-brand-green text-white text-xs font-medium rounded-lg hover:bg-brand-green-dark disabled:opacity-50 flex items-center justify-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Approve Route
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Routing Queue Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs text-gray-400 uppercase">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Current City</th>
                <th className="px-4 py-3">Demand</th>
                <th className="px-4 py-3">→</th>
                <th className="px-4 py-3">Recommended City</th>
                <th className="px-4 py-3">New Demand</th>
                <th className="px-4 py-3">Boost</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {queue.map(item => (
                <tr key={item.product_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img src={item.image_url} alt="" className="w-8 h-8 rounded object-cover bg-gray-100" />
                      <span className="font-medium text-gray-800 truncate max-w-[140px]">{item.product_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.current_city}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold text-red-600">{item.current_demand}</span>
                  </td>
                  <td className="px-4 py-3"><ArrowRight className="h-4 w-4 text-gray-300" /></td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-brand-green flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {item.recommended_city}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold text-green-600">{item.recommended_demand}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                      {item.sale_probability_boost}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.status === 'dead' ? 'bg-red-100 text-red-700' :
                      item.status === 'returned' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>{item.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleGetRecommendation(item.product_id)}
                      disabled={actionLoading === item.product_id}
                      className="px-3 py-1.5 bg-brand-blue text-white text-xs rounded-lg hover:bg-brand-blue/80 disabled:opacity-50 flex items-center gap-1">
                      {actionLoading === item.product_id ? '...' : <><Zap className="h-3 w-3" /> AI Route</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {queue.length === 0 && (
          <p className="text-center py-8 text-gray-400 text-sm">No products in routing queue.</p>
        )}
      </div>
    </div>
  )
}
