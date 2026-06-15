'use client'

import { useEffect, useState } from 'react'
import { Package, MapPin, Phone, Truck, CheckCircle, Key, Navigation, Warehouse } from 'lucide-react'
import api from '../../../lib/api'

function getToken() { return localStorage.getItem('sl_delivery_token') }
function partnerPost(path, data = {}) { return api.post(path, data, { headers: { Authorization: `Bearer ${getToken()}` } }) }
function partnerFetch(path) { return api.get(path, { headers: { Authorization: `Bearer ${getToken()}` } }) }

export default function ActiveDeliveryPage() {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [otpInput, setOtpInput] = useState('')
  const [otpError, setOtpError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [completed, setCompleted] = useState(false)

  // Return-specific states
  const [isReturnOrder, setIsReturnOrder] = useState(false)
  const [returnPhase, setReturnPhase] = useState('pickup') // 'pickup' | 'drop_at_warehouse'
  const [warehouseInfo, setWarehouseInfo] = useState(null)

  useEffect(() => { fetchActive() }, [])

  async function fetchActive() {
    // Check for active return first
    const returnId = localStorage.getItem('sl_active_return_id')
    if (returnId) {
      try {
        const res = await partnerFetch(`/api/v1/returns/${returnId}`)
        setOrder(res.data)
        setIsReturnOrder(true)
        // Determine phase based on status
        if (res.data.status === 'picked_up') {
          setReturnPhase('drop_at_warehouse')
          setWarehouseInfo({
            id: res.data.warehouse_id,
            city: res.data.warehouse_city,
            address: res.data.warehouse_address,
          })
        } else if (res.data.status === 'at_warehouse') {
          setCompleted(true)
        }
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
      return
    }

    // Otherwise check for normal order
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

  // Determine phase for normal orders
  const partnerData = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('sl_delivery_partner') || '{}') : {}
  const isPickupRider = !isReturnOrder && order?.pickup_partner_id === partnerData.partner_id && order?.pickup_status !== 'completed'
  const isDeliveryRider = !isReturnOrder && order?.delivery_partner_id === partnerData.partner_id && order?.delivery_status !== 'completed'

  async function handleVerifyOtp() {
    if (!otpInput || otpInput.length !== 4) { setOtpError('Enter the 4-digit OTP from the seller/buyer'); return }
    setActionLoading(true)
    setOtpError('')
    try {
      if (isReturnOrder) {
        // Return OTP verification — pickup from customer
        const res = await partnerPost(`/api/v1/returns/complete-pickup?return_id=${order.return_id}&otp=${otpInput}`)
        setOtpVerified(true)
        setReturnPhase('drop_at_warehouse')
        setWarehouseInfo(res.data.warehouse)
        setOtpInput('')
      } else if (isPickupRider) {
        await partnerPost(`/api/v1/full-orders/complete-pickup?order_id=${order.order_id}&otp=${otpInput}`)
        setOtpVerified(true)
        setOtpInput('')
      } else if (isDeliveryRider) {
        await partnerPost(`/api/v1/full-orders/complete-delivery?order_id=${order.order_id}&otp=${otpInput}`)
        setOtpVerified(true)
        setOtpInput('')
      }
    } catch (err) {
      setOtpError(err.response?.data?.detail || 'Wrong OTP. Please ask again.')
    } finally { setActionLoading(false) }
  }

  async function handleWarehouseDrop() {
    setActionLoading(true)
    try {
      await partnerPost(`/api/v1/returns/warehouse-drop?return_id=${order.return_id}`)
      setCompleted(true)
      localStorage.removeItem('sl_active_return_id')
    } catch (err) {
      console.error(err)
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isReturnOrder ? 'Return Delivered to Warehouse! 🎉' : 'Order Completed! 🎉'}
        </h2>
        <p className="text-gray-500 mb-2">Great job! Your earnings and green credits have been credited.</p>
        <p className="text-brand-green font-medium">+₹18 earned • +15 Green Credits 🌱</p>
        {isReturnOrder && warehouseInfo && (
          <p className="text-xs text-gray-400 mt-1">Dropped at {warehouseInfo.city} warehouse ({warehouseInfo.id})</p>
        )}
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

  // ═══ RETURN ORDER: Drop at Warehouse phase ═══
  if (isReturnOrder && (returnPhase === 'drop_at_warehouse') && otpVerified) {
    return (
      <div className="max-w-md mx-auto space-y-5">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Warehouse className="h-5 w-5 text-amber-500" /> Drop at Warehouse
        </h1>

        <div className="bg-brand-green-light border border-brand-green/20 rounded-xl p-4 text-center">
          <CheckCircle className="h-6 w-6 text-brand-green mx-auto mb-1" />
          <p className="font-medium text-brand-green-dark text-sm">Pickup OTP Verified! ✅</p>
          <p className="text-xs text-gray-600 mt-1">Now deliver to the warehouse below.</p>
        </div>

        {/* Product Info */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden">
            {order.product_image_url?.startsWith('http') ? (
              <img src={order.product_image_url} alt="" className="w-full h-full object-cover" />
            ) : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{order.product_name}</h3>
            <p className="text-xs text-gray-500">{order.return_id} • {order.category}</p>
          </div>
        </div>

        {/* Warehouse Details */}
        {warehouseInfo && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-amber-600" />
              <p className="font-bold text-gray-900">Warehouse Destination</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">{warehouseInfo.city} Warehouse</p>
              <p className="text-sm text-gray-600 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                {warehouseInfo.address}
              </p>
              <p className="text-xs text-gray-400">ID: {warehouseInfo.id}</p>
            </div>
            <button
              onClick={handleWarehouseDrop}
              disabled={actionLoading}
              className="w-full py-3 bg-brand-green hover:bg-brand-green-dark text-white font-semibold rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {actionLoading ? 'Confirming...' : (
                <><CheckCircle className="h-4 w-4" /> Confirm Warehouse Drop</>
              )}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ═══ RETURN ORDER: OTP Verified but waiting for warehouse drop (page refresh case) ═══
  if (isReturnOrder && returnPhase === 'drop_at_warehouse' && !otpVerified) {
    return (
      <div className="max-w-md mx-auto space-y-5">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Warehouse className="h-5 w-5 text-amber-500" /> Drop at Warehouse
        </h1>

        <div className="bg-brand-green-light border border-brand-green/20 rounded-xl p-4 text-center">
          <CheckCircle className="h-6 w-6 text-brand-green mx-auto mb-1" />
          <p className="font-medium text-brand-green-dark text-sm">Pickup Already Confirmed ✅</p>
          <p className="text-xs text-gray-600 mt-1">Deliver the package to the warehouse below.</p>
        </div>

        {/* Product Info */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden">
            {order.product_image_url?.startsWith('http') ? (
              <img src={order.product_image_url} alt="" className="w-full h-full object-cover" />
            ) : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{order.product_name}</h3>
            <p className="text-xs text-gray-500">{order.return_id} • {order.category}</p>
          </div>
        </div>

        {/* Warehouse Details */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-amber-600" />
            <p className="font-bold text-gray-900">Warehouse Destination</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">{order.warehouse_city} Warehouse</p>
            <p className="text-sm text-gray-600 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              {order.warehouse_address}
            </p>
            <p className="text-xs text-gray-400">ID: {order.warehouse_id}</p>
          </div>
          <button
            onClick={handleWarehouseDrop}
            disabled={actionLoading}
            className="w-full py-3 bg-brand-green hover:bg-brand-green-dark text-white font-semibold rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {actionLoading ? 'Confirming...' : (
              <><CheckCircle className="h-4 w-4" /> Confirm Warehouse Drop</>
            )}
          </button>
        </div>
      </div>
    )
  }

  // ═══ NORMAL ORDER: OTP verified → show "Order Completed" button ═══
  if (otpVerified && !isReturnOrder) {
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

  // ═══ ACTIVE DELIVERY: Contact + OTP Input ═══
  return (
    <div className="max-w-md mx-auto space-y-5">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Truck className="h-5 w-5 text-amber-500" /> {isReturnOrder ? 'Return Pickup' : 'Active Delivery'}
      </h1>

      {/* Product Info */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
        <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden">
          {(isReturnOrder ? order.product_image_url : order.product_image)?.startsWith('http') ? (
            <img src={isReturnOrder ? order.product_image_url : order.product_image} alt="" className="w-full h-full object-cover" />
          ) : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{order.product_name}</h3>
          <p className="text-xs text-gray-500">
            {isReturnOrder ? order.return_id : order.order_id} • ₹{Number(order.original_price || order.price || 0).toLocaleString()}
          </p>
          {isReturnOrder ? (
            <p className="text-xs text-gray-400">Return: {order.customer_city} → {order.warehouse_city} Warehouse</p>
          ) : (
            <p className="text-xs text-gray-400">{order.seller_city} → {order.buyer_city}</p>
          )}
        </div>
      </div>

      {/* Contact Card */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-2">
        <p className="text-xs text-gray-400 uppercase font-medium">
          {isReturnOrder ? '📍 Pickup From Customer' : isPickupRider ? '📍 Pickup From Seller' : '📍 Deliver To Buyer'}
        </p>
        <p className="font-medium text-gray-900">
          {isReturnOrder ? order.customer_name : isPickupRider ? order.seller_name : order.buyer_name}
        </p>
        <p className="text-sm text-gray-600 flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 text-brand-green" />
          <a href={`tel:${isReturnOrder ? order.customer_phone : isPickupRider ? order.seller_phone : order.buyer_phone}`} className="text-brand-green hover:underline">
            {isReturnOrder ? order.customer_phone : isPickupRider ? order.seller_phone : order.buyer_phone}
          </a>
        </p>
        <p className="text-sm text-gray-600 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-gray-400" />
          {isReturnOrder ? (order.customer_address || order.customer_city) : isPickupRider ? order.seller_address : order.buyer_address}
        </p>
      </div>

      {/* OTP Input — Rider enters what customer/seller/buyer tells them verbally */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-amber-600" />
          <p className="font-bold text-gray-900">Enter OTP</p>
        </div>
        <p className="text-xs text-gray-600">
          Ask the <strong>{isReturnOrder ? 'customer' : isPickupRider ? 'seller' : 'buyer'}</strong> to tell you the 4-digit OTP code. Enter it below to verify.
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
