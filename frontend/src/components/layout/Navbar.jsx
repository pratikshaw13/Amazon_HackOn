'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Leaf, Menu, X, ChevronDown, User, Search, ShoppingCart } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import CitySelector from '../features/CitySelector'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/sell', label: 'Sell Items' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/my-listings', label: 'My Listings' },
  { href: '/orders', label: 'Orders' },
  { href: '/heatmap', label: 'Demand Map' },
  { href: '/seller-portal/login', label: 'Seller Portal' },
  { href: '/prevention', label: 'Return Shield' },
  { href: '/green', label: 'Green Credits' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuth()
  const { cartCount, badgeVisible } = useCart()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef(null)

  // Don't show navbar on login/register pages
  const hideNavbar = ['/login', '/register', '/seller/login', '/seller/register', '/seller-portal/login'].includes(pathname)
    || pathname.startsWith('/seller-portal')
    || pathname.startsWith('/delivery-portal')

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Early return AFTER all hooks
  if (hideNavbar) return null

  function handleSearch(e) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/marketplace?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  function handleLogout() {
    setDropdownOpen(false)
    setMobileOpen(false)
    logout()
  }

  return (
    <header className="sticky top-0 z-50">
      {/* ═══ ROW 1: Logo + Search + User ═══ */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <Leaf className="h-6 w-6 text-brand-green" />
              <span className="font-bold text-base hidden sm:block">
                SecondLife<span className="text-brand-green">.ai</span>
              </span>
            </Link>

            {/* City Selector — BookMyShow style */}
            {isAuthenticated && <CitySelector />}

            {/* Search Bar — centered */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-auto">
              <div className="flex">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search SecondLife marketplace..."
                  className="w-full px-4 py-2 rounded-l-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-amber border-0"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-amber hover:bg-amber-500 rounded-r-md transition-colors"
                  aria-label="Search"
                >
                  <Search className="h-4 w-4 text-gray-900" />
                </button>
              </div>
            </form>

            {/* Cart + User — extreme right */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Cart Icon */}
              {isAuthenticated && (
                <Link href="/cart" className="relative p-2 text-gray-300 hover:text-white transition">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && badgeVisible && (
                    <span className="absolute -top-0.5 -right-0.5 bg-brand-amber text-[10px] font-bold text-white rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
                      {cartCount}
                    </span>
                  )}
                </Link>
              )}

            {/* User Section */}
              {isAuthenticated ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(p => !p)}
                    className="flex flex-col items-start text-xs hover:outline hover:outline-1 hover:outline-white rounded px-2 py-1 transition"
                  >
                    <span className="text-gray-300">Hello, {user?.name?.split(' ')[0] || 'User'}</span>
                    <span className="font-bold text-sm flex items-center gap-0.5">
                      Account <ChevronDown className="h-3 w-3" />
                    </span>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-1 w-52 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 text-gray-800">
                      <p className="px-4 py-2 text-xs text-gray-400 border-b border-gray-100">
                        {user?.email}
                      </p>
                      <Link href="/orders" onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-sm hover:bg-gray-50">My Orders</Link>
                      <Link href="/green" onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-sm hover:bg-gray-50">Green Credits</Link>
                      <Link href="/seller" onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-sm hover:bg-gray-50">Seller Dashboard</Link>
                      <hr className="my-1 border-gray-100" />
                      <button onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="text-xs hover:outline hover:outline-1 hover:outline-white rounded px-2 py-1">
                  <span className="text-gray-300">Hello, Sign in</span>
                  <span className="block font-bold text-sm">Account</span>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded text-gray-300 hover:text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ ROW 2: Navigation Links ═══ */}
      <div className="bg-gray-800 text-white border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop nav */}
          <div className="hidden md:flex items-center justify-center gap-1 h-10 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-gray-700 text-brand-green'
                      : 'text-gray-200 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══ Mobile Menu (slides down) ═══ */}
      {mobileOpen && (
        <div className="md:hidden bg-gray-800 border-t border-gray-700 pb-3">
          <div className="max-w-7xl mx-auto px-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded text-sm font-medium ${
                    isActive ? 'bg-gray-700 text-brand-green' : 'text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
            {isAuthenticated && (
              <button onClick={handleLogout}
                className="block w-full text-left px-3 py-2 mt-2 rounded text-sm text-red-400 hover:bg-gray-700">
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
