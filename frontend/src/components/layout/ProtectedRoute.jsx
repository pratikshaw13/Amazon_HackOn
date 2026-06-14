'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../ui/LoadingSpinner'

// Pages that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/seller/login', '/seller/register', '/seller-portal/login']

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
  // Seller portal and delivery portal have their own auth — don't interfere
  const isSellerPortal = pathname.startsWith('/seller-portal')
  const isDeliveryPortal = pathname.startsWith('/delivery-portal')

  useEffect(() => {
    if (loading) return
    if (!isAuthenticated && !isPublicRoute && !isSellerPortal && !isDeliveryPortal) {
      router.replace('/login')
    }
  }, [isAuthenticated, loading, isPublicRoute, isSellerPortal, isDeliveryPortal, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading..." />
      </div>
    )
  }

  // If not authenticated and not on public route and not special portal, show nothing
  if (!isAuthenticated && !isPublicRoute && !isSellerPortal && !isDeliveryPortal) {
    return null
  }

  return children
}
