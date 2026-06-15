'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Truck, DollarSign, Leaf, Package, Star, MapPin, Zap } from 'lucide-react'
import api from '../../lib/api'

function getDeliveryToken() {
  return localStorage.getItem('sl_delivery_token')
}

export default function DeliveryDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.get('/api/v1/delivery-partner/dashboard', {
          headers: { Authorization: `Bearer ${getDeliveryToken()}` }
        })
        setData(res.data)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetch()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-gray-200 border-t-brand-green rounded-full animate-spin" /></div>
  if (!data) {
    return (
      <div className="text-center py-16">
        <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">Session expired. Please login again.</p>
        <a href="/delivery-portal/login" className="px-4 py-2 bg-brand-green text-white rounded-lg font-medium">
          Login
        </a>
      </div>
    )
  }

  const s = data.stats

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-brand-green to-orange-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Truck className="h-10 w-10" />
            <div>
              <h1 className="text-xl font-bold">Welcome, {data.partner_name}!</h1>
              <p className="text-sm text-amber-100">{data.city} • {data.vehicle_type} • ⭐ {data.rating}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              data.current_status === 'available' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-200'
            }`}>
              {data.current_status === 'available' ? '🟢 Online' : '⚫ Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Package className="h-5 w-5 text-brand-green" />} label="Total Deliveries" value={s.total_deliveries} />
        <StatCard icon={<DollarSign className="h-5 w-5 text-green-600" />} label="Total Earned" value={`₹${Number(s.total_earnings).toLocaleString()}`} color="text-green-600" />
        <StatCard icon={<Leaf className="h-5 w-5 text-brand-green" />} label="Green Credits" value={s.green_credits_earned} color="text-brand-green" />
        <StatCard icon={<Star className="h-5 w-5 text-brand-green" />} label="Acceptance Rate" value={`${Math.round(s.orders_accepted / Math.max(1, s.orders_accepted + s.orders_rejected) * 100)}%`} />
      </div>

      {/* Earnings Breakdown */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Earnings Breakdown</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-lg font-bold text-amber-700">₹{s.flex_base_earned}</p>
            <p className="text-xs text-gray-500">Flex Base (₹470/4hr)</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-lg font-bold text-green-700">₹{s.per_delivery_bonus}</p>
            <p className="text-xs text-gray-500">Per-Delivery Bonus</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-lg font-bold text-gray-700">₹{s.avg_per_delivery}</p>
            <p className="text-xs text-gray-500">Avg per Delivery</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/delivery-portal/pickups"
          className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition text-center">
          <MapPin className="h-8 w-8 text-brand-green mx-auto mb-2" />
          <p className="font-medium text-gray-900">View Available Pickups</p>
          <p className="text-xs text-gray-400 mt-1">Accept new deliveries</p>
        </Link>
        <Link href="/delivery-portal/active"
          className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition text-center">
          <Zap className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="font-medium text-gray-900">Active Delivery</p>
          <p className="text-xs text-gray-400 mt-1">Current order in progress</p>
        </Link>
      </div>

      {/* How it works */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">How SecondLife Flex Works</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { step: "1", text: "Accept pickup from Available Pickups" },
            { step: "2", text: "Go to seller's location, pick up the product" },
            { step: "3", text: "Deliver to nearest Amazon warehouse" },
            { step: "4", text: "Earn ₹15-20 + Green Credits per delivery" },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
              <span className="w-6 h-6 rounded-full bg-brand-green text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{item.step}</span>
              <p className="text-xs text-gray-600">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color = 'text-gray-900' }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="mb-2">{icon}</div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

