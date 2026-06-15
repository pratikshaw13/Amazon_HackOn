'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Badge from '../components/ui/Badge'
import { marketplaceApi } from '../lib/api'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { ArrowRight, Leaf, Package, TrendingUp, ShoppingCart, Zap } from 'lucide-react'

// Animated counter hook
function useAnimatedCount(target, duration = 1500) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const numTarget = typeof target === 'string' ? parseFloat(target.replace(/[^0-9.]/g, '')) : target
    if (!numTarget || isNaN(numTarget)) { setCount(0); return }

    let start = 0
    const startTime = Date.now()

    function animate() {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(numTarget * eased))
      if (progress < 1) ref.current = requestAnimationFrame(animate)
    }
    ref.current = requestAnimationFrame(animate)
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [target, duration])

  return count
}

export default function Dashboard() {
  const [listings, setListings] = useState([])
  const [metrics, setMetrics] = useState({ products_tracked: 0, green_credits: 0, co2_saved: 0, idle_value: 0 })
  const { user, isAuthenticated } = useAuth()
  const { addToCart } = useCart()

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch trending products (sorted by green_credits descending)
        const res = await marketplaceApi.getListings({ limit: 6, sort_by: 'score' })
        setListings(res.data.listings || [])
      } catch (e) {}

      // Fetch platform metrics
      try {
        const metricsRes = await api.get('/api/v1/green/impact/platform')
        const d = metricsRes.data
        setMetrics({
          products_tracked: d.total_products_saved || 0,
          green_credits: d.total_credits_in_circulation || 0,
          co2_saved: d.total_co2_saved_kg || 0,
          idle_value: 38700,
        })
      } catch (e) {}
    }
    fetchData()
  }, [])

  const firstName = isAuthenticated && user?.name ? user.name.split(' ')[0] : null

  // Animated values
  const animProducts = useAnimatedCount(metrics.products_tracked)
  const animCredits = useAnimatedCount(metrics.green_credits)
  const animCO2 = useAnimatedCount(metrics.co2_saved)
  const animValue = useAnimatedCount(metrics.idle_value)

  async function handleBuyNow(product) {
    try {
      await api.post('/api/v1/full-orders/buy', { product_id: product.product_id })
      setListings(prev => prev.filter(p => p.product_id !== product.product_id))
    } catch (err) {
      alert(err.response?.data?.detail || 'Purchase failed')
    }
  }

  function handleAddToCart(product) {
    addToCart(product.product_id)
  }

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-brand-green to-brand-green-dark rounded-2xl p-8 text-white">
        {firstName && (
          <p className="text-green-200 text-sm font-medium mb-1">
            👋 Welcome back, <span className="text-white font-semibold">{firstName}</span>!
          </p>
        )}
        <h1 className="text-3xl font-bold mb-2">Amazon SecondLife AI</h1>
        <p className="text-green-100 text-lg mb-6 max-w-xl">
          No usable product should become dead inventory. Our AI ensures every item finds its next best owner.
        </p>
        <div className="flex gap-3">
          <Link href="/sell" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-brand-green font-semibold rounded-lg hover:bg-green-50 transition-colors">
            List a Product <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/marketplace" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 text-white font-semibold rounded-lg hover:bg-white/30 transition-colors border border-white/30">
            Browse Marketplace
          </Link>
        </div>
      </div>

      {/* Animated Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl">📦</div>
            <p className="text-xs text-gray-400 uppercase font-medium">Products Tracked</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{animProducts.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-xl">🌱</div>
            <p className="text-xs text-gray-400 uppercase font-medium">Green Credits Earned</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{animCredits.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center text-xl">🌍</div>
            <p className="text-xs text-gray-400 uppercase font-medium">CO₂ Saved</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{(animCO2 / 1000).toFixed(1)} tons</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-xl">💰</div>
            <p className="text-xs text-gray-400 uppercase font-medium">Estimated Idle Value</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">₹{animValue.toLocaleString()}Cr</p>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trending Products */}
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-brand-green" /> Trending Products
            </p>
            <Link href="/marketplace" className="text-xs text-brand-green hover:underline">View all →</Link>
          </div>
          {listings.length > 0 ? (
            <div className="space-y-3">
              {listings.slice(0, 6).map((item) => (
                <div key={item.product_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition group">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                      {item.image_urls?.[0]?.startsWith('http') ? (
                        <img src={item.image_urls[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 truncate max-w-[140px]">{item.product_name}</p>
                      <p className="text-xs text-gray-400">{item.category} • ₹{Number(item.estimated_value || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="p-1.5 bg-gray-200 rounded hover:bg-gray-300 transition"
                      title="Add to Cart"
                    >
                      <ShoppingCart className="h-3.5 w-3.5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleBuyNow(item)}
                      className="px-2.5 py-1 bg-brand-green text-white text-[10px] font-medium rounded hover:bg-brand-green-dark transition"
                    >
                      Buy
                    </button>
                  </div>
                  <div className="group-hover:hidden">
                    <Badge variant="green" className="text-[10px]">
                      <Leaf className="h-2.5 w-2.5 inline mr-0.5" />+{item.green_credits || 30}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              <p>No trending products yet.</p>
              <Link href="/marketplace" className="text-brand-green hover:underline mt-1 inline-block">Browse marketplace →</Link>
            </div>
          )}
        </div>

        {/* Platform Economics */}
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">Platform Impact</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-brand-green-light rounded-lg text-center">
              <p className="text-2xl font-bold text-brand-green">₹38,700Cr</p>
              <p className="text-xs text-gray-500 mt-1">Value Recoverable Annually</p>
            </div>
            <div className="p-4 bg-brand-blue-light rounded-lg text-center">
              <p className="text-2xl font-bold text-brand-blue">108M</p>
              <p className="text-xs text-gray-500 mt-1">Long-Tail Items/Year</p>
            </div>
            <div className="p-4 bg-brand-amber-light rounded-lg text-center">
              <p className="text-2xl font-bold text-brand-amber">18 → 5</p>
              <p className="text-xs text-gray-500 mt-1">Days to Next Sale (Target)</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-700">5</p>
              <p className="text-xs text-gray-500 mt-1">AI Agents Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
