'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Leaf, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { authApi } from '../../lib/api'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
    remember_me: false,
  })
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function validate() {
    const e = {}
    if (!formData.identifier.trim()) e.identifier = 'This field is required'
    if (!formData.password) e.password = 'This field is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBanner('')
    if (!validate()) return

    setLoading(true)
    try {
      const res = await authApi.login({
        identifier: formData.identifier.trim(),
        password: formData.password,
        remember_me: formData.remember_me,
      })
      login(res.data.access_token, {
        user_id: res.data.user_id,
        name: res.data.name,
        email: res.data.email,
      })
      router.push('/')
    } catch (err) {
      const status = err.response?.status
      const detail = err.response?.data?.detail
      if (status === 401 || status === 429) {
        setBanner(detail || 'Invalid credentials')
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
        <h1 className="text-2xl font-medium text-gray-900 mb-5">Sign in</h1>

        {/* Error banner */}
        {banner && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2.5 mb-4 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{banner}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Email or Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Email or mobile number
            </label>
            <input
              type="text"
              value={formData.identifier}
              onChange={e => setFormData(p => ({ ...p, identifier: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-brand-amber transition ${
                errors.identifier ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              autoComplete="username"
            />
            {errors.identifier && (
              <p className="mt-1 text-xs text-red-600">{errors.identifier}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-gray-800">Password</label>
              <a href="#" className="text-xs text-blue-600 hover:text-blue-800 hover:underline">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                className={`w-full px-3 py-2 pr-10 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-brand-amber transition ${
                  errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2">
            <input
              id="remember"
              type="checkbox"
              checked={formData.remember_me}
              onChange={e => setFormData(p => ({ ...p, remember_me: e.target.checked }))}
              className="h-4 w-4 accent-brand-amber"
            />
            <label htmlFor="remember" className="text-sm text-gray-700 select-none cursor-pointer">
              Keep me signed in
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-brand-amber hover:bg-amber-500 text-white font-medium text-sm rounded-md transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Amazon-style legal note */}
        <p className="text-xs text-gray-500 mt-4 leading-relaxed">
          By continuing, you agree to SecondLife AI&apos;s{' '}
          <a href="#" className="text-blue-600 hover:underline">Conditions of Use</a>
          {' '}and{' '}
          <a href="#" className="text-blue-600 hover:underline">Privacy Notice</a>.
        </p>
      </div>

      {/* Divider */}
      <div className="w-full max-w-sm flex items-center gap-3 my-5">
        <hr className="flex-1 border-gray-300" />
        <span className="text-xs text-gray-400 whitespace-nowrap">New to SecondLife AI?</span>
        <hr className="flex-1 border-gray-300" />
      </div>

      {/* Create account */}
      <div className="w-full max-w-sm">
        <Link
          href="/register"
          className="block w-full text-center py-2 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium text-sm rounded-md transition shadow-sm"
        >
          Create your SecondLife account
        </Link>
      </div>

      {/* Seller link */}
      <div className="w-full max-w-sm mt-6 pt-4 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-500">
          Are you an Amazon Certified Seller?{' '}
          <Link href="/seller-portal/login" className="text-brand-green font-medium hover:underline">
            Click here
          </Link>
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Want to earn as a Delivery Partner?{' '}
          <Link href="/delivery-portal/login" className="text-brand-amber font-medium hover:underline">
            Join SecondLife Flex
          </Link>
        </p>
      </div>
    </div>
  )
}
