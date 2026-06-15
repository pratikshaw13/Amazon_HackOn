'use client'

import { usePathname } from 'next/navigation'

export default function ContentWrapper({ children }) {
  const pathname = usePathname()

  // These portals have their own full-width layouts — don't wrap them
  const isPortal = pathname.startsWith('/seller-portal') || pathname.startsWith('/delivery-portal')

  if (isPortal) {
    return <>{children}</>
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {children}
    </main>
  )
}
