'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { marketplaceApi, cartApi, fullOrdersApi } from '../../../lib/api'
import Badge from '../../../components/ui/Badge'
import ProgressBar from '../../../components/ui/ProgressBar'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import { getScoreColor } from '../../../lib/constants'
import { ShoppingCart, Zap, Heart, Shield, Leaf, ArrowLeft, CheckCircle } from 'lucide-react'
import { useCart } from '../../../context/CartContext'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { incrementCart } = useCart()
  const [product, setProduct] = useState(null)
  const [passport, setPassport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    async function fetch() {
      try {
        const res = await marketplaceApi.getListing(params.id)
        setProduct(res.data.product)
        setPassport(res.data.passport)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    if (params.id) fetch()
  }, [params.id])

  async function handleBuyNow() {
    setActionLoading(true)
    try {
      const res = await fullOrdersApi.buy({ product_id: params.id, buyer_city: localStorage.getItem('sl_user_city') || 'Mumbai' })
      setActionMsg(`${res.data.message} Redirecting to tracking...`)
      setProduct(prev => ({ ...prev, status: 'sold' }))
      setTimeout(() => {
        router.push(`/orders/${res.data.order_id}`)
      }, 2000)
    } catch (err) {
      setActionMsg(err.response?.data?.detail || 'Purchase failed')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleAddToCart() {
    try {
      const res = await cartApi.add(params.id)
      setActionMsg('✅ Added to cart!')
      incrementCart()
    } catch (err) {
      setActionMsg(err.response?.data?.detail || 'Failed to add to cart')
    }
  }

  if (loading) return <LoadingSpinner text="Loading product..." />
  if (!product) return <div className="text-center py-16 text-gray-500">Product not found</div>

  const scores = passport?.scores || {}
  const isSold = product.status === 'sold'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Marketplace
      </button>

      {/* Action message */}
      {actionMsg && (
        <div className="bg-brand-green-light border border-brand-green/20 rounded-xl p-4 flex items-center gap-2 text-sm text-brand-green-dark">
          <CheckCircle className="h-5 w-5" /> {actionMsg}
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Image */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
            {product.image_urls && product.image_urls[0]?.startsWith('http') ? (
              <img src={product.image_urls[0]} alt={product.product_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-6xl">📦</span>
            )}
          </div>
          {/* Badges */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {product.amazon_verified && <Badge variant="blue">✓ Amazon Verified</Badge>}
            <Badge variant={product.condition_score >= 80 ? 'green' : product.condition_score >= 50 ? 'amber' : 'red'}>
              {product.condition_grade}
            </Badge>
            <Badge variant="gray">Score: {product.condition_score}/100</Badge>
          </div>
        </div>

        {/* Right: Details + Actions */}
        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest">{product.category}</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{product.product_name}</h1>
          </div>

          {/* Price */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-brand-green">
                ₹{Number(product.estimated_value || 0).toLocaleString()}
              </span>
              {product.original_price && (
                <span className="text-lg text-gray-400 line-through">
                  ₹{Number(product.original_price).toLocaleString()}
                </span>
              )}
            </div>
            {product.original_price && (
              <p className="text-sm text-brand-green mt-1">
                You save ₹{(Number(product.original_price) - Number(product.estimated_value)).toLocaleString()}
                ({Math.round((1 - Number(product.estimated_value) / Number(product.original_price)) * 100)}% off)
              </p>
            )}
          </div>

          {/* Actions */}
          {!isSold ? (
            <div className="space-y-2">
              <button onClick={handleBuyNow} disabled={actionLoading}
                className="w-full py-3 bg-brand-amber hover:bg-amber-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                <Zap className="h-4 w-4" /> {actionLoading ? 'Processing...' : 'Buy Now'}
              </button>
              <button onClick={handleAddToCart}
                className="w-full py-3 bg-white border-2 border-brand-amber text-brand-amber font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-amber-50">
                <ShoppingCart className="h-4 w-4" /> Add to Cart
              </button>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-xl p-4 text-center text-gray-500">
              This product has been sold
            </div>
          )}

          {/* Green Impact */}
          <div className="flex items-center gap-2 p-3 bg-brand-green-light rounded-lg text-sm text-brand-green-dark">
            <Leaf className="h-4 w-4" />
            Buying this saves {product.green_impact_kg}kg CO₂ • Earn 30 Green Credits
          </div>

          {/* Condition breakdown */}
          {passport && scores && (
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Condition Breakdown</p>
              <ProgressBar label="Surface" score={scores.surface || 0} />
              <ProgressBar label="Parts" score={scores.parts || 0} />
              <ProgressBar label="Accessories" score={scores.accessories || 0} />
              <ProgressBar label="Packaging" score={scores.packaging || 0} />
            </div>
          )}

          {/* Info row */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400">Demand</p>
              <p className="font-bold text-gray-700">{product.demand_score || '—'}/100</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400">Buyer Match</p>
              <p className="font-bold text-gray-700">{product.buyer_match_score || '—'}%</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400">City</p>
              <p className="font-bold text-gray-700">{product.city || '—'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
