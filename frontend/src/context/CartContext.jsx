'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { cartApi } from '../lib/api'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cartCount, setCartCount] = useState(0)
  const [badgeVisible, setBadgeVisible] = useState(false)
  const { isAuthenticated } = useAuth()
  const pathname = usePathname()

  // Fetch cart count on auth change
  useEffect(() => {
    if (isAuthenticated) {
      fetchCartCount()
    } else {
      setCartCount(0)
      setBadgeVisible(false)
    }
  }, [isAuthenticated])

  // Clear badge when visiting /cart
  useEffect(() => {
    if (pathname === '/cart') {
      setBadgeVisible(false)
    }
  }, [pathname])

  async function fetchCartCount() {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('sl_token') : null
      if (!token) return
      const res = await cartApi.get()
      const count = res.data.count || 0
      setCartCount(count)
      setBadgeVisible(count > 0)
    } catch {
      // Silently fail — cart API might not be available yet
    }
  }

  const incrementCart = useCallback(() => {
    setCartCount(prev => prev + 1)
    setBadgeVisible(true)
  }, [])

  const decrementCart = useCallback(() => {
    setCartCount(prev => Math.max(0, prev - 1))
  }, [])

  const refreshCart = useCallback(() => {
    if (isAuthenticated) fetchCartCount()
  }, [isAuthenticated])

  return (
    <CartContext.Provider value={{ cartCount, badgeVisible, incrementCart, decrementCart, refreshCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    // Return safe defaults if used outside CartProvider (e.g., seller/delivery portals)
    return { cartCount: 0, badgeVisible: false, incrementCart: () => {}, decrementCart: () => {}, refreshCart: () => {} }
  }
  return ctx
}

export default CartContext
