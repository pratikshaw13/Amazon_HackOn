'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Shield, LayoutDashboard, Package, RotateCcw, Truck, Zap, BarChart3, Leaf, LogOut } from 'lucide-react'

const sellerNavItems = [
  { href: '/seller-portal', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/seller-portal/inventory', label: 'Inventory', icon: Package },
  { href: '/seller-portal/returns', label: 'Returns', icon: RotateCcw },
  { href: '/seller-portal/routing', label: 'Routing', icon: Truck },
  { href: '/seller-portal/rescue', label: 'Rescue Engine', icon: Zap },
  { href: '/seller-portal/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/seller-portal/green', label: 'Green Impact', icon: Leaf },
]

export default function SellerPortalLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [seller, setSeller] = useState(null)

  useEffect(() => {
    // Check if on login page
    if (pathname === '/seller-portal/login') return

    // Check seller auth
    const token = localStorage.getItem('sl_certified_seller_token')
    const sellerData = localStorage.getItem('sl_certified_seller')
    if (!token || !sellerData) {
      router.replace('/seller-portal/login')
      return
    }
    setSeller(JSON.parse(sellerData))
  }, [pathname, router])

  // Login page — render without layout
  if (pathname === '/seller-portal/login') {
    return children
  }

  // Not authenticated yet — show nothing while redirecting
  if (!seller) return null

  function handleLogout() {
    localStorage.removeItem('sl_certified_seller_token')
    localStorage.removeItem('sl_certified_seller')
    router.push('/seller-portal/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Seller Navbar */}
      <header className="sticky top-0 z-50">
        {/* Row 1 */}
        <div className="bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
            <Link href="/seller-portal" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-brand-green" />
              <span className="font-bold text-sm">
                SecondLife <span className="text-brand-green">Seller Portal</span>
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-gray-400">{seller.company_name}</p>
                <p className="text-sm font-medium">{seller.seller_name} <span className="text-xs text-gray-400">({seller.seller_id})</span></p>
              </div>
              <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-white rounded transition" title="Logout">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2 — Nav */}
        <div className="bg-gray-800 text-white border-t border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 h-10 overflow-x-auto">
            {sellerNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition ${
                    isActive ? 'bg-gray-700 text-brand-green' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}>
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}
