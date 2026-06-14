'use client'

import { useEffect, useState } from 'react'
import { Clock, Package, CheckCircle, MapPin, Leaf } from 'lucide-react'
import api from '../../../lib/api'

function getToken() { return localStorage.getItem('sl_delivery_token') }

export default function HistoryPage() {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.get('/api/v1/delivery-partner/history', {
          headers: { Authorization: `Bearer ${getToken()}` }
        })
        setDeliveries(res.data.deliveries || [])
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetch()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-gray-200 border-t-amber-500 rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Clock className="h-5 w-5" /> Delivery History
        </h1>
        <span className="text-sm text-gray-400">{deliveries.length} completed</span>
      </div>

      {deliveries.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No completed deliveries yet.</p>
          <a href="/delivery-portal/pickups" className="text-amber-500 text-sm hover:underline mt-2 inline-block">
            Accept your first pickup →
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map(order => (
            <div key={order.order_id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900">{order.product_name}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {order.seller_city}
                  </span>
                  <span className="text-xs text-gray-300">|</span>
                  <span className="text-xs text-gray-400">
                    {order.completed_at ? new Date(order.completed_at).toLocaleDateString() : '—'}
                  </span>
                  <span className="text-xs text-gray-300">|</span>
                  <span className="text-xs text-gray-400">{order.distance_km || '?'}km</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-green-600">₹{order.earning}</p>
                <p className="text-xs text-brand-green flex items-center gap-0.5 justify-end">
                  <Leaf className="h-3 w-3" /> +{order.green_credits}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
