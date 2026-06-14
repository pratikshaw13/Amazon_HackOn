'use client'

import { useEffect, useState } from 'react'
import { Package, MapPin, Phone, Truck, CheckCircle, Key, Navigation } from 'lucide-react'
import api from '../../../lib/api'

function getToken() { return localStorage.getItem('sl_delivery_token') }
function partnerPost(path, data = {}) { return api.post(path, data, { headers: { Authorization: `Bearer ${getToken()}` } }) }

export default function ActiveDeliveryPage() {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [otpInput, setOtpInput] = useState('')
  const [otpError, setOtpError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => { fetchActive() }, [])

  async function fetchActive() {
    const orderId = localStorage.getItem('sl_active_order_id')
    if (!orderId) { setLoading(false); return }
    try {
      const res = await api.get(`/api/v1/full-orders/${orderId}`)
      setOrder(res.data)
      // Check if already completed
      if (res.data.status === 'payment_confirmed' || (res.data.pickup_status === 'completed' && res.data.delivery_status === 'completed')) {
        setCompleted(true)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  // Determine phase
  const partnerData = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('sl_delivery_partner') || '{}') : {}
  const isPickupRider = order?.pickup_partner_id === partnerData.partner_id && order?.pickup_status !== 'completed'
  const isDeliveryRider = order?.delivery_partner_id === partnerData.partner_id && order?.delivery_status !== 'completed'

  async function handleVerifyOtp() {
    if (!otpInput || otpInput.length !== 4) { setOtpError('Enter the 4-digit OTP from the seller/buyer'); return }
    setActionLoading(true)
    setOtpError('')
    try {
      if (isPickupRider) {
        await partnerPost(`/api/v1/full-orders/complete-pickup?order_id=${order.order_id}&otp=${otpInput}`)
      } else if (isDeliveryRider) {
        await partnerPost(`/api/v1/full-orders/complete-delivery?order_id=${order.order_id}&otp=${otpInput}`)
      }
      setOtpVerified(true)
      setOtpInput('')
    } catch (err) {
      setOtpError(err.response?.data?.detail || 'Wrong OTP. Please ask again.')
    } finally { setActionLoading(false) }
  }

  function handleOrderCompleted() {
    setCompleted(true)
    localStorage.removeItem('sl_active_order_id')
  }

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-gray-200 border-t-amber-500 rounded-full animate-spin" /></div>

  // No active order
  if (!order) {
    return (
      <div className="text-center py-16">
        <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Delivery</h2>
        <p className="text-gray-500 mb-4">Accept a pickup from Available Orders to start.</p>
        <a href="/delivery-portal/pickups" className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium inline-block">
          View Available Orders
        </a>
      </div>
    )
  }

  // Order completed
  if (completed) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <CheckCircle className="h-16 w-16 text-brand-green mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Completed! 🎉</h2>
        <p className="text-gray-500 mb-2">Great job! Your earnings and green credits have been credited.</p>
        <p className="text-brand-green font-medium">+₹18 earned • +15 Green Credits 🌱</p>
        <div className="flex gap-3 justify-center mt-6">
          <a href="/delivery-portal/pickups" className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium">
            More Orders
          </a>
          <a href="/delivery-portal/earnings" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium">
            View Earnings
          </a>
        </div>
      </div>
    )
  }

  // OTP verified → show "Order Completed" button
  if (otpVerified) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-brand-green-light border border-brand-green/20 rounded-xl p-4 text-center">
          <CheckCircle className="h-8 w-8 text-brand-green mx-auto mb-2" />
          <p className="font-medium text-brand-green-dark">OTP Verified Successfully! ✅</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden">
            {order.product_image?.startsWith('http') ? (
              <img src={order.product_image} alt="" className="w-full h-full object-cover" />
            ) : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{order.product_name}</h3>
            <p className="text-xs text-gray-500">{order.order_id}</p>
          </div>
        </div>

        <button
          onClick={handleOrderCompleted}
          className="w-full py-4 bg-brand-green hover:bg-brand-green-dark text-white text-lg font-bold rounded-xl transition shadow-lg"
        >
          ✅ Order Completed
        </button>
      </div>
    )
  }

  // Active delivery — show contact + OTP input (rider does NOT see the OTP value)
  return (
    <div className="max-w-md mx-auto space-y-5">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Truck className="h-5 w-5 text-amber-500" /> Active Delivery
      </h1>

      {/* Product Info */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
        <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden">
          {order.product_image?.startsWith('http') ? (
            <img src={order.product_image} alt="" className="w-full h-full object-cover" />
          ) : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{order.product_name}</h3>
          <p className="text-xs text-gray-500">{order.order_id} • ₹{Number(order.price || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-400">{order.seller_city} → {order.buyer_city}</p>
        </div>
      </div>

      {/* Contact Card */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-2">
        <p className="text-xs text-gray-400 uppercase font-medium">
          {isPickupRider ? '📍 Pickup From Seller' : '📍 Deliver To Buyer'}
        </p>
        <p className="font-medium text-gray-900">
          {isPickupRider ? order.seller_name : order.buyer_name}
        </p>
        <p className="text-sm text-gray-600 flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 text-brand-green" />
          <a href={`tel:${isPickupRider ? order.seller_phone : order.buyer_phone}`} className="text-brand-green hover:underline">
            {isPickupRider ? order.seller_phone : order.buyer_phone}
          </a>
        </p>
        <p className="text-sm text-gray-600 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-gray-400" />
          {isPickupRider ? order.seller_address : order.buyer_address}
        </p>
      </div>

      {/* OTP Input — Rider enters what seller/buyer tells them verbally */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-amber-600" />
          <p className="font-bold text-gray-900">Enter OTP</p>
        </div>
        <p className="text-xs text-gray-600">
          Ask the <strong>{isPickupRider ? 'seller' : 'buyer'}</strong> to tell you the 4-digit OTP code. Enter it below to verify.
        </p>
        <input
          type="text" value={otpInput} maxLength={4}
          onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="● ● ● ●"
          className="w-full px-4 py-3 text-center text-3xl font-mono tracking-[0.8em] border-2 border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
        />
        {otpError && <p className="text-xs text-red-600 text-center">{otpError}</p>}
        <button onClick={handleVerifyOtp} disabled={actionLoading || otpInput.length !== 4}
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl disabled:opacity-50 transition">
          {actionLoading ? 'Verifying...' : 'Verify OTP'}
        </button>
      </div>
    </div>
  )
}
