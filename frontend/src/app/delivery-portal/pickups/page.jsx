'use client'

import { useEffect, useState } from 'react'
import { MapPin, Leaf, Clock, Phone, CheckCircle, Package, DollarSign, User, Truck } from 'lucide-react'
import api from '../../../lib/api'

function getToken() { return localStorage.getItem('sl_delivery_token') }
function partnerFetch(path) { return api.get(path, { headers: { Authorization: `Bearer ${getToken()}` } }) }
function partnerPost(path, data = {}) { return api.post(path, data, { headers: { Authorization: `Bearer ${getToken()}` } }) }

export default function PickupsPage() {
  const [pickups, setPickups] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pickups')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [acceptedData, setAcceptedData] = useState(null)
  const [returnPickups, setReturnPickups] = useState([])
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const [pickupsRes, deliveriesRes, returnsRes] = await Promise.allSettled([
        partnerFetch('/api/v1/full-orders/pickup-queue'),
        partnerFetch('/api/v1/full-orders/delivery-queue'),
        partnerFetch('/api/v1/returns/pickup-queue'),
      ])
      if (pickupsRes.status === 'fulfilled') setPickups(pickupsRes.value.data.pickups || [])
      if (deliveriesRes.status === 'fulfilled') setDeliveries(deliveriesRes.value.data.deliveries || [])
      if (returnsRes.status === 'fulfilled') setReturnPickups(returnsRes.value.data.return_pickups || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleAcceptPickup(orderId) {
    setActionLoading(orderId)
    try {
      const res = await partnerPost(`/api/v1/full-orders/accept-pickup?order_id=${orderId}`)
      setAcceptedData(res.data)
      setPickups(prev => prev.filter(p => p.order_id !== orderId))
      // Store active order ID for the Active page
      localStorage.setItem('sl_active_order_id', orderId)
    } catch (err) { console.error(err) }
    finally { setActionLoading(null) }
  }

  async function handleAcceptDelivery(orderId) {
    setActionLoading(orderId)
    try {
      const res = await partnerPost(`/api/v1/full-orders/accept-delivery?order_id=${orderId}`)
      setAcceptedData(res.data)
      setDeliveries(prev => prev.filter(d => d.order_id !== orderId))
      localStorage.setItem('sl_active_order_id', orderId)
    } catch (err) { console.error(err) }
    finally { setActionLoading(null) }
  }

  async function handleAcceptReturn(returnId) {
    setActionLoading(returnId)
    try {
      const res = await partnerPost(`/api/v1/returns/accept-pickup?return_id=${returnId}`)
      setAcceptedData({ ...res.data, isReturn: true })
      setReturnPickups(prev => prev.filter(r => r.return_id !== returnId))
      localStorage.setItem('sl_active_return_id', returnId)
    } catch (err) { console.error(err) }
    finally { setActionLoading(null) }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-gray-200 border-t-amber-500 rounded-full animate-spin" /></div>

  // After accepting — show OTP + contact details
  if (acceptedData) {
    const contact = acceptedData.seller_contact || acceptedData.buyer_contact || acceptedData.customer_contact
    const isReturn = acceptedData.isReturn || !!acceptedData.customer_contact
    const isPickup = !!acceptedData.seller_contact
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-brand-green-light border border-brand-green/20 rounded-xl p-4 flex items-center gap-2 text-sm text-brand-green-dark">
          <CheckCircle className="h-5 w-5" /> {acceptedData.message}
        </div>

        {/* OTP Card */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 text-center">
          <p className="text-sm text-gray-600">
            Go to the {isReturn ? 'customer' : isPickup ? 'seller' : 'buyer'} and <strong>ask them for the OTP</strong>. Enter it on the Active Delivery page to verify.
          </p>
        </div>

        {/* Contact Details */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-3">
          <p className="text-xs text-gray-400 uppercase font-medium">
            {isReturn ? 'Customer Contact' : isPickup ? 'Seller Contact' : 'Buyer Contact'}
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{contact.name}</p>
              <p className="text-sm text-gray-500">{contact.city}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-brand-green" />
            <a href={`tel:${contact.phone}`} className="text-brand-green font-medium hover:underline">{contact.phone}</a>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span>{contact.address}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <a href="/delivery-portal/active"
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white text-center font-semibold rounded-xl transition">
            Go to Active Delivery →
          </a>
          <button onClick={() => { setAcceptedData(null); fetchAll() }}
            className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200">
            Back
          </button>
        </div>
      </div>
    )
  }

  // Order detail popup
  if (selectedOrder) {
    const isPickup = tab === 'pickups'
    return (
      <div className="max-w-md mx-auto space-y-4">
        <button onClick={() => setSelectedOrder(null)} className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to list
        </button>

        <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          {/* Product */}
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden">
              {(selectedOrder.product_image || selectedOrder.product_image_url)?.startsWith('http') ? (
                <img src={selectedOrder.product_image || selectedOrder.product_image_url} alt="" className="w-full h-full object-cover" />
              ) : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{selectedOrder.product_name}</h3>
              <p className="text-xs text-gray-500">{selectedOrder.category} • ₹{Number(selectedOrder.price || 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <p className="text-xs text-gray-400 uppercase font-medium">
              {tab === 'returns' ? 'Return Pickup From (Customer)' : isPickup ? 'Pickup From (Seller)' : 'Deliver To (Buyer)'}
            </p>
            <p className="text-sm font-medium text-gray-900">
              {tab === 'returns' ? selectedOrder.customer_name : isPickup ? selectedOrder.seller_name : selectedOrder.buyer_name}
            </p>
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <Phone className="h-3 w-3" /> {tab === 'returns' ? selectedOrder.customer_phone : isPickup ? selectedOrder.seller_phone : selectedOrder.buyer_phone}
            </p>
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {tab === 'returns' ? (selectedOrder.customer_address || selectedOrder.customer_city) : isPickup ? selectedOrder.seller_address : selectedOrder.buyer_address}
            </p>
          </div>

          {/* Earnings */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-green-50 rounded-lg p-2">
              <DollarSign className="h-4 w-4 text-green-600 mx-auto" />
              <p className="text-sm font-bold text-green-600">₹{selectedOrder.estimated_earning || 18}</p>
              <p className="text-[10px] text-gray-400">Earning</p>
            </div>
            <div className="bg-brand-green-light rounded-lg p-2">
              <Leaf className="h-4 w-4 text-brand-green mx-auto" />
              <p className="text-sm font-bold text-brand-green">+{selectedOrder.estimated_green_credits || 15}</p>
              <p className="text-[10px] text-gray-400">Credits</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <Clock className="h-4 w-4 text-gray-500 mx-auto" />
              <p className="text-sm font-bold text-gray-700">{selectedOrder.estimated_distance_km || '?'}km</p>
              <p className="text-[10px] text-gray-400">Distance</p>
            </div>
          </div>

          {/* Accept Button */}
          <button
            onClick={() => {
              if (tab === 'returns') handleAcceptReturn(selectedOrder.return_id)
              else if (isPickup) handleAcceptPickup(selectedOrder.order_id)
              else handleAcceptDelivery(selectedOrder.order_id)
            }}
            disabled={actionLoading === (selectedOrder.order_id || selectedOrder.return_id)}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {actionLoading ? 'Accepting...' : (
              <><Truck className="h-4 w-4" /> Accept {tab === 'returns' ? 'Return Pickup' : isPickup ? 'Pickup' : 'Delivery'}</>
            )}
          </button>
        </div>
      </div>
    )
  }

  // Main list view
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-amber-500" /> Available Orders
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1">
        <button onClick={() => setTab('pickups')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${tab === 'pickups' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
          🏠 Pickups ({pickups.length})
        </button>
        <button onClick={() => setTab('deliveries')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${tab === 'deliveries' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
          📦 Deliveries ({deliveries.length})
        </button>
        <button onClick={() => setTab('returns')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${tab === 'returns' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
          ↩️ Returns ({returnPickups.length})
        </button>
      </div>

      {/* List */}
      {(tab === 'pickups' ? pickups : tab === 'deliveries' ? deliveries : returnPickups).length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No {tab} available right now</p>
          <p className="text-xs text-gray-400 mt-1">Check back soon — new orders appear instantly</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(tab === 'pickups' ? pickups : tab === 'deliveries' ? deliveries : returnPickups).map(order => (
            <button
              key={order.order_id || order.return_id}
              onClick={() => setSelectedOrder(order)}
              className="w-full bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md hover:border-amber-200 transition text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {(order.product_image || order.product_image_url)?.startsWith('http') ? (
                    <img src={order.product_image || order.product_image_url} alt="" className="w-full h-full object-cover" />
                  ) : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-sm">{order.product_name}</h3>
                  <p className="text-xs text-gray-500">
                    {tab === 'pickups'
                      ? `Pickup: ${order.seller_name} • ${order.seller_city}`
                      : tab === 'returns'
                      ? `Return pickup: ${order.customer_name} • ${order.customer_city}`
                      : `Deliver to: ${order.buyer_name} • ${order.buyer_city}`
                    }
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-green-600 font-medium">₹{order.estimated_earning || 18}</span>
                    <span className="text-xs text-brand-green flex items-center gap-0.5">
                      <Leaf className="h-3 w-3" /> +{order.estimated_green_credits || 15}
                    </span>
                  </div>
                </div>
                <div className="text-amber-500 text-xs font-medium">View →</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
