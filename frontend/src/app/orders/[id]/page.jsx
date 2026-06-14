'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { fullOrdersApi } from '../../../lib/api'
import { Package, Truck, MapPin, Clock, CheckCircle, CreditCard, ArrowLeft } from 'lucide-react'
import api from '../../../lib/api'

const TrackingMap = dynamic(() => import('../../../components/features/TrackingMap'), { ssr: false })

const STEPS = [
  { id: 'order_placed', label: 'Order Placed', icon: '🛒', pct: 5 },
  { id: 'pickup_assigned', label: 'Pickup Partner Assigned', icon: '🚴', pct: 15 },
  { id: 'picked_up_from_seller', label: 'Picked Up from Seller', icon: '📦', pct: 35 },
  { id: 'at_seller_warehouse', label: 'At Seller Warehouse', icon: '🏭', pct: 45 },
  { id: 'inter_city_transit', label: 'Inter-City Transit', icon: '✈️', pct: 55 },
  { id: 'at_buyer_warehouse', label: 'At Your City Warehouse', icon: '🏭', pct: 65 },
  { id: 'delivery_assigned', label: 'Delivery Partner Assigned', icon: '🚴', pct: 75 },
  { id: 'delivered_to_buyer', label: 'Delivered', icon: '🎉', pct: 95 },
  { id: 'payment_confirmed', label: 'Payment Confirmed', icon: '✅', pct: 100 },
]

export default function OrderTrackingPage() {
  const params = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState('UPI')
  const [paymentRef, setPaymentRef] = useState('')
  const [payMsg, setPayMsg] = useState('')

  useEffect(() => { fetchOrder() }, [])
  useEffect(() => {
    const interval = setInterval(fetchOrder, 8000) // Auto-refresh
    return () => clearInterval(interval)
  }, [])

  async function fetchOrder() {
    try {
      const res = await fullOrdersApi.getOrder(params.id)
      setOrder(res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handlePayment() {
    if (!paymentRef.trim()) return
    try {
      const res = await fullOrdersApi.confirmPayment({
        order_id: params.id,
        payment_method: paymentMethod,
        payment_reference: paymentRef,
      })
      setPayMsg(res.data.message)
      fetchOrder()
    } catch (err) {
      setPayMsg(err.response?.data?.detail || 'Payment confirmation failed')
    }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-gray-200 border-t-brand-green rounded-full animate-spin" /></div>
  if (!order) return <p className="text-center py-12 text-gray-500">Order not found</p>

  const progress = order.progress_pct || 0
  const currentStepIdx = STEPS.findIndex(s => s.id === order.status)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <a href="/orders" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Orders
      </a>

      {/* Status Notification Banner */}
      {order.status === 'order_placed' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
          🛒 Order placed! Waiting for a delivery partner to pick up from seller...
        </div>
      )}
      {order.status === 'pickup_assigned' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
          🚴 Delivery partner <strong>{order.pickup_partner_name}</strong> is heading to pick up your item!
        </div>
      )}
      {(order.status === 'at_seller_warehouse' || order.status === 'inter_city_transit') && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-sm text-indigo-700">
          ✈️ Your package is in transit from {order.seller_city} to {order.buyer_city}...
        </div>
      )}
      {order.status === 'at_buyer_warehouse' && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-sm text-teal-700">
          🏭 Package arrived at {order.buyer_city} warehouse! A delivery rider will be assigned soon.
        </div>
      )}
      {order.status === 'delivery_assigned' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
          🚴 Rider <strong>{order.delivery_partner_name}</strong> is assigned! Keep your delivery OTP ready.
        </div>
      )}
      {order.status === 'delivered_to_buyer' && !order.payment_done && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
          🎉 Item delivered! Please confirm your payment below to complete the order.
        </div>
      )}

      {/* Product + Status */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden">
          {order.product_image?.startsWith('http') ? (
            <img src={order.product_image} alt="" className="w-full h-full object-cover" />
          ) : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-gray-900">{order.product_name}</h2>
          <p className="text-sm text-gray-500">{order.category} • ₹{Number(order.price || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Order: {order.order_id}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Delivery Progress</p>
          <span className="text-sm font-bold text-brand-green">{progress}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-green rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {order.is_intercity ? `${order.seller_city} → ${order.buyer_city}` : `Within ${order.buyer_city}`}
          {' '} • Est: {order.is_intercity ? '2-4 days' : 'Same day'}
        </p>
      </div>

      {/* Steps */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <p className="text-xs text-gray-400 uppercase font-medium mb-4">Order Timeline</p>
        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const isDone = i <= currentStepIdx
            const isCurrent = i === currentStepIdx
            if (!order.is_intercity && step.id === 'inter_city_transit') return null
            return (
              <div key={step.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                  isDone ? 'bg-green-100' : 'bg-gray-100'
                } ${isCurrent ? 'ring-2 ring-brand-green ring-offset-1' : ''}`}>
                  {isDone ? '✓' : step.icon}
                </div>
                <div className="flex-1">
                  <span className={`text-sm ${isDone ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{step.label}</span>
                </div>
                {isCurrent && <span className="text-xs bg-brand-green-light text-brand-green px-2 py-0.5 rounded-full">Current</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Delivery Partner Info (if assigned) */}
      {order.delivery_partner_name && order.status !== 'payment_confirmed' && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
          <Truck className="h-8 w-8 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{order.delivery_partner_name}</p>
            <p className="text-xs text-gray-500">Your delivery partner</p>
          </div>
          {order.delivery_partner_phone && (
            <a href={`tel:${order.delivery_partner_phone}`} className="px-3 py-1.5 bg-brand-green-light text-brand-green text-xs font-medium rounded-lg">
              Call
            </a>
          )}
        </div>
      )}

      {/* Pickup Partner Info (if assigned, for buyer awareness) */}
      {order.pickup_partner_name && !order.delivery_partner_name && order.status !== 'payment_confirmed' && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
          <Truck className="h-8 w-8 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{order.pickup_partner_name}</p>
            <p className="text-xs text-gray-500">Picking up from seller</p>
          </div>
        </div>
      )}

      {/* Delivery OTP — shown once delivery partner is assigned */}
      {order.delivery_otp && order.delivery_partner_id && order.status !== 'payment_confirmed' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Your Delivery OTP</p>
          <p className="text-3xl font-bold tracking-widest text-amber-600">{order.delivery_otp}</p>
          <p className="text-xs text-gray-500 mt-2">Share this with the delivery partner when they arrive.</p>
        </div>
      )}

      {/* Live Map (if partner location available) */}
      {(order.pickup_partner_id || order.delivery_partner_id) && order.seller_lat && (
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase font-medium mb-2">Live Tracking</p>
          <div className="h-44 rounded-lg overflow-hidden border border-gray-200">
            <TrackingMap
              partnerLat={parseFloat(order.seller_lat)}
              partnerLng={parseFloat(order.seller_lng)}
              partnerName={order.pickup_partner_name || order.delivery_partner_name || 'Partner'}
            />
          </div>
        </div>
      )}

      {/* Payment Confirmation (shown after delivery) */}
      {order.status === 'delivered_to_buyer' && !order.payment_done && (
        <div className="bg-white border-2 border-brand-green/20 rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-brand-green" /> Confirm Payment
          </h3>
          <p className="text-sm text-gray-500">Product delivered! Please confirm your payment to complete the order.</p>

          <div className="space-y-3">
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-green">
              <option value="UPI">UPI (Google Pay / PhonePe)</option>
              <option value="Net Banking">Net Banking</option>
              <option value="Amazon Pay">Amazon Pay</option>
              <option value="COD">Cash on Delivery</option>
            </select>
            <input type="text" value={paymentRef} onChange={e => setPaymentRef(e.target.value)}
              placeholder="Transaction ID / Reference"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-green" />
            <button onClick={handlePayment}
              className="w-full py-3 bg-brand-green hover:bg-brand-green-dark text-white font-semibold rounded-xl">
              ✅ Payment Done — Confirm Order
            </button>
          </div>
          {payMsg && <p className="text-sm text-center text-brand-green font-medium">{payMsg}</p>}
        </div>
      )}

      {/* Order Complete */}
      {order.status === 'payment_confirmed' && (
        <div className="bg-brand-green-light border border-brand-green/20 rounded-xl p-6 text-center">
          <CheckCircle className="h-10 w-10 text-brand-green mx-auto mb-2" />
          <h3 className="font-bold text-gray-900 text-lg">Order Complete!</h3>
          <p className="text-sm text-gray-500 mt-1">Thank you for your purchase. +30 Green Credits earned! 🌱</p>
        </div>
      )}
    </div>
  )
}
