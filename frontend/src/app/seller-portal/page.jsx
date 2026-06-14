'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Shield, Package, RotateCcw, AlertTriangle, TrendingUp, Leaf, DollarSign, Truck, BarChart3, Zap } from 'lucide-react'
import api from '../../lib/api'

function getSellerToken() {
  return localStorage.getItem('sl_certified_seller_token')
}

function sellerApi(path) {
  return api.get(path, { headers: { Authorization: `Bearer ${getSellerToken()}` } })
}

export default function SellerPortalDashboard() {
  const [stats, setStats] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const [profileRes, statsRes] = await Promise.all([
          sellerApi('/api/v1/certified-seller/dashboard-stats'),
          sellerApi('/api/v1/seller-inventory/stats'),
        ])
        setProfile(profileRes.data)
        setStats(statsRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  if (loading) return <Loading />

  const p = profile || {}
  const s = stats || {}
  const pStats = p.stats || {}

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-10 w-10 text-brand-green" />
            <div>
              <h1 className="text-xl font-bold">Welcome, {p.seller_name}</h1>
              <p className="text-sm text-gray-400">{p.company_name} • {p.warehouse_city} Warehouse • ⭐ {p.seller_rating}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/seller-portal/rescue"
              className="px-4 py-2 bg-brand-green text-white rounded-lg text-sm font-medium flex items-center gap-1.5 hover:bg-brand-green-dark">
              <Zap className="h-3.5 w-3.5" /> Rescue Dead Inventory
            </Link>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <MetricCard icon={<Package className="h-5 w-5 text-brand-blue" />} label="Total Products" value={s.total_products || 0} />
        <MetricCard icon={<TrendingUp className="h-5 w-5 text-brand-green" />} label="Active" value={s.active || 0} color="text-brand-green" />
        <MetricCard icon={<RotateCcw className="h-5 w-5 text-brand-amber" />} label="Returned" value={s.returned || 0} color="text-brand-amber" />
        <MetricCard icon={<AlertTriangle className="h-5 w-5 text-brand-red" />} label="Dead Inventory" value={s.dead || 0} color="text-brand-red" />
        <MetricCard icon={<Leaf className="h-5 w-5 text-green-600" />} label="Rescued" value={s.rescued || 0} color="text-green-600" />
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
          label="Inventory Value"
          value={`₹${Number(s.total_inventory_value || 0).toLocaleString()}`}
        />
        <MetricCard
          icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
          label="Dead Value at Risk"
          value={`₹${Number(s.dead_inventory_value || 0).toLocaleString()}`}
          color="text-brand-red"
        />
        <MetricCard
          icon={<DollarSign className="h-5 w-5 text-brand-green" />}
          label="Recovered Value"
          value={`₹${Number(pStats.recovered_inventory_value || 0).toLocaleString()}`}
          color="text-brand-green"
        />
        <MetricCard
          icon={<Leaf className="h-5 w-5 text-brand-green" />}
          label="Green Score"
          value={`${pStats.green_score || 0}/100`}
        />
      </div>

      {/* Category & Warehouse Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categories */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Category Breakdown</p>
          <div className="space-y-2">
            {Object.entries(s.categories || {}).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{cat}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-green rounded-full" style={{ width: `${(count / (s.total_products || 1)) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium text-gray-500 w-6 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warehouses */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Warehouse Distribution</p>
          <div className="space-y-2">
            {Object.entries(s.warehouse_distribution || {}).sort((a, b) => b[1] - a[1]).map(([city, count]) => (
              <div key={city} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-gray-400" /> {city}
                </span>
                <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction href="/seller-portal/inventory" icon="📦" label="View All Inventory" desc="Filter & manage" />
        <QuickAction href="/seller-portal/returns" icon="↩️" label="Manage Returns" desc={`${s.returned || 0} items`} />
        <QuickAction href="/seller-portal/rescue" icon="🚀" label="Rescue Engine" desc={`${s.dead || 0} dead items`} />
        <QuickAction href="/seller-portal/routing" icon="🗺️" label="Smart Routing" desc="AI recommendations" />
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, color = 'text-gray-900' }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="mb-2">{icon}</div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

function QuickAction({ href, icon, label, desc }) {
  return (
    <Link href={href} className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition text-center">
      <span className="text-2xl block mb-1">{icon}</span>
      <p className="text-sm font-medium text-gray-800">{label}</p>
      <p className="text-xs text-gray-400">{desc}</p>
    </Link>
  )
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 border-3 border-gray-200 border-t-brand-green rounded-full animate-spin" style={{ borderWidth: '3px' }} />
    </div>
  )
}
