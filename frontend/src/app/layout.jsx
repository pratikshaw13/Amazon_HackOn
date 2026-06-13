import '../styles/globals.css'
import Navbar from '../components/layout/Navbar'
import { AuthProvider } from '../context/AuthContext'

export const metadata = {
  title: 'Amazon SecondLife AI',
  description: 'AI-powered returns and sustainable resale platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <AuthProvider>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  )
}
