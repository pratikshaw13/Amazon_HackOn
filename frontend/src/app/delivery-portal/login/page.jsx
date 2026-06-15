'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Truck, AlertCircle } from 'lucide-react'
import api from '../../../lib/api'

export default function DeliveryPartnerLoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({ partner_id: '', phone: '', aadhaar_last4: '' })
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)

  function validate() {
    const e = {}
    if (!formData.partner_id.trim()) e.partner_id = 'Partner ID is required'
    else if (!formData.partner_id.startsWith('FLEX-DEL-')) e.partner_id = 'Format: FLEX-DEL-XXXX'
    if (!formData.phone.trim() || formData.phone.length < 10) e.phone = 'Valid 10-digit phone required'
    if (!formData.aadhaar_last4.trim() || formData.aadhaar_last4.length !== 4) e.aadhaar_last4 = 'Enter last 4 digits of Aadhaar'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBanner('')
    if (!validate()) return

    setLoading(true)
    try {
      const res = await api.post('/api/v1/delivery-partner/login', {
        partner_id: formData.partner_id.trim().toUpperCase(),
        phone: formData.phone.trim(),
        aadhaar_last4: formData.aadhaar_last4.trim(),
      })
      localStorage.setItem('sl_delivery_token', res.data.access_token)
      localStorage.setItem('sl_delivery_partner', JSON.stringify({
        partner_id: res.data.partner_id,
        partner_name: res.data.partner_name,
        city: res.data.city,
        vehicle_type: res.data.vehicle_type,
      }))
      router.push('/delivery-portal')
    } catch (err) {
      setBanner(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-700 via-amber-600 to-amber-800 flex flex-col items-center justify-center px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Truck className="h-10 w-10 text-white" />
        <div>
          <span className="font-bold text-xl text-white block">SecondLife Flex</span>
          <span className="text-xs text-amber-200 font-medium tracking-wider uppercase">Delivery Partner Portal</span>
        </div>
      </div>

      <div className="w-full max-w-md bg-white rounded-xl p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Partner Sign In</h1>
        <p className="text-sm text-gray-500 mb-6">Pre-approved delivery partners only</p>

        {banner && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2.5 mb-4 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{banner}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Partner ID</label>
            <input type="text" value={formData.partner_id}
              onChange={e => setFormData(p => ({ ...p, partner_id: e.target.value.toUpperCase() }))}
              placeholder="FLEX-DEL-1001"
              className={`w-full px-3 py-2 border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-brand-amber ${errors.partner_id ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.partner_id && <p className="mt-1 text-xs text-red-600">{errors.partner_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Registered Phone</label>
            <input type="tel" value={formData.phone} maxLength={10}
              onChange={e => setFormData(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
              placeholder="10-digit mobile number"
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-brand-amber ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Aadhaar Last 4 Digits</label>
            <input type="text" value={formData.aadhaar_last4} maxLength={4}
              onChange={e => setFormData(p => ({ ...p, aadhaar_last4: e.target.value.replace(/\D/g, '') }))}
              placeholder="XXXX"
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-brand-amber ${errors.aadhaar_last4 ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.aadhaar_last4 && <p className="mt-1 text-xs text-red-600">{errors.aadhaar_last4}</p>}
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-brand-amber hover:bg-amber-500 text-white font-semibold text-sm rounded-md transition disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign in as Delivery Partner'}
          </button>
        </form>

        <div className="mt-5 p-3 bg-amber-50 rounded-lg">
          <p className="text-xs text-gray-600 leading-relaxed">
            <strong>Earn ₹470/4hr + ₹15-20 per delivery + Green Credits.</strong> Pick up pre-owned products from sellers and deliver to nearest Amazon warehouse.
          </p>
        </div>
      </div>

      <p className="mt-6 text-sm text-amber-100">
        Not a delivery partner?{' '}
        <Link href="/login" className="text-white hover:underline font-medium">Customer Sign In</Link>
      </p>

      <div className="mt-4 w-full max-w-md bg-white/10 border border-amber-400/30 rounded-lg p-3">
        <p className="text-xs text-amber-100 font-medium mb-1">Demo Credentials:</p>
        <p className="text-xs text-amber-200 font-mono">ID: FLEX-DEL-1001</p>
        <p className="text-xs text-amber-200 font-mono">Phone: 9876543210</p>
        <p className="text-xs text-amber-200 font-mono">Aadhaar Last 4: 4532</p>
      </div>
    </div>
  )
}
