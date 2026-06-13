'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const AuthContext = createContext(null)

/**
 * Decode JWT payload (base64url → JSON). No signature verification — that
 * happens on the server. Only used client-side to read name/email/exp.
 */
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    return JSON.parse(json)
  } catch {
    return null
  }
}

function isTokenValid(token) {
  const payload = decodeJwtPayload(token)
  if (!payload || !payload.exp) return false
  // exp is in seconds; Date.now() is in ms
  return payload.exp > Date.now() / 1000
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Initialize from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('sl_token')
    if (token && isTokenValid(token)) {
      const payload = decodeJwtPayload(token)
      setUser({
        user_id: payload.sub,
        name: payload.name,
        email: payload.email,
      })
      setIsAuthenticated(true)
    } else {
      // Remove stale/expired token
      localStorage.removeItem('sl_token')
      setUser(null)
      setIsAuthenticated(false)
    }
    setLoading(false)
  }, [])

  const login = useCallback((token, userData) => {
    localStorage.setItem('sl_token', token)
    const payload = decodeJwtPayload(token)
    const resolvedUser = userData || {
      user_id: payload?.sub,
      name: payload?.name,
      email: payload?.email,
    }
    setUser(resolvedUser)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('sl_token')
    setUser(null)
    setIsAuthenticated(false)
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
