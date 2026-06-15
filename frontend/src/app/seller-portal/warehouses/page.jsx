'use client'

import { useEffect, useState } from 'react'
import { Warehouse, Package, MapPin, ChevronRight, AlertTriangle, Tag } from 'lucide-react'
import api from '../../../lib/api'

function getSellerToken() { return localStorage.getItem('sl_certified_seller_token') }
function sellerFetch(path) { return api.get(path, { headers: { Authorization: `Bearer ${getSellerToken()}` } }) }

export default function WarehousesPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedCity, setExpandedCity] = useState(null)

  useEffect(() => { fetchData() }, [])

  // Auto-refresh every 10 seconds for live updates
  useEffect(() => {
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    try {
      const res = await sellerFetch('/api/v1/certified-seller/warehouses')
      setData(res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-gray-200 border-t-brand-green rounded-full animate-spin" /></div>

  const warehouses = data?.warehouses || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Warehouse className="h-5 w-5" /> Warehouse Inventory
        </h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{data?.total_warehouses || 0} warehouses</span>
          <span>•</span>
          <span>{data?.total_products || 0} products</span>
        </div>
      </div>

      {warehouses.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          <Warehouse className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No products in warehouses yet.</p>
          <p className="text-xs text-gray-400 mt-1">Products will appear here after customer returns are processed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map(wh => (
            <div key={wh.city} className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition">
              {/* Warehouse Card Header */}
              <button
                onClick={() => setExpandedCity(expandedCity === wh.city ? null : wh.city)}
                className="w-full p-5 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-brand-blue-light flex items-center justify-center">
                      <Warehouse className="h-6 w-6 text-brand-blue" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{wh.city}</h3>
                      <p className="text-xs text-gray-500">{wh.warehouse_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-sm">
                      {wh.count}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-0.5">items</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {wh.address}
                </p>
              </button>

              {/* Expanded: Products in this warehouse */}
              {expandedCity === wh.city && (
                <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3 max-h-64 overflow-y-auto">
                  {wh.products.map(product => (
                    <div key={product.return_id} className="bg-white rounded-lg p-3 border border-gray-100">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                          {product.product_image_url?.startsWith('http') ? (
                            <img src={product.product_image_url} alt="" className="w-full h-full object-cover" />
                          ) : <div className="w-full h-full flex items-center justify-center text-lg">📦</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">{product.product_name}</h4>
                          <p className="text-xs text-gray-500">{product.category} • ₹{Number(product.original_price || 0).toLocaleString()}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-medium">
                              <AlertTriangle className="h-2.5 w-2.5 inline mr-0.5" />{product.return_reason}
                            </span>
                          </div>
                          {product.green_score > 0 && (
                            <p className="text-[10px] text-brand-green mt-1">🌱 Green Score: {product.green_score}/100</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 flex flex-col items-end gap-1">
                          {product.status === 'at_warehouse' && (
                            <ListOnMarketplaceBtn returnId={product.return_id} />
                          )}
                          {product.status === 'listed' && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium">✓ Listed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


function ListOnMarketplaceBtn({ returnId }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  async function handleList() {
    setLoading(true)
    try {
      const token = localStorage.getItem('sl_certified_seller_token')
      const res = await api.post(`/api/v1/certified-seller/list-return/${returnId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setResult(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="text-center">
        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium">
          ✓ Listed (Score: {result.green_score})
        </span>
      </div>
    )
  }

  return (
    <button
      onClick={handleList}
      disabled={loading}
      className="px-2 py-1 bg-brand-green text-white text-[10px] font-medium rounded hover:bg-brand-green-dark disabled:opacity-50"
    >
      {loading ? '...' : '🏷️ List'}
    </button>
  )
}
