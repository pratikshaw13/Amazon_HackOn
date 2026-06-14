'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Truck, LayoutDashboard, MapPin, Package, Clock, DollarSign, LogOut, Leaf } from 'lucide-react'

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
