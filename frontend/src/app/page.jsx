'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import MetricCard from '../components/ui/MetricCard'
import Badge from '../components/ui/Badge'
import { marketplaceApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { ArrowRight, Leaf, Package, TrendingUp, Recycle } from 'lucide-react'

export default function Dashboard() {
  const [listings, setListings] = useState([])
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    async function fetchListings() {
      try {
        const res = await marketplaceApi.getListings({ limit: 4 })
        setListings(res.data.listings || [])
      } catch (e) {
        // Silently fail - dashboard still works
      }
    }
    fetchListings()
  }, [])

  // Greeting: first name only, or generic fallback
  const firstName = isAuthenticated && user?.name
    ? user.name.split(' ')[0]
    : null

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-brand-green to-brand-green-dark rounded-2xl p-8 text-white">
        {/* Personalised welcome line */}
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
          <Link
            href="/sell"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-brand-green font-semibold rounded-lg hover:bg-green-50 transition-colors"
          >
            List a Product <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 text-white font-semibold rounded-lg hover:bg-white/30 transition-colors border border-white/30"
          >
            Browse Marketplace
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Products Tracked" value="1,247" icon="📦" />
        <MetricCard label="Green Credits Earned" value="18,500" icon="🌱" />
        <MetricCard label="CO₂ Saved" value="4.2 tons" icon="🌍" />
        <MetricCard label="Estimated Idle Value" value="₹38L" icon="💰" />
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Routing Queue */}
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">AI Routing Queue</p>
            <Link href="/marketplace" className="text-xs text-brand-green hover:underline">View all →</Link>
          </div>
          {listings.length > 0 ? (
            <div className="space-y-3">
              {listings.map((item, i) => (
                <Link
                  key={i}
                  href={`/passport/${item.product_id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-green-light rounded-lg flex items-center justify-center text-lg">
                      📦
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.product_name}</p>
                      <p className="text-xs text-gray-400">{item.category}</p>
                    </div>
                  </div>
                  <Badge variant={item.condition_score >= 80 ? 'green' : item.condition_score >= 50 ? 'amber' : 'red'}>
                    {item.condition_score}/100
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              <p>No products listed yet.</p>
              <Link href="/sell" className="text-brand-green hover:underline mt-1 inline-block">List your first item →</Link>
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
