'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Truck, LayoutDashboard, MapPin, Package, Clock, DollarSign, LogOut, Leaf, Navigation, ChevronDown, User } from 'lucide-react'
import api from '../../lib/api'
import DarkModeToggle from '../../components/ui/DarkModeToggle'

const navItems = [
  { href: '/delivery-portal', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/delivery-portal/pickups', label: 'Available Pickups', icon: MapPin },
  { href: '/delivery-portal/active', label: 'Active Delivery', icon: Package },
  { href: '/delivery-portal/history', label: 'History', icon: Clock },
  { href: '/delivery-portal/earnings', label: 'Earnings', icon: DollarSign },
]

export default function DeliveryPortalLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [partner, setPartner] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [pickupCount, setPickupCount] = useState(0)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (pathname === '/delivery-portal/login') return
    const token = localStorage.getItem('sl_delivery_token')
    const data = localStorage.getItem('sl_delivery_partner')
    if (!token || !data) {
      router.replace('/delivery-portal/login')
      return
    }
    setPartner(JSON.parse(data))
  }, [pathname, router])

  // Fetch pickup count for badge
  useEffect(() => {
    if (!partner) return
    async function fetchPickupCount() {
      try {
        const token = localStorage.getItem('sl_delivery_token')
        const [pickups, returns] = await Promise.allSettled([
          api.get('/api/v1/full-orders/pickup-queue', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/api/v1/returns/pickup-queue', { headers: { Authorization: `Bearer ${token}` } }),
        ])
        let count = 0
        if (pickups.status === 'fulfilled') count += (pickups.value.data.pickups || []).length
        if (returns.status === 'fulfilled') count += (returns.value.data.return_pickups || []).length
        setPickupCount(count)
      } catch {}
    }
    fetchPickupCount()
    const interval = setInterval(fetchPickupCount, 15000)
    return () => clearInterval(interval)
  }, [partner])

  // Clear badge on visiting pickups
  useEffect(() => {
    if (pathname === '/delivery-portal/pickups') setPickupCount(0)
  }, [pathname])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (pathname === '/delivery-portal/login') return children
  if (!partner) return null

  function handleLogout() {
    localStorage.removeItem('sl_delivery_token')
    localStorage.removeItem('sl_delivery_partner')
    router.push('/delivery-portal/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50">
        {/* Row 1 — Dark theme like buyer portal */}
        <div className="bg-gray-900 text-white">
          <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
            <Link href="/delivery-portal" className="flex items-center gap-2">
              <Truck className="h-6 w-6 text-brand-green" />
              <span className="font-bold text-sm">SecondLife <span className="text-brand-green">Flex</span></span>
            </Link>

            {/* Center: City Selector */}
            <RiderCitySelector partner={partner} />

            {/* Right: Hello Name + Dropdown */}
            <div className="flex items-center gap-3" ref={dropdownRef}>
              {/* Dark Mode Toggle */}
              <DarkModeToggle />

              <div className="flex items-center gap-2 text-sm">
                <Leaf className="h-4 w-4 text-brand-green" />
                <span className="text-gray-300 text-xs font-medium hidden sm:inline">Green Credits</span>
              </div>
              <div className="relative">
                <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-1 text-sm hover:text-brand-green transition">
                  <span className="text-xs text-gray-400">Hello,</span>
                  <span className="font-medium text-white text-sm">{partner.partner_name?.split(' ')[0]}</span>
                  <ChevronDown className="h-3 w-3 text-gray-400" />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                    <div className="p-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{partner.partner_name}</p>
                      <p className="text-xs text-gray-400">{partner.partner_id}</p>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 — Nav (dark) */}
        <div className="bg-gray-800 text-white border-t border-gray-700">
          <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-center gap-1 h-10 overflow-x-auto">
            {navItems.map(item => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition ${
                    isActive ? 'bg-gray-700 text-brand-green' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}>
                  <Icon className="h-3.5 w-3.5" /> {item.label}
                  {item.href === '/delivery-portal/pickups' && pickupCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {pickupCount}
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


const RIDER_CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai",
  "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Kochi",
  "Lucknow", "Chandigarh",
]

const STATE_TO_CITY = {
  "west bengal": "Kolkata", "maharashtra": "Mumbai", "karnataka": "Bengaluru",
  "telangana": "Hyderabad", "tamil nadu": "Chennai", "delhi": "Delhi",
  "rajasthan": "Jaipur", "gujarat": "Ahmedabad", "kerala": "Kochi",
  "uttar pradesh": "Lucknow", "punjab": "Chandigarh",
}

function RiderCitySelector({ partner }) {
  const [city, setCity] = useState(partner?.city || '')
  const [isOpen, setIsOpen] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sl_rider_city')
    if (saved) setCity(saved)
    else if (partner?.city) setCity(partner.city)
  }, [partner])

  function selectCity(c) {
    setCity(c)
    localStorage.setItem('sl_rider_city', c)
    setIsOpen(false)
    updateRiderCity(c)
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
          const mapped = STATE_TO_CITY[state]
          const detected = data.address?.city || data.address?.town || ''
          const matched = RIDER_CITIES.find(c => detected.toLowerCase().includes(c.toLowerCase()) || district.includes(c.toLowerCase()))
          selectCity(matched || mapped || 'Mumbai')
        } catch { selectCity('Mumbai') }
        finally { setGpsLoading(false) }
      },
      () => { setGpsLoading(false) },
      { timeout: 10000 }
    )
  }

  async function updateRiderCity(newCity) {
    try {
      const token = localStorage.getItem('sl_delivery_token')
      if (!token) return
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/delivery-partner/update-city`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ city: newCity })
      })
    } catch {}
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
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <button onClick={handleGPS} disabled={gpsLoading}
              className="w-full flex items-center gap-2 px-3 py-2 bg-brand-green-light text-brand-green rounded-lg text-xs font-medium hover:bg-brand-green/20 disabled:opacity-50">
              <Navigation className="h-3.5 w-3.5" />
              {gpsLoading ? 'Detecting...' : '📍 Detect My Location'}
            </button>
          </div>
          <div className="max-h-44 overflow-y-auto p-1">
            {RIDER_CITIES.map(c => (
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
