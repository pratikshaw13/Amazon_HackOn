'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Shield, LayoutDashboard, Package, RotateCcw, BarChart3, Leaf, LogOut, MapPin, ChevronDown, Navigation } from 'lucide-react'
import api from '../../lib/api'
import DarkModeToggle from '../../components/ui/DarkModeToggle'

const sellerNavItems = [
  { href: '/seller-portal', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/seller-portal/warehouses', label: 'Warehouses', icon: Package },
  { href: '/seller-portal/returns', label: 'Returns', icon: RotateCcw },
  { href: '/seller-portal/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/seller-portal/green', label: 'Green Impact', icon: Leaf },
]

export default function SellerPortalLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [seller, setSeller] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [returnsCount, setReturnsCount] = useState(0)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (pathname === '/seller-portal/login') return
    const token = localStorage.getItem('sl_certified_seller_token')
    const sellerData = localStorage.getItem('sl_certified_seller')
    if (!token || !sellerData) {
      router.replace('/seller-portal/login')
      return
    }
    setSeller(JSON.parse(sellerData))
  }, [pathname, router])

  // Fetch pending returns count for badge
  useEffect(() => {
    if (!seller) return
    async function fetchReturnsCount() {
      try {
        const token = localStorage.getItem('sl_certified_seller_token')
        const res = await api.get('/api/v1/certified-seller/returns', { headers: { Authorization: `Bearer ${token}` } })
        const returns = res.data.returns || []
        const pending = returns.filter(r => ['pending', 'rider_assigned', 'picked_up'].includes(r.status))
        setReturnsCount(pending.length)
      } catch {}
    }
    fetchReturnsCount()
    const interval = setInterval(fetchReturnsCount, 15000)
    return () => clearInterval(interval)
  }, [seller])

  // Clear badge when visiting returns
  useEffect(() => {
    if (pathname === '/seller-portal/returns') setReturnsCount(0)
  }, [pathname])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (pathname === '/seller-portal/login') return children
  if (!seller) return null

  function handleLogout() {
    localStorage.removeItem('sl_certified_seller_token')
    localStorage.removeItem('sl_certified_seller')
    router.push('/seller-portal/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50">
        {/* Row 1 */}
        <div className="bg-gray-900 text-white">
          <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
            <Link href="/seller-portal" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-brand-green" />
              <span className="font-bold text-sm">
                SecondLife <span className="text-brand-green">Seller Portal</span>
              </span>
            </Link>

            {/* Center: City Selector */}
            <SellerCitySelector seller={seller} />

            {/* Right: Hello Name + Dropdown */}
            <div className="flex items-center gap-3" ref={dropdownRef}>
              {/* Dark Mode Toggle */}
              <DarkModeToggle />

              <div className="relative">
                <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-1 text-sm hover:text-brand-green transition">
                  <span className="text-xs text-gray-400">Hello,</span>
                  <span className="font-medium text-white text-sm">{seller.seller_name?.split(' ')[0]}</span>
                  <ChevronDown className="h-3 w-3 text-gray-400" />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                    <div className="p-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{seller.seller_name}</p>
                      <p className="text-xs text-gray-400">{seller.company_name}</p>
                      <p className="text-[10px] text-gray-300 mt-0.5">{seller.seller_id}</p>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 — Nav (center-aligned) */}
        <div className="bg-gray-800 text-white border-t border-gray-700">
          <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-center gap-1 h-10 overflow-x-auto">
            {sellerNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition ${
                    isActive ? 'bg-gray-700 text-brand-green' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}>
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                  {item.href === '/seller-portal/returns' && returnsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {returnsCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}


const SELLER_CITIES = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Kochi", "Lucknow", "Chandigarh"]
const STATE_TO_CITY_SELLER = {
  "west bengal": "Kolkata", "maharashtra": "Mumbai", "karnataka": "Bengaluru",
  "telangana": "Hyderabad", "tamil nadu": "Chennai", "delhi": "Delhi",
  "rajasthan": "Jaipur", "gujarat": "Ahmedabad", "kerala": "Kochi",
  "uttar pradesh": "Lucknow", "punjab": "Chandigarh",
}

function SellerCitySelector({ seller }) {
  const [city, setCity] = useState(seller?.warehouse_city || seller?.city || '')
  const [isOpen, setIsOpen] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)

  function selectCity(c) {
    setCity(c)
    setIsOpen(false)
    const token = localStorage.getItem('sl_certified_seller_token')
    if (token) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/certified-seller/update-city`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ city: c })
      }).catch(() => {})
    }
  }

  async function handleGPS() {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&addressdetails=1`)
          const data = await res.json()
          const state = (data.address?.state || '').toLowerCase()
          const district = (data.address?.county || data.address?.state_district || '').toLowerCase()
          const mapped = STATE_TO_CITY_SELLER[state]
          const detected = data.address?.city || data.address?.town || ''
          const matched = SELLER_CITIES.find(c => detected.toLowerCase().includes(c.toLowerCase()) || district.includes(c.toLowerCase()))
          selectCity(matched || mapped || 'Mumbai')
        } catch { selectCity('Mumbai') }
        finally { setGpsLoading(false) }
      },
      () => { setGpsLoading(false) },
      { timeout: 10000 }
    )
  }

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs text-gray-300 hover:text-white px-2 py-1 rounded transition">
        <MapPin className="h-3.5 w-3.5 text-brand-green" />
        <span className="font-medium">{city || 'Select City'}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <button onClick={handleGPS} disabled={gpsLoading}
              className="w-full flex items-center gap-2 px-3 py-2 bg-brand-green-light text-brand-green rounded-lg text-xs font-medium hover:bg-brand-green/20 disabled:opacity-50">
              <Navigation className="h-3.5 w-3.5" />
              {gpsLoading ? 'Detecting...' : '📍 Detect Location'}
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto p-1">
            {SELLER_CITIES.map(c => (
              <button key={c} onClick={() => selectCity(c)}
                className={`w-full text-left px-3 py-1.5 rounded text-xs transition ${city === c ? 'bg-brand-green-light text-brand-green font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
