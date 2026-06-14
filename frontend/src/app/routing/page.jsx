'use client'

import { useEffect, useState } from 'react'
import { routingApi } from '../../lib/api'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { Truck, MapPin, CheckCircle, XCircle } from 'lucide-react'

export default function RoutingPortalPage() {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    fetchQueue()
  }, [])

  async function fetchQueue() {
    try {
      const res = await routingApi.getQueue()
      setQueue(res.data.routing_queue || [])
    } catch (err) {
      console.error('Routing fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRecommend(productId) {
    setActionLoading(productId)
    try {
      const res = await routingApi.recommend(productId)
      // Update the item in queue with recommendation
      setQueue(prev => prev.map(item =>
        item.product_id === productId
          ? { ...item, ...res.data, status: 'recommended' }
          : item
      ))
    } catch (err) {
      console.error('Recommend error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleApprove(productId) {
    setActionLoading(productId)
    try {
      await routingApi.approve({ product_id: productId, approved: true })
      setQueue(prev => prev.map(item =>
        item.product_id === productId ? { ...item, status: 'routed' } : item
      ))
    } catch (err) {
      console.error('Approve error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <LoadingSpinner text="Loading routing queue..." />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Truck className="h-6 w-6 text-brand-blue" />
          Routing Portal
        </h1>
        <p className="text-gray-500 mt-1">AI-powered product routing to optimal warehouses and cities</p>
      </div>

      {/* Routing Table */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="pb-3 pr-3">Product</th>
              <th className="pb-3 pr-3">Grade</th>
              <th className="pb-3 pr-3">Category</th>
              <th className="pb-3 pr-3">Current City</th>
              <th className="pb-3 pr-3">Recommended City</th>
              <th className="pb-3 pr-3">Demand</th>
              <th className="pb-3 pr-3">Warehouse</th>
              <th className="pb-3 pr-3">Status</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((item) => (
              <tr key={item.product_id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 pr-3 font-medium text-gray-800">{item.product_name}</td>
                <td className="py-3 pr-3">
                  <Badge variant={item.condition_score >= 80 ? 'green' : item.condition_score >= 50 ? 'amber' : 'red'}>
                    {item.condition_grade}
                  </Badge>
                </td>
                <td className="py-3 pr-3 text-gray-500">{item.category}</td>
                <td className="py-3 pr-3 text-gray-600">{item.current_city || '—'}</td>
                <td className="py-3 pr-3">
                  {item.recommended_city ? (
                    <span className="flex items-center gap-1 text-brand-green font-medium">
                      <MapPin className="h-3 w-3" /> {item.recommended_city}
                    </span>
                  ) : '—'}
                </td>
                <td className="py-3 pr-3">
                  {item.demand_score ? (
                    <span className="font-medium">{item.demand_score}/100</span>
                  ) : '—'}
                </td>
                <td className="py-3 pr-3 text-xs text-gray-500">{item.recommended_warehouse || '—'}</td>
                <td className="py-3 pr-3">
                  <Badge variant={item.status === 'routed' ? 'green' : item.status === 'recommended' ? 'blue' : 'gray'}>
                    {item.status}
                  </Badge>
                </td>
                <td className="py-3">
                  <div className="flex gap-1">
                    {!item.recommended_city && (
                      <button
                        onClick={() => handleRecommend(item.product_id)}
                        disabled={actionLoading === item.product_id}
                        className="px-2 py-1 text-xs bg-brand-blue text-white rounded hover:bg-brand-blue/80 disabled:opacity-50"
                      >
                        {actionLoading === item.product_id ? '...' : 'Get AI Rec'}
                      </button>
                    )}
                    {item.recommended_city && item.status !== 'routed' && (
                      <button
                        onClick={() => handleApprove(item.product_id)}
                        disabled={actionLoading === item.product_id}
                        className="px-2 py-1 text-xs bg-brand-green text-white rounded hover:bg-brand-green-dark disabled:opacity-50"
                      >
                        <CheckCircle className="h-3 w-3 inline mr-1" />
                        Approve
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {queue.length === 0 && (
          <p className="text-center py-8 text-gray-400">No products in routing queue.</p>
        )}
      </div>
    </div>
  )
}
