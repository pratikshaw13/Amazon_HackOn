'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RotateCcw, AlertTriangle, TrendingDown, Zap } from 'lucide-react'
import api from '../../../lib/api'

function getSellerToken() {
  return localStorage.getItem('sl_certified_seller_token')
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.get('/api/v1/seller-inventory/returns', {
          headers: { Authorization: `Bearer ${getSellerToken()}` }
        })
        setReturns(res.data.returns || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-gray-200 border-t-brand-green rounded-full animate-spin" /></div>

  const deadItems = returns.filter(r => r.status === 'dead')
  const returnedItems = returns.filter(r => r.status === 'returned')
  const totalValueAtRisk = returns.reduce((sum, r) => sum + Number(r.current_price || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <RotateCcw className="h-5 w-5" /> Returns & Dead Inventory
        </h1>
        <Link href="/seller-portal/rescue"
          className="px-4 py-2 bg-brand-green text-white rounded-lg text-sm font-medium flex items-center gap-1.5 hover:bg-brand-green-dark">
          <Zap className="h-3.5 w-3.5" /> Rescue These Items
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <RotateCcw className="h-6 w-6 text-brand-amber mx-auto mb-2" />
          <p className="text-2xl font-bold text-brand-amber">{returnedItems.length}</p>
          <p className="text-xs text-gray-400">Returned</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <AlertTriangle className="h-6 w-6 text-brand-red mx-auto mb-2" />
          <p className="text-2xl font-bold text-brand-red">{deadItems.length}</p>
          <p className="text-xs text-gray-400">Dead Inventory</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <TrendingDown className="h-6 w-6 text-red-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-red-600">₹{totalValueAtRisk.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Value at Risk</p>
        </div>
      </div>

      {/* Returns List */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs text-gray-400 uppercase">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Demand</th>
                <th className="px-4 py-3">Age (days)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {returns.map(item => (
                <tr key={item.product_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img src={item.image_url} alt="" className="w-8 h-8 rounded object-cover bg-gray-100" />
                      <span className="font-medium text-gray-800 truncate max-w-[160px]">{item.product_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.category}</td>
                  <td className="px-4 py-3 text-gray-500">{item.warehouse_city}</td>
                  <td className="px-4 py-3 font-medium">₹{Number(item.current_price || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${item.demand_score >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.demand_score}/100
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.inventory_age}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.status === 'dead' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href="/seller-portal/rescue"
                      className="text-xs text-brand-green font-medium hover:underline">
                      Rescue →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {returns.length === 0 && (
          <p className="text-center py-8 text-gray-400">🎉 No returns! All inventory is healthy.</p>
        )}
      </div>
    </div>
  )
}
