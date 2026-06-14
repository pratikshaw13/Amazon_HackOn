'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Store, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { sellerApi } from '../../../lib/api'

export default function SellerLoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function validate() {
    const e = {}
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
      const res = await sellerApi.login({
        email: formData.email.trim(),
        password: formData.password,
      })
      // Store seller token separately
      localStorage.setItem('sl_seller_token', res.data.access_token)
      localStorage.setItem('sl_seller', JSON.stringify({
        seller_id: res.data.seller_id,
        seller_name: res.data.seller_name,
      }))
      router.push('/seller')
    } catch (err) {
      setBanner(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-8 pb-12 px-4">
      <Link href="/" className="flex items-center gap-2 mb-6">
        <Store className="h-8 w-8 text-brand-green" />
        <span className="font-bold text-xl text-gray-900">
          SecondLife <span className="text-brand-green">Seller Portal</span>
        </span>
      </Link>

      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-medium text-gray-900 mb-1">Seller Sign In</h1>
        <p className="text-sm text-gray-500 mb-5">Access your seller dashboard</p>

        {banner && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2.5 mb-4 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{banner}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

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
            className="w-full py-2 px-4 bg-brand-green hover:bg-brand-green-dark text-white font-medium text-sm rounded-md transition disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign in as Seller'}
          </button>
        </form>
      </div>

      <div className="w-full max-w-sm flex items-center gap-3 my-5">
        <hr className="flex-1 border-gray-300" />
        <span className="text-xs text-gray-400">New seller?</span>
        <hr className="flex-1 border-gray-300" />
      </div>

      <div className="w-full max-w-sm">
        <Link href="/seller/register"
          className="block w-full text-center py-2 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium text-sm rounded-md shadow-sm">
          Register as Amazon Certified Seller
        </Link>
      </div>

      <p className="mt-6 text-sm text-gray-500">
        Not a seller?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">Sign in as customer</Link>
      </p>
    </div>
  )
}
