'use client'

import { useEffect, useState } from 'react'
import { Package, Filter } from 'lucide-react'
import api from '../../../lib/api'

function getSellerToken() {
  return localStorage.getItem('sl_certified_seller_token')
}

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  returned: 'bg-amber-100 text-amber-700',
  dead: 'bg-red-100 text-red-700',
  rescued: 'bg-blue-100 text-blue-700',
  sold: 'bg-gray-100 text-gray-600',
  donated: 'bg-emerald-100 text-emerald-700',
}

export default function InventoryPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', category: '', sort_by: 'inventory_age' })

  useEffect(() => { fetchInventory() }, [filters])

  async function fetchInventory() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.category) params.append('category', filters.category)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)

      const res = await api.get(`/api/v1/seller-inventory/all?${params}`, {
        headers: { Authorization: `Bearer ${getSellerToken()}` }
      })
      setItems(res.data.inventory || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="h-5 w-5" /> Inventory Management
        </h1>
        <span className="text-sm text-gray-400">{items.length} products</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-gray-100 rounded-xl p-4">
        <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="returned">Returned</option>
          <option value="dead">Dead</option>
          <option value="rescued">Rescued</option>
          <option value="sold">Sold</option>
          <option value="donated">Donated</option>
        </select>
        <select value={filters.category} onChange={e => setFilters(p => ({ ...p, category: e.target.value }))}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">
          <option value="">All Categories</option>
          {['Electronics', 'Baby Products', 'Sports', 'Kitchen', 'Home', 'Books', 'Personal Care', 'Fashion'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={filters.sort_by} onChange={e => setFilters(p => ({ ...p, sort_by: e.target.value }))}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">
          <option value="inventory_age">Sort: Age (oldest)</option>
          <option value="demand_score">Sort: Demand (highest)</option>
          <option value="price">Sort: Price (highest)</option>
          <option value="return_rate">Sort: Return Rate</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-gray-200 border-t-brand-green rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-xs text-gray-400 uppercase">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Demand</th>
                  <th className="px-4 py-3">Age</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(item => (
                  <tr key={item.product_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={item.image_url} alt="" className="w-9 h-9 rounded-lg object-cover bg-gray-100" />
                        <span className="font-medium text-gray-800 truncate max-w-[180px]">{item.product_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.category}</td>
                    <td className="px-4 py-3 text-gray-500">{item.warehouse_city}</td>
                    <td className="px-4 py-3 font-medium">₹{Number(item.current_price || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <DemandBadge score={item.demand_score} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.inventory_age}d</td>
                    <td className="px-4 py-3 text-gray-600">{item.condition_grade}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-500'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 && (
            <p className="text-center py-8 text-gray-400 text-sm">No products match your filters.</p>
          )}
        </div>
      )}
    </div>
  )
}

function DemandBadge({ score }) {
  const color = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-red-600'
  const bg = score >= 70 ? 'bg-green-50' : score >= 40 ? 'bg-amber-50' : 'bg-red-50'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold ${color} ${bg}`}>
      {score}
    </span>
  )
}
