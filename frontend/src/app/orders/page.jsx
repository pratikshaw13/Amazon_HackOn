'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fullOrdersApi } from '../../lib/api'
import { Package, Clock, Truck, CheckCircle } from 'lucide-react'

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const res = await fullOrdersApi.buyerOrders()
        setOrders(res.data.orders || [])
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetch()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-gray-200 border-t-brand-green rounded-full animate-spin" /></div>

  const statusInfo = {
    order_placed: { label: 'Order Placed', color: 'bg-blue-100 text-blue-700', icon: '🛒' },
    pickup_assigned: { label: 'Pickup Assigned', color: 'bg-amber-100 text-amber-700', icon: '🚴' },
    picked_up_from_seller: { label: 'Picked Up', color: 'bg-purple-100 text-purple-700', icon: '📦' },
    at_seller_warehouse: { label: 'At Warehouse', color: 'bg-indigo-100 text-indigo-700', icon: '🏭' },
    inter_city_transit: { label: 'In Transit', color: 'bg-sky-100 text-sky-700', icon: '✈️' },
    at_buyer_warehouse: { label: 'At Your City', color: 'bg-teal-100 text-teal-700', icon: '🏭' },
    delivery_assigned: { label: 'Out for Delivery', color: 'bg-amber-100 text-amber-700', icon: '🚴' },
    delivery_in_transit: { label: 'Delivering', color: 'bg-orange-100 text-orange-700', icon: '🚴' },
    delivered_to_buyer: { label: 'Delivered — Pay Now', color: 'bg-green-100 text-green-700', icon: '✅' },
    payment_confirmed: { label: 'Completed', color: 'bg-brand-green-light text-brand-green', icon: '🎉' },
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Package className="h-5 w-5" /> My Orders
      </h1>

      {orders.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No orders yet. Browse the marketplace!</p>
          <Link href="/marketplace" className="text-brand-green text-sm hover:underline mt-2 inline-block">
            Go to Marketplace →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const info = statusInfo[order.status] || statusInfo.order_placed
            const progress = order.progress_pct || 0

            return (
              <Link key={order.order_id} href={`/orders/${order.order_id}`}
                className="block bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {order.product_image?.startsWith('http') ? (
                      <img src={order.product_image} alt="" className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 text-sm">{order.product_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${info.color}`}>
                        {info.icon} {info.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    {/* Mini progress bar */}
                    <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-brand-green rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">₹{Number(order.price || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400">{progress}%</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
