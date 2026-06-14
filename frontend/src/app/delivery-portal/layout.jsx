'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Truck, LayoutDashboard, MapPin, Package, Clock, DollarSign, LogOut, Leaf, Navigation, ChevronDown, X } from 'lucide-react'

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
        {/* Row 1 */}
        <div className="bg-amber-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
            <Link href="/delivery-portal" className="flex items-center gap-2">
              <Truck className="h-6 w-6" />
              <span className="font-bold text-sm">SecondLife <span className="text-amber-200">Flex</span></span>
            </Link>
            <RiderCitySelector partner={partner} />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Leaf className="h-4 w-4 text-amber-200" />
                <span className="text-amber-100 text-xs font-medium">Earning Green Credits</span>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs text-amber-200">{partner.city} • {partner.vehicle_type}</p>
                <p className="text-sm font-medium">{partner.partner_name}</p>
              </div>
              <button onClick={handleLogout} className="p-2 text-amber-200 hover:text-white rounded" title="Logout">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2 — Nav */}
        <div className="bg-amber-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 h-10 overflow-x-auto">
            {navItems.map(item => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition ${
                    isActive ? 'bg-amber-800 text-white' : 'text-amber-100 hover:text-white hover:bg-amber-800'
                  }`}>
                  <Icon className="h-3.5 w-3.5" /> {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}

const RIDER_CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai",
  "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Kochi",
  "Lucknow", "Chandigarh", "Siliguri", "Indore", "Nagpur",
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
    // Update partner record in backend
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
          const mapped = STATE_TO_CITY[state]
          const detected = data.address?.city || data.address?.town || ''
          const matched = RIDER_CITIES.find(c => detected.toLowerCase().includes(c.toLowerCase()))
          selectCity(matched || mapped || detected || 'Mumbai')
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
        className="flex items-center gap-1 text-xs text-amber-100 hover:text-white px-2 py-1 rounded transition">
        <MapPin className="h-3.5 w-3.5 text-amber-300" />
        <span className="font-medium">{city || 'Select City'}</span>
        <ChevronDown className="h-3 w-3" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <button onClick={handleGPS} disabled={gpsLoading}
              className="w-full flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 disabled:opacity-50">
              <Navigation className="h-3.5 w-3.5" />
              {gpsLoading ? 'Detecting...' : 'Use GPS Location'}
            </button>
          </div>
          <div className="max-h-44 overflow-y-auto p-1">
            {RIDER_CITIES.map(c => (
              <button key={c} onClick={() => selectCity(c)}
                className={`w-full text-left px-3 py-1.5 rounded text-xs transition ${city === c ? 'bg-amber-100 text-amber-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
