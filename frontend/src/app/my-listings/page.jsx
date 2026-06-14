'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Package, Truck, Clock, CheckCircle, MapPin, Phone, User, DollarSign } from 'lucide-react'
import { fullOrdersApi } from '../../lib/api'
import api from '../../lib/api'

const TrackingMap = dynamic(() => import('../../components/features/TrackingMap'), { ssr: false })

export default function MyListingsPage() {
  const [sellerOrders, setSellerOrders] = useState([])
  const [deliveryOrders, setDeliveryOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => { fetchAll() }, [])
  useEffect(() => {
    const interval = setInterval(fetchAll, 10000)
    return () => clearInterval(interval)
  }, [])

  async function fetchAll() {
    try {
      const [sellerRes, deliveryRes] = await Promise.allSettled([
        fullOrdersApi.sellerOrders(),
        api.get('/api/v1/delivery-orders/my-listings'),
      ])
      if (sellerRes.status === 'fulfilled') setSellerOrders(sellerRes.value.data.orders || [])
      if (deliveryRes.status === 'fulfilled') setDeliveryOrders(deliveryRes.value.data.orders || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-gray-200 border-t-brand-green rounded-full animate-spin" /></div>

  const allOrders = [...sellerOrders, ...deliveryOrders]

  const statusInfo = {
    order_placed: { label: 'Buyer Found!', color: 'bg-blue-100 text-blue-700' },
    pickup_assigned: { label: 'Partner Coming', color: 'bg-amber-100 text-amber-700' },
    picked_up_from_seller: { label: 'Picked Up', color: 'bg-purple-100 text-purple-700' },
    at_seller_warehouse: { label: 'At Warehouse', color: 'bg-indigo-100 text-indigo-700' },
    inter_city_transit: { label: 'In Transit', color: 'bg-sky-100 text-sky-700' },
    at_buyer_warehouse: { label: 'At Buyer City', color: 'bg-teal-100 text-teal-700' },
    delivery_assigned: { label: 'Out for Delivery', color: 'bg-amber-100 text-amber-700' },
    delivered_to_buyer: { label: 'Delivered!', color: 'bg-green-100 text-green-700' },
    payment_confirmed: { label: 'Payment Received ✅', color: 'bg-brand-green-light text-brand-green' },
    pending: { label: 'Awaiting Pickup', color: 'bg-gray-100 text-gray-600' },
    accepted: { label: 'Partner Assigned', color: 'bg-blue-100 text-blue-700' },
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="h-5 w-5" /> My Listed Products
        </h1>
        <span className="text-sm text-gray-400">{allOrders.length} items</span>
      </div>

      {allOrders.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No products listed yet.</p>
          <Link href="/sell" className="text-brand-green text-sm hover:underline mt-2 inline-block">List a Product →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {allOrders.map(order => {
            const orderId = order.order_id
            const status = order.status || 'pending'
            const info = statusInfo[status] || statusInfo.pending
            const progress = order.progress_pct || 0
            const isExpanded = expandedId === orderId
            const hasPickupPartner = order.pickup_partner_name

            return (
              <div key={orderId} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : orderId)}
                  className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50 transition">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {order.product_image?.startsWith('http') ? (
                      <img src={order.product_image} alt="" className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 text-sm">{order.product_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${info.color}`}>{info.label}</span>
                      {progress > 0 && <span className="text-[10px] text-gray-400">{progress}%</span>}
                    </div>
                    {progress > 0 && (
                      <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-brand-green rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    )}
                  </div>
                  {order.price && (
                    <span className="text-sm font-bold text-brand-green flex-shrink-0">₹{Number(order.price).toLocaleString()}</span>
                  )}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                    {/* Status notification for seller */}
                    {status === 'order_placed' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-700">
                        🎉 A buyer wants your product! Waiting for delivery partner to pick up...
                      </div>
                    )}
                    {status === 'pickup_assigned' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-700">
                        🚴 Rider <strong>{order.pickup_partner_name}</strong> is on the way! Have your OTP ready.
                      </div>
                    )}
                    {(status === 'at_seller_warehouse' || status === 'inter_city_transit' || status === 'at_buyer_warehouse') && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-xs text-green-700">
                        ✅ Picked up! Your item is on its way to the buyer.
                      </div>
                    )}
                    {status === 'payment_confirmed' && (
                      <div className="bg-brand-green-light border border-brand-green/20 rounded-lg p-2.5 text-xs text-brand-green-dark">
                        💰 Payment received! +50 Green Credits earned.
                      </div>
                    )}

                    {/* Pickup OTP (show to seller) */}
                    {order.pickup_otp && status !== 'payment_confirmed' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Pickup OTP (share with delivery partner)</p>
                        <p className="text-2xl font-bold tracking-widest text-amber-600">{order.pickup_otp}</p>
                      </div>
                    )}

                    {/* Pickup partner */}
                    {hasPickupPartner && (
                      <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-100">
                        <Truck className="h-5 w-5 text-amber-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{order.pickup_partner_name}</p>
                          <p className="text-xs text-gray-500">Pickup Partner</p>
                        </div>
                        {order.pickup_partner_phone && (
                          <a href={`tel:${order.pickup_partner_phone}`} className="text-xs text-brand-green font-medium">Call</a>
                        )}
                      </div>
                    )}

                    {/* Buyer info (if order exists) */}
                    {order.buyer_name && (
                      <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-100">
                        <User className="h-5 w-5 text-brand-blue" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Buyer: {order.buyer_name}</p>
                          <p className="text-xs text-gray-500">{order.buyer_city}</p>
                        </div>
                      </div>
                    )}

                    {/* Expand Search Area — for local-only unsold items */}
                    {order.listing_scope === 'local' && status !== 'payment_confirmed' && status !== 'sold' && (
                      <ExpandAreaButton productId={order.product_id} />
                    )}

                    {/* Timeline */}
                    {order.timeline && order.timeline.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs text-gray-400 font-medium uppercase">Timeline</p>
                        {order.timeline.slice().reverse().slice(0, 5).map((ev, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-green mt-1.5 flex-shrink-0" />
                            <span className="text-gray-600">{ev.note}</span>
                            <span className="text-gray-300 ml-auto flex-shrink-0">
                              {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ExpandAreaButton({ productId }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleExpand() {
    setLoading(true)
    try {
      const res = await api.post(`/api/v1/marketplace/expand-area/${productId}`)
      if (res.data.listing_scope === 'regional') {
        setExpanded(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (expanded) {
    return (
      <div className="bg-brand-blue-light border border-brand-blue/20 rounded-lg p-2.5 text-xs text-brand-blue text-center">
        🌐 Search area expanded to neighbouring cities!
      </div>
    )
  }

  return (
    <button
      onClick={handleExpand}
      disabled={loading}
      className="w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-700 hover:bg-amber-100 transition disabled:opacity-50 text-center"
    >
      {loading ? 'Expanding...' : '🌐 Expand search area to neighbouring cities (Green Credits: +30 instead of +50)'}
    </button>
  )
}
