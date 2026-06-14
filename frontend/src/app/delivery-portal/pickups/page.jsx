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
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const [pickupsRes, deliveriesRes] = await Promise.allSettled([
        partnerFetch('/api/v1/full-orders/pickup-queue'),
        partnerFetch('/api/v1/full-orders/delivery-queue'),
      ])
      if (pickupsRes.status === 'fulfilled') setPickups(pickupsRes.value.data.pickups || [])
      if (deliveriesRes.status === 'fulfilled') setDeliveries(deliveriesRes.value.data.deliveries || [])
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

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-gray-200 border-t-amber-500 rounded-full animate-spin" /></div>

  // After accepting — show OTP + contact details
  if (acceptedData) {
    const contact = acceptedData.seller_contact || acceptedData.buyer_contact
    const isPickup = !!acceptedData.seller_contact
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-brand-green-light border border-brand-green/20 rounded-xl p-4 flex items-center gap-2 text-sm text-brand-green-dark">
          <CheckCircle className="h-5 w-5" /> {acceptedData.message}
        </div>

        {/* OTP Card */}
        <div className="bg-white border-2 border-amber-300 rounded-xl p-6 text-center">
          <p className="text-xs text-gray-400 uppercase font-medium mb-2">Verification OTP</p>
          <p className="text-4xl font-bold tracking-widest text-amber-600">{acceptedData.otp}</p>
          <p className="text-xs text-gray-500 mt-2">
            {isPickup ? "Show this to seller when picking up" : "Buyer will confirm with this code"}
          </p>
        </div>

        {/* Contact Details */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-3">
          <p className="text-xs text-gray-400 uppercase font-medium">
            {isPickup ? 'Seller Contact' : 'Buyer Contact'}
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
              {selectedOrder.product_image?.startsWith('http') ? (
                <img src={selectedOrder.product_image} alt="" className="w-full h-full object-cover" />
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
              {isPickup ? 'Pickup From (Seller)' : 'Deliver To (Buyer)'}
            </p>
            <p className="text-sm font-medium text-gray-900">
              {isPickup ? selectedOrder.seller_name : selectedOrder.buyer_name}
            </p>
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <Phone className="h-3 w-3" /> {isPickup ? selectedOrder.seller_phone : selectedOrder.buyer_phone}
            </p>
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {isPickup ? selectedOrder.seller_address : selectedOrder.buyer_address}
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
            onClick={() => isPickup ? handleAcceptPickup(selectedOrder.order_id) : handleAcceptDelivery(selectedOrder.order_id)}
            disabled={actionLoading === selectedOrder.order_id}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {actionLoading === selectedOrder.order_id ? 'Accepting...' : (
              <><Truck className="h-4 w-4" /> Accept {isPickup ? 'Pickup' : 'Delivery'}</>
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
          🏠 Pickups from Sellers ({pickups.length})
        </button>
        <button onClick={() => setTab('deliveries')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${tab === 'deliveries' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
          📦 Deliveries to Buyers ({deliveries.length})
        </button>
      </div>

      {/* List */}
      {(tab === 'pickups' ? pickups : deliveries).length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No {tab === 'pickups' ? 'pickups' : 'deliveries'} available right now</p>
          <p className="text-xs text-gray-400 mt-1">Check back soon — new orders appear instantly</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(tab === 'pickups' ? pickups : deliveries).map(order => (
            <button
              key={order.order_id}
              onClick={() => setSelectedOrder(order)}
              className="w-full bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md hover:border-amber-200 transition text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {order.product_image?.startsWith('http') ? (
                    <img src={order.product_image} alt="" className="w-full h-full object-cover" />
                  ) : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-sm">{order.product_name}</h3>
                  <p className="text-xs text-gray-500">
                    {tab === 'pickups'
                      ? `Pickup: ${order.seller_name} • ${order.seller_city}`
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
