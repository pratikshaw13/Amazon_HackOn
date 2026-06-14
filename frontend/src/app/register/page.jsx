'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Leaf, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { authApi } from '../../lib/api'

const PHONE_RE = /^[6-9]\d{9}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirm_password: '',
  })
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function validate() {
    const e = {}
    if (!formData.name.trim()) e.name = 'This field is required'
    else if (formData.name.trim().length > 100) e.name = 'Name must be 100 characters or less'

    if (!formData.phone.trim()) e.phone = 'This field is required'
    else if (!PHONE_RE.test(formData.phone.trim())) e.phone = 'Enter a valid 10-digit Indian mobile number starting with 6–9'

    if (!formData.email.trim()) e.email = 'This field is required'
    else if (!EMAIL_RE.test(formData.email.trim())) e.email = 'Enter a valid email address'

    if (!formData.password) e.password = 'This field is required'
    else if (formData.password.length < 8) e.password = 'Password must be at least 8 characters'
    else if (formData.password.length > 128) e.password = 'Password must be 128 characters or less'

    if (!formData.confirm_password) e.confirm_password = 'This field is required'
    else if (formData.password !== formData.confirm_password) e.confirm_password = 'Passwords do not match'

    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBanner('')
    if (!validate()) return

    setLoading(true)
    try {
      const res = await authApi.register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        confirm_password: formData.confirm_password,
      })
      // Registration successful — redirect to login
      router.push('/login?registered=true')
    } catch (err) {
      const status = err.response?.status
      const detail = err.response?.data?.detail
      if (status === 409) {
        setBanner(detail || 'An account with this information already exists.')
      } else {
        setBanner('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-8 pb-12 px-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-6">
        <Leaf className="h-8 w-8 text-brand-green" />
        <span className="font-bold text-xl text-gray-900">
          SecondLife <span className="text-brand-green">AI</span>
        </span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-medium text-gray-900 mb-1">Create account</h1>
        <p className="text-sm text-gray-500 mb-5">Already a customer?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
        </p>

        {/* Error banner */}
        {banner && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2.5 mb-4 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{banner}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-800 mb-1">Your name</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              maxLength={100}
              autoComplete="name"
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              placeholder="First and last name"
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-brand-amber transition ${errors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          {/* Mobile Number */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-800 mb-1">Mobile number</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                🇮🇳 +91
              </span>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                maxLength={10}
                autoComplete="tel"
                onChange={e => setFormData(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                placeholder="10-digit mobile number"
                className={`flex-1 px-3 py-2 border rounded-r-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-brand-amber transition ${errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
            </div>
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-800 mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              maxLength={254}
              autoComplete="email"
              onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-brand-amber transition ${errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-800 mb-1">Password</label>
            <p className="text-xs text-gray-500 mb-1">At least 8 characters</p>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                maxLength={128}
                autoComplete="new-password"
                onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                className={`w-full px-3 py-2 pr-10 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-brand-amber transition ${errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
              <button type="button" onClick={() => setShowPassword(p => !p)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>

          {/* Re-enter Password */}
          <div>
            <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-800 mb-1">Re-enter password</label>
            <div className="relative">
              <input
                id="confirm_password"
                type={showConfirm ? 'text' : 'password'}
                value={formData.confirm_password}
                maxLength={128}
                autoComplete="new-password"
                onChange={e => setFormData(p => ({ ...p, confirm_password: e.target.value }))}
                className={`w-full px-3 py-2 pr-10 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-brand-amber transition ${errors.confirm_password ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
              <button type="button" onClick={() => setShowConfirm(p => !p)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirm_password && <p className="mt-1 text-xs text-red-600">{errors.confirm_password}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-brand-amber hover:bg-amber-500 text-white font-medium text-sm rounded-md transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Creating account…' : 'Create your SecondLife account'}
          </button>
        </form>

        {/* Legal */}
        <p className="text-xs text-gray-500 mt-4 leading-relaxed">
          By creating an account, you agree to SecondLife AI&apos;s{' '}
          <a href="#" className="text-blue-600 hover:underline">Conditions of Use</a>
          {' '}and{' '}
          <a href="#" className="text-blue-600 hover:underline">Privacy Notice</a>.
        </p>
      </div>

      {/* Already have account */}
      <p className="mt-6 text-sm text-gray-600">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
      </p>

      {/* Seller link */}
      <div className="w-full max-w-sm mt-6 pt-4 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-500">
          Are you an Amazon Certified Seller?{' '}
          <Link href="/seller-portal/login" className="text-brand-green font-medium hover:underline">
            Click here
          </Link>
        </p>
      </div>
    </div>
  )
}
