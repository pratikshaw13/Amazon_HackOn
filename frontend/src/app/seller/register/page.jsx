'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Store, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { sellerApi } from '../../../lib/api'

export default function SellerRegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    seller_name: '',
    business_name: '',
    phone: '',
    email: '',
    password: '',
    warehouse_location: '',
  })
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function validate() {
    const e = {}
    if (!formData.seller_name.trim()) e.seller_name = 'Name is required'
    if (!formData.email.trim()) e.email = 'Email is required'
    if (!formData.phone.trim()) e.phone = 'Phone is required'
    if (!formData.password || formData.password.length < 8) e.password = 'Min 8 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBanner('')
    if (!validate()) return

    setLoading(true)
    try {
      await sellerApi.register({
        seller_name: formData.seller_name.trim(),
        business_name: formData.business_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        password: formData.password,
        warehouse_location: formData.warehouse_location.trim(),
      })
      router.push('/seller/login?registered=true')
    } catch (err) {
      setBanner(err.response?.data?.detail || 'Registration failed.')
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

      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-medium text-gray-900 mb-1">Register as Seller</h1>
        <p className="text-sm text-gray-500 mb-5">
          Already registered?{' '}
          <Link href="/seller/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
        </p>

        {banner && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2.5 mb-4 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{banner}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Your Name *</label>
              <input type="text" value={formData.seller_name}
                onChange={e => setFormData(p => ({ ...p, seller_name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-green ${errors.seller_name ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.seller_name && <p className="mt-1 text-xs text-red-600">{errors.seller_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Business Name</label>
              <input type="text" value={formData.business_name}
                onChange={e => setFormData(p => ({ ...p, business_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Email *</label>
            <input type="email" value={formData.email}
              onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-green ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Phone *</label>
            <input type="tel" value={formData.phone}
              onChange={e => setFormData(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
              placeholder="10-digit number" maxLength={10}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-green ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Warehouse Location</label>
            <select value={formData.warehouse_location}
              onChange={e => setFormData(p => ({ ...p, warehouse_location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-green">
              <option value="">Select city</option>
              {['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Kochi'].map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Password * (min 8 chars)</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={formData.password}
                onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                className={`w-full px-3 py-2 pr-10 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-green ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
              />
              <button type="button" onClick={() => setShowPassword(p => !p)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 px-4 bg-brand-green hover:bg-brand-green-dark text-white font-medium text-sm rounded-md transition disabled:opacity-60">
            {loading ? 'Registering…' : 'Register as Seller'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-sm text-gray-500">
        Not a seller?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">Sign in as customer</Link>
      </p>
    </div>
  )
}
