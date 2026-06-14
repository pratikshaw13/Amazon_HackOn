'use client'

import { useEffect, useState } from 'react'
import { sellerApi } from '../../lib/api'
import Badge from '../../components/ui/Badge'
import MetricCard from '../../components/ui/MetricCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { Store, Package, TrendingUp, DollarSign } from 'lucide-react'

export default function SellerPortalPage() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    try {
      const res = await sellerApi.dashboard()
      setDashboard(res.data)
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Please login as a seller to access this portal.')
      } else {
        setError('Failed to load seller dashboard.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading seller dashboard..." />

  if (error) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">{error}</p>
        <a href="/seller/login" className="px-4 py-2 bg-brand-green text-white rounded-lg font-medium hover:bg-brand-green-dark">
          Seller Login
        </a>
      </div>
    )
  }

  const stats = dashboard?.stats || {}
  const products = dashboard?.products || []
  const seller = dashboard?.seller || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="h-6 w-6 text-brand-green" />
            Seller Portal
          </h1>
          <p className="text-gray-500 mt-1">
            {seller.seller_name} {seller.business_name ? `• ${seller.business_name}` : ''}
          </p>
        </div>
        <Badge variant="green">Active Seller</Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Listed" value={stats.products_listed || 0} icon="📦" />
        <MetricCard label="Awaiting Review" value={stats.awaiting_review || 0} icon="⏳" />
        <MetricCard label="AI Graded" value={stats.graded_by_ai || 0} icon="🤖" />
        <MetricCard label="Routed" value={stats.routed || 0} icon="🚛" />
        <MetricCard label="Sold" value={stats.sold || 0} icon="✅" />
        <MetricCard label="Revenue" value={`₹${Number(stats.revenue_generated || 0).toLocaleString()}`} icon="💰" />
      </div>

      {/* Products Table */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">Your Products</p>
        {products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="pb-2 pr-4">Product</th>
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2 pr-4">Grade</th>
                  <th className="pb-2 pr-4">Value</th>
                  <th className="pb-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-3 pr-4 font-medium text-gray-800">{p.product_name}</td>
                    <td className="py-3 pr-4 text-gray-500">{p.category}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={p.condition_score >= 80 ? 'green' : p.condition_score >= 50 ? 'amber' : 'red'}>
                        {p.condition_grade || 'Pending'}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-brand-green font-medium">₹{Number(p.estimated_value || 0).toLocaleString()}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={p.status === 'sold' ? 'green' : p.status === 'active' ? 'blue' : 'gray'}>
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No products listed yet.</p>
        )}
      </div>
    </div>
  )
}
