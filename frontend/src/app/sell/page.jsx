'use client'

import { useState } from 'react'
import PhotoUploader from '../../components/features/PhotoUploader'
import ValuationResult from '../../components/features/ValuationResult'
import { valuationApi } from '../../lib/api'
import { CATEGORIES } from '../../lib/constants'
import { Sparkles, ArrowRight } from 'lucide-react'

export default function SellPage() {
  const [category, setCategory] = useState('')
  const [productName, setProductName] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [actionTaken, setActionTaken] = useState(null)

  const handleAnalyse = async (files) => {
    if (!category) {
      setError('Please select a product category')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    files.forEach(file => formData.append('images', file))
    formData.append('category', category)
    formData.append('product_name', productName || `${category} Item`)
    formData.append('original_price', originalPrice || '5000')

    try {
      const response = await valuationApi.analyse(formData)
      setResult(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.')
      console.error('Valuation error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAction = (action) => {
    setActionTaken(action)
  }

  if (actionTaken) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="text-6xl mb-4">
          {actionTaken === 'list' ? '🏷️' : actionTaken === 'buyback' ? '💳' : '💚'}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {actionTaken === 'list' && 'Product Listed Successfully!'}
          {actionTaken === 'buyback' && 'Buyback Credit Applied!'}
          {actionTaken === 'donate' && 'Donation Scheduled!'}
        </h2>
        <p className="text-gray-500 mb-6">
          {actionTaken === 'list' && `Your ${result?.product_name} is now live on SecondLife Marketplace.`}
          {actionTaken === 'buyback' && `₹${result?.routing?.buyback_offer?.toLocaleString()} Amazon credit has been added to your account.`}
          {actionTaken === 'donate' && 'Your item will be picked up within 3-5 business days. +75 Green Credits earned!'}
        </p>
        <div className="flex gap-3 justify-center">
          <a href="/marketplace" className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-lg font-medium hover:bg-brand-green-dark">
            View Marketplace <ArrowRight className="h-4 w-4" />
          </a>
          <button
            onClick={() => { setActionTaken(null); setResult(null) }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
          >
            List Another Item
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-brand-green" />
          Sell or Donate Your Product
        </h1>
        <p className="text-gray-500 mt-1">
          Upload photos and our AI will assess condition, suggest pricing, and find the best buyer.
        </p>
      </div>

      {/* Product Info */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-widest mb-1.5">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green"
            >
              <option value="">Select category</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-widest mb-1.5">
              Product Name
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g., Dell Monitor 27 inch"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-widest mb-1.5">
              Original Price (₹)
            </label>
            <input
              type="number"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              placeholder="e.g., 24999"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green"
            />
          </div>
        </div>
      </div>

      {/* Photo Upload */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Product Photos</p>
        <PhotoUploader onAnalyse={handleAnalyse} isLoading={isLoading} />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-brand-red-light border border-brand-red/20 rounded-xl p-4 text-sm text-brand-red">
          ⚠️ {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white border border-gray-100 rounded-xl p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 border-3 border-gray-200 border-t-brand-green rounded-full animate-spin" style={{ borderWidth: '3px' }} />
            <p className="text-sm font-medium text-gray-600">AI is analysing your product...</p>
            <p className="text-xs text-gray-400">Condition Agent → Demand Agent → Routing Agent</p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && <ValuationResult result={result} onAction={handleAction} />}
    </div>
  )
}
