'use client'

import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Package, RotateCcw, Leaf, AlertTriangle } from 'lucide-react'
import api from '../../../lib/api'

function getSellerToken() {
  return localStorage.getItem('sl_certified_seller_token')
}

export default function SellerAnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.get('/api/v1/seller-analytics/overview', {
          headers: { Authorization: `Bearer ${getSellerToken()}` }
        })
        setData(res.data)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetch()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-gray-200 border-t-brand-green rounded-full animate-spin" /></div>
  if (!data) return null

  const s = data.summary
  const status = data.status_breakdown

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <BarChart3 className="h-5 w-5" /> Seller Analytics
      </h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={<DollarSign className="h-5 w-5 text-green-600" />} label="Total Revenue" value={`₹${Number(s.total_revenue).toLocaleString()}`} color="text-green-600" />
        <MetricCard icon={<RotateCcw className="h-5 w-5 text-brand-amber" />} label="Return Rate" value={`${s.return_rate}%`} color="text-brand-amber" />
        <MetricCard icon={<Package className="h-5 w-5 text-brand-blue" />} label="Avg Inventory Age" value={`${s.avg_inventory_age} days`} />
        <MetricCard icon={<Leaf className="h-5 w-5 text-brand-green" />} label="Products Saved" value={s.products_saved_from_liquidation} color="text-brand-green" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={<TrendingUp className="h-5 w-5 text-brand-green" />} label="Active Value" value={`₹${Number(s.active_inventory_value).toLocaleString()}`} color="text-brand-green" />
        <MetricCard icon={<AlertTriangle className="h-5 w-5 text-red-500" />} label="Dead Value" value={`₹${Number(s.dead_inventory_value).toLocaleString()}`} color="text-red-600" />
        <MetricCard icon={<DollarSign className="h-5 w-5 text-blue-600" />} label="Recovered Value" value={`₹${Number(s.recovered_value).toLocaleString()}`} color="text-blue-600" />
        <MetricCard icon={<Leaf className="h-5 w-5 text-brand-green" />} label="Green Score" value={`${s.green_score}/100`} color="text-brand-green" />
      </div>

      {/* Status Breakdown */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">Inventory Status</p>
        <div className="grid grid-cols-6 gap-3 text-center">
          {[
            { label: 'Active', value: status.active, color: 'bg-green-500' },
            { label: 'Returned', value: status.returned, color: 'bg-amber-500' },
            { label: 'Dead', value: status.dead, color: 'bg-red-500' },
            { label: 'Rescued', value: status.rescued, color: 'bg-blue-500' },
            { label: 'Sold', value: status.sold, color: 'bg-gray-400' },
            { label: 'Donated', value: status.donated, color: 'bg-emerald-500' },
          ].map(item => (
            <div key={item.label}>
              <div className={`h-2 rounded-full ${item.color} mb-2`} style={{ width: `${Math.max(20, (item.value / Math.max(1, s.total_products)) * 100)}%`, margin: '0 auto' }} />
              <p className="text-lg font-bold text-gray-900">{item.value}</p>
              <p className="text-xs text-gray-400">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Performance */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">Category Performance</p>
          <div className="space-y-3">
            {Object.entries(data.category_performance).sort((a, b) => b[1].total - a[1].total).map(([cat, info]) => (
              <div key={cat} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">{cat}</p>
                  <p className="text-xs text-gray-400">{info.total} products • Avg demand: {info.avg_demand}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-brand-green">₹{Number(info.revenue).toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{info.sold} sold, {info.dead} dead</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warehouse Distribution */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">Warehouse Distribution</p>
          <div className="space-y-3">
            {Object.entries(data.warehouse_distribution).sort((a, b) => b[1].total - a[1].total).map(([city, info]) => (
              <div key={city} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">📦 {city}</p>
                  <p className="text-xs text-gray-400">{info.total} items ({info.active} active, {info.dead} dead)</p>
                </div>
                <p className="text-sm font-bold text-gray-700">₹{Number(info.value).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top & Bottom Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
            <TrendingUp className="h-3.5 w-3.5 inline mr-1 text-green-500" /> Highest Demand
          </p>
          <div className="space-y-2">
            {data.top_demand_products.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate max-w-[180px]">{p.name}</span>
                <span className="font-bold text-green-600">{p.demand}/100</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
            <TrendingDown className="h-3.5 w-3.5 inline mr-1 text-red-500" /> Lowest Demand (Need Rescue)
          </p>
          <div className="space-y-2">
            {data.low_demand_products.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate max-w-[180px]">{p.name}</span>
                <span className="font-bold text-red-600">{p.demand}/100</span>
              </div>
            ))}
          </div>
        </div>
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
