'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Shield, AlertCircle, Eye, EyeOff } from 'lucide-react'
import api from '../../../lib/api'

export default function CertifiedSellerLoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({ seller_id: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function validate() {
    const e = {}
    if (!formData.seller_id.trim()) e.seller_id = 'Seller ID is required'
    else if (!formData.seller_id.startsWith('AMZ-SELLER-')) e.seller_id = 'Format: AMZ-SELLER-XXXX'
    if (!formData.email.trim()) e.email = 'Email is required'
    if (!formData.password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBanner('')
    if (!validate()) return

    setLoading(true)
    try {
      const res = await api.post('/api/v1/certified-seller/login', {
        seller_id: formData.seller_id.trim().toUpperCase(),
        email: formData.email.trim(),
        password: formData.password,
      })
      // Store seller token
      localStorage.setItem('sl_certified_seller_token', res.data.access_token)
      localStorage.setItem('sl_certified_seller', JSON.stringify({
        seller_id: res.data.seller_id,
        seller_name: res.data.seller_name,
        company_name: res.data.company_name,
        warehouse_city: res.data.warehouse_city,
      }))
      router.push('/seller-portal')
    } catch (err) {
      setBanner(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center px-4 py-8">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-10 w-10 text-brand-green" />
        <div>
          <span className="font-bold text-xl text-white block">SecondLife</span>
          <span className="text-xs text-green-400 font-medium tracking-wider uppercase">Certified Seller Portal</span>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-xl p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Seller Sign In</h1>
        <p className="text-sm text-gray-500 mb-6">Pre-approved Amazon certified sellers only</p>

        {banner && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2.5 mb-4 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{banner}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Seller ID */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Seller ID</label>
            <input
              type="text"
              value={formData.seller_id}
              onChange={e => setFormData(p => ({ ...p, seller_id: e.target.value.toUpperCase() }))}
              placeholder="AMZ-SELLER-1001"
              className={`w-full px-3 py-2 border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green ${errors.seller_id ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.seller_id && <p className="mt-1 text-xs text-red-600">{errors.seller_id}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Registered Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
              placeholder="you@company.in"
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                className={`w-full px-3 py-2 pr-10 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
              />
              <button type="button" onClick={() => setShowPassword(p => !p)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-brand-green hover:bg-brand-green-dark text-white font-semibold text-sm rounded-md transition disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign in to Seller Portal'}
          </button>
        </form>

        {/* Info */}
        <div className="mt-5 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong className="text-gray-700">Note:</strong> This portal is for Amazon-certified sellers only.
            Seller accounts are pre-approved and cannot be self-registered.
            Contact your Amazon account manager for access.
          </p>
        </div>
      </div>

      {/* Back to user login */}
      <p className="mt-6 text-sm text-gray-400">
        Not a seller?{' '}
        <Link href="/login" className="text-brand-green hover:underline font-medium">Customer Sign In</Link>
      </p>

      {/* Demo credentials hint */}
      <div className="mt-4 w-full max-w-md bg-gray-800/50 border border-gray-700 rounded-lg p-3">
        <p className="text-xs text-gray-400 font-medium mb-1">Demo Credentials:</p>
        <p className="text-xs text-gray-500 font-mono">ID: AMZ-SELLER-1001</p>
        <p className="text-xs text-gray-500 font-mono">Email: rajesh@techvista.in</p>
        <p className="text-xs text-gray-500 font-mono">Password: Seller@123</p>
      </div>
    </div>
  )
}
