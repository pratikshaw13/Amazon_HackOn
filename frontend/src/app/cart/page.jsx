'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cartApi } from '../../lib/api'
import { useCart } from '../../context/CartContext'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { ShoppingCart, Trash2, CreditCard, Leaf, CheckCircle } from 'lucide-react'

export default function CartPage() {
  const router = useRouter()
  const { refreshCart, decrementCart } = useCart()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutResult, setCheckoutResult] = useState(null)

  useEffect(() => { fetchCart() }, [])

  async function fetchCart() {
    try {
      const res = await cartApi.get()
      setCart(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(productId) {
    await cartApi.remove(productId)
    decrementCart()
    fetchCart()
  }

  async function handleCheckout() {
    setCheckoutLoading(true)
    try {
      const res = await cartApi.checkout({ shipping_address: "Demo Address, India" })
      setCheckoutResult(res.data)
      setCart({ items: [], sold_items: [], count: 0, total: 0 })
      refreshCart()
    } catch (err) {
      console.error(err)
    } finally {
      setCheckoutLoading(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading cart..." />

  if (checkoutResult) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <CheckCircle className="h-16 w-16 text-brand-green mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
        <p className="text-gray-500 mb-2">{checkoutResult.message}</p>
        <p className="text-brand-green font-medium mb-6">
          +{checkoutResult.green_credits_earned} Green Credits earned 🌱
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => router.push('/orders')}
            className="px-4 py-2 bg-brand-green text-white rounded-lg font-medium hover:bg-brand-green-dark">
            View Orders
          </button>
          <button onClick={() => router.push('/marketplace')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
            Continue Shopping
          </button>
        </div>
      </div>
    )
  }

  const items = cart?.items || []
  const soldItems = cart?.sold_items || []

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <ShoppingCart className="h-6 w-6" /> Shopping Cart
      </h1>

      {/* Sold items notification */}
      {soldItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-amber-700">⚠️ Some items in your cart are no longer available:</p>
          {soldItems.map(item => (
            <div key={item.product_id} className="flex items-center gap-2 text-sm text-gray-500">
              <span className="line-through">{item.product_name}</span>
              <span className="text-xs text-red-500 font-medium">— Sold to another buyer</span>
            </div>
          ))}
          <p className="text-xs text-gray-400">These items have been automatically removed from your cart.</p>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Your cart is empty</p>
          <button onClick={() => router.push('/marketplace')}
            className="px-4 py-2 bg-brand-green text-white rounded-lg font-medium">
            Browse Marketplace
          </button>
        </div>
      ) : (
        <>
          {/* Cart items */}
          <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.product_id} className="p-4 flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                  {item.image_urls?.[0]?.startsWith('http') ? (
                    <img src={item.image_urls[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{item.product_name}</h3>
                  <p className="text-xs text-gray-400">{item.category} • {item.condition_grade}</p>
                </div>
                <p className="text-lg font-bold text-brand-green flex-shrink-0">
                  ₹{Number(item.estimated_value || 0).toLocaleString()}
                </p>
                <button onClick={() => handleRemove(item.product_id)}
                  className="p-2 text-gray-400 hover:text-red-500 flex-shrink-0">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal ({items.length} items)</span>
              <span className="font-medium">₹{Number(cart.total || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Shipping</span>
              <span className="text-brand-green font-medium">FREE</span>
            </div>
            <div className="flex justify-between items-center text-sm text-brand-green">
              <span className="flex items-center gap-1"><Leaf className="h-3.5 w-3.5" /> Green Credits earned</span>
              <span className="font-medium">+{cart.green_credits_on_purchase}</span>
            </div>
            <hr className="border-gray-100" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-brand-green">₹{Number(cart.total || 0).toLocaleString()}</span>
            </div>

            <button onClick={handleCheckout} disabled={checkoutLoading}
              className="w-full py-3 mt-2 bg-brand-amber hover:bg-amber-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
              <CreditCard className="h-4 w-4" /> {checkoutLoading ? 'Processing...' : 'Proceed to Checkout'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
