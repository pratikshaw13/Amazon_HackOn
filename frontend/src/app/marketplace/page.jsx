'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { marketplaceApi, searchApi } from '../../lib/api'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { CATEGORIES, CONDITION_GRADES, getScoreColor } from '../../lib/constants'
import { Search, Filter } from 'lucide-react'

export default function MarketplacePage() {
  const searchParams = useSearchParams()
  const queryParam = searchParams.get('q') || ''

  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ category: '', condition: '' })
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState(queryParam)

  const chipFilters = ['All', 'AI Verified', 'Like New', 'Excellent', 'Good', 'Fair']

  useEffect(() => {
    if (queryParam) {
      setSearchQuery(queryParam)
      performSearch(queryParam)
    } else {
      fetchListings()
    }
  }, [queryParam, filters])

  async function fetchListings() {
    setLoading(true)
    try {
      const params = {}
      if (filters.category) params.category = filters.category
      if (filters.condition) params.condition = filters.condition
      // Pass buyer's city and state for location-based filtering
      const userCity = typeof window !== 'undefined' ? localStorage.getItem('sl_user_city') : null
      const userState = typeof window !== 'undefined' ? localStorage.getItem('sl_user_state') : null
      if (userCity) params.buyer_city = userCity
      if (userState) params.buyer_state = userState
      const res = await marketplaceApi.getListings(params)
      setListings(res.data.listings || [])
    } catch (err) {
      console.error('Failed to fetch listings:', err)
    } finally {
      setLoading(false)
    }
  }

  async function performSearch(query) {
    if (!query.trim()) {
      fetchListings()
      return
    }
    setLoading(true)
    try {
      const res = await searchApi.search(query)
      setListings(res.data.results || [])
    } catch (err) {
      console.error('Search failed:', err)
      fetchListings()
    } finally {
      setLoading(false)
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault()
    performSearch(searchQuery)
  }

  const handleChipClick = (chip) => {
    setActiveFilter(chip)
    if (chip === 'All' || chip === 'AI Verified') {
      setFilters({ ...filters, condition: '' })
    } else {
      setFilters({ ...filters, condition: chip })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SecondLife Marketplace</h1>
        <p className="text-gray-500 mt-1">AI-verified pre-owned products with full transparency</p>
      </div>

      {/* Search + Filters */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products (e.g., baby monitor, headphones, laptop)..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green"
          />
          <button type="submit" className="px-4 py-2 bg-brand-green text-white rounded-lg text-sm font-medium hover:bg-brand-green-dark">
            <Search className="h-4 w-4" />
          </button>
        </form>
        <div className="flex gap-2 flex-wrap">
          {chipFilters.map(chip => (
            <button
              key={chip}
              onClick={() => handleChipClick(chip)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeFilter === chip
                  ? 'bg-brand-green text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-green"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <LoadingSpinner text="Loading marketplace..." />
      ) : listings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((item) => (
            <Link
              key={item.product_id}
              href={`/marketplace/${item.product_id}`}
              className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              {/* Product Image Area */}
              <div className="h-32 bg-gray-50 rounded-lg flex items-center justify-center mb-3 overflow-hidden">
                {item.image_urls && item.image_urls.length > 0 && item.image_urls[0].startsWith('http') ? (
                  <img
                    src={item.image_urls[0]}
                    alt={item.product_name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <span className="text-4xl">📦</span>
                )}
              </div>

              {/* Product Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="blue" className="text-[10px]">✓ AI Verified</Badge>
                  <Badge variant={item.condition_score >= 80 ? 'green' : item.condition_score >= 50 ? 'amber' : 'red'}>
                    {item.condition_grade}
                  </Badge>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{item.product_name}</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-brand-green">
                      ₹{Number(item.estimated_value || 0).toLocaleString()}
                    </p>
                    {item.original_price && (
                      <p className="text-xs text-gray-400 line-through">
                        ₹{Number(item.original_price).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Score</p>
                    <p className="font-bold" style={{ color: getScoreColor(item.condition_score || 0) }}>
                      {item.condition_score}/100
                    </p>
                  </div>
                </div>
                {item.green_impact_kg && (
                  <p className="text-xs text-brand-green">🌱 Saves {item.green_impact_kg}kg CO₂</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-xl">
          <p className="text-4xl mb-3">🏪</p>
          <p className="text-gray-500 text-sm">No listings yet. Be the first to list a product!</p>
          <Link href="/sell" className="text-brand-green hover:underline text-sm mt-2 inline-block">
            List a Product →
          </Link>
        </div>
      )}
    </div>
  )
}
