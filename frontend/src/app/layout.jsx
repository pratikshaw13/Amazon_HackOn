import '../styles/globals.css'
import Navbar from '../components/layout/Navbar'
import ProtectedRoute from '../components/layout/ProtectedRoute'
import { AuthProvider } from '../context/AuthContext'
import { CartProvider } from '../context/CartContext'
import ContentWrapper from '../components/layout/ContentWrapper'

export const metadata = {
  title: 'Amazon SecondLife AI',
  description: 'AI-powered returns and sustainable resale platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <AuthProvider>
          <CartProvider>
            <ProtectedRoute>
              <Navbar />
              <ContentWrapper>
                {children}
              </ContentWrapper>
            </ProtectedRoute>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
