'use client'

import { useEffect, useState } from 'react'
import { Package, MapPin, Phone, Truck, CheckCircle, Key, Warehouse, Navigation } from 'lucide-react'
import api from '../../../lib/api'

function getToken() { return localStorage.getItem('sl_delivery_token') }
function partnerFetch(path) { return api.get(path, { headers: { Authorization: `Bearer ${getToken()}` } }) }
function partnerPost(path, data = {}) { return api.post(path, data, { headers: { Authorization: `Bearer ${getToken()}` } }) }

export default function ActiveDeliveryPage() {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [otpInput, setOtpInput] = useState('')
  const [otpError, setOtpError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => { fetchActive() }, [])
  useEffect(() => {
    const interval = setInterval(fetchActive, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchActive() {
    try {
      // Scan full orders for this partner's active jobs
      const [pickupRes, deliveryRes] = await Promise.allSettled([
        partnerFetch('/api/v1/full-orders/pickup-queue'),
        partnerFetch('/api/v1/full-orders/delivery-queue'),
      ])

      // Also get all full orders and filter for this partner's active ones
      // We'll use a workaround: get partner profile to know partner_id
      const partnerData = JSON.parse(localStorage.getItem('sl_delivery_partner') || '{}')
      const partnerId = partnerData.partner_id

      // Get all orders and find ones assigned to this partner that aren't completed
      const allPickups = pickupRes.status === 'fulfilled' ? pickupRes.value.data.pickups || [] : []
      const allDeliveries = deliveryRes.status === 'fulfilled' ? deliveryRes.value.data.deliveries || [] : []

      // We need to find our active order — scan all full orders
      // Use a dedicated endpoint approach: just look for any order with our partner_id
      // that's not completed. Let's try fetching all and filtering client-side.
      // This is a workaround for demo — in production you'd have a proper "my active" endpoint.

      // Actually, let's call all orders from the pickup endpoint and filter
      // The issue: pickup-queue only shows unassigned ones. We need assigned-to-us ones.
      // Let's add client-side state from the acceptance flow.

      // Check localStorage for last accepted order
      const lastAccepted = localStorage.getItem('sl_active_order_id')
      if (lastAccepted) {
        try {
          const orderRes = await api.get(`/api/v1/full-orders/${lastAccepted}`)
          const o = orderRes.data
          if (o && (
            (o.pickup_partner_id === partnerId && o.pickup_status !== 'completed') ||
            (o.delivery_partner_id === partnerId && o.delivery_status !== 'completed')
          )) {
            setOrder(o)
          } else if (o && o.pickup_status === 'completed' && o.delivery_status === 'completed') {
            localStorage.removeItem('sl_active_order_id')
            setOrder(null)
          } else {
            setOrder(o)
          }
        } catch {
          localStorage.removeItem('sl_active_order_id')
        }
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handlePickupOtp() {
    if (!otpInput || otpInput.length !== 4) { setOtpError('Enter 4-digit OTP'); return }
    setActionLoading(true)
    setOtpError('')
    try {
      const res = await partnerPost(`/api/v1/full-orders/complete-pickup?order_id=${order.order_id}&otp=${otpInput}`)
      setSuccess('Pickup verified! Product collected from seller.')
      setOtpInput('')
      // Refresh order
      const orderRes = await api.get(`/api/v1/full-orders/${order.order_id}`)
      setOrder(orderRes.data)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setOtpError(err.response?.data?.detail || 'Invalid OTP. Ask seller for the correct code.')
    } finally { setActionLoading(false) }
  }

  async function handleDeliveryOtp() {
    if (!otpInput || otpInput.length !== 4) { setOtpError('Enter 4-digit OTP'); return }
    setActionLoading(true)
    setOtpError('')
    try {
      const res = await partnerPost(`/api/v1/full-orders/complete-delivery?order_id=${order.order_id}&otp=${otpInput}`)
      setSuccess('Delivery complete! Item handed to buyer. 🎉')
      setOtpInput('')
      localStorage.removeItem('sl_active_order_id')
      const orderRes = await api.get(`/api/v1/full-orders/${order.order_id}`)
      setOrder(orderRes.data)
    } catch (err) {
      setOtpError(err.response?.data?.detail || 'Invalid OTP. Ask buyer for the correct code.')
    } finally { setActionLoading(false) }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-gray-200 border-t-amber-500 rounded-full animate-spin" /></div>

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

  // Determine which phase we're in
  const isPickupPhase = order.pickup_partner_id && order.pickup_status !== 'completed'
  const isDeliveryPhase = order.delivery_partner_id && order.delivery_status !== 'completed' && order.pickup_status === 'completed'
  const isAllDone = order.pickup_status === 'completed' && (order.delivery_status === 'completed' || order.status === 'payment_confirmed')

  return (
    <div className="max-w-md mx-auto space-y-5">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Truck className="h-5 w-5 text-amber-500" /> Active Delivery
      </h1>

      {success && (
        <div className="bg-brand-green-light border border-brand-green/20 rounded-xl p-3 text-sm text-brand-green-dark flex items-center gap-2">
          <CheckCircle className="h-4 w-4" /> {success}
        </div>
      )}

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
        </div>
      </div>

      {/* ═══ PICKUP PHASE ═══ */}
      {isPickupPhase && (
        <>
          {/* Seller Contact */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-2">
            <p className="text-xs text-gray-400 uppercase font-medium">📍 Pickup From Seller</p>
            <p className="font-medium text-gray-900">{order.seller_name}</p>
            <p className="text-sm text-gray-600 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-brand-green" />
              <a href={`tel:${order.seller_phone}`} className="text-brand-green hover:underline">{order.seller_phone}</a>
            </p>
            <p className="text-sm text-gray-600 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-gray-400" /> {order.seller_address}
            </p>
          </div>

          {/* OTP Entry for Pickup */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-600" />
              <p className="font-bold text-gray-900">Enter Seller's OTP</p>
            </div>
            <p className="text-xs text-gray-500">Ask the seller for their 4-digit pickup OTP to verify handover.</p>
            <input
              type="text" value={otpInput} maxLength={4}
              onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="● ● ● ●"
              className="w-full px-4 py-3 text-center text-3xl font-mono tracking-[0.8em] border-2 border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white"
            />
            {otpError && <p className="text-xs text-red-600 text-center">{otpError}</p>}
            <button onClick={handlePickupOtp} disabled={actionLoading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl disabled:opacity-50">
              {actionLoading ? 'Verifying...' : '✅ Verify OTP & Confirm Pickup'}
            </button>
          </div>
        </>
      )}

      {/* ═══ WAREHOUSE DROP (after pickup OTP verified) ═══ */}
      {order.pickup_status === 'completed' && !order.delivery_partner_id && !isDeliveryPhase && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center space-y-3">
          <Warehouse className="h-10 w-10 text-green-600 mx-auto" />
          <h3 className="font-bold text-gray-900">Pickup Complete!</h3>
          <p className="text-sm text-gray-600">
            Product picked up successfully. It's now at the warehouse and will be transferred to the buyer's city.
          </p>
          <p className="text-xs text-brand-green font-medium">+₹18 earned • +15 Green Credits 🌱</p>
          <a href="/delivery-portal/pickups" className="inline-block px-4 py-2 bg-amber-500 text-white rounded-lg font-medium mt-2">
            Accept More Orders
          </a>
        </div>
      )}

      {/* ═══ DELIVERY PHASE (buyer city rider) ═══ */}
      {isDeliveryPhase && (
        <>
          {/* Buyer Contact */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-2">
            <p className="text-xs text-gray-400 uppercase font-medium">📍 Deliver To Buyer</p>
            <p className="font-medium text-gray-900">{order.buyer_name}</p>
            <p className="text-sm text-gray-600 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-brand-green" />
              <a href={`tel:${order.buyer_phone}`} className="text-brand-green hover:underline">{order.buyer_phone}</a>
            </p>
            <p className="text-sm text-gray-600 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-gray-400" /> {order.buyer_address}
            </p>
          </div>

          {/* OTP Entry for Delivery */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-600" />
              <p className="font-bold text-gray-900">Enter Buyer's Delivery OTP</p>
            </div>
            <p className="text-xs text-gray-500">Ask the buyer for their 4-digit delivery OTP to complete handover.</p>
            <input
              type="text" value={otpInput} maxLength={4}
              onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="● ● ● ●"
              className="w-full px-4 py-3 text-center text-3xl font-mono tracking-[0.8em] border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white"
            />
            {otpError && <p className="text-xs text-red-600 text-center">{otpError}</p>}
            <button onClick={handleDeliveryOtp} disabled={actionLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-50">
              {actionLoading ? 'Verifying...' : '✅ Verify OTP & Complete Delivery'}
            </button>
          </div>
        </>
      )}

      {/* ═══ ALL DONE ═══ */}
      {isAllDone && (
        <div className="bg-brand-green-light border border-brand-green/20 rounded-xl p-6 text-center">
          <CheckCircle className="h-12 w-12 text-brand-green mx-auto mb-3" />
          <h3 className="font-bold text-gray-900 text-lg">Delivery Complete! 🎉</h3>
          <p className="text-sm text-gray-500 mt-1">Great job! Earnings and green credits have been credited.</p>
          <div className="flex gap-3 justify-center mt-4">
            <a href="/delivery-portal/pickups" className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium text-sm">
              More Orders
            </a>
            <a href="/delivery-portal/earnings" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm">
              View Earnings
            </a>
          </div>
        </div>
      )}

      {/* Current Status */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <p className="text-xs text-gray-400 uppercase font-medium mb-2">Order Status</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-50 rounded p-2">
            <span className="text-gray-500">Pickup:</span>{' '}
            <span className="font-medium">{order.pickup_status}</span>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <span className="text-gray-500">Delivery:</span>{' '}
            <span className="font-medium">{order.delivery_status}</span>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <span className="text-gray-500">Progress:</span>{' '}
            <span className="font-bold text-brand-green">{order.progress_pct}%</span>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <span className="text-gray-500">Route:</span>{' '}
            <span className="font-medium">{order.seller_city} → {order.buyer_city}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
