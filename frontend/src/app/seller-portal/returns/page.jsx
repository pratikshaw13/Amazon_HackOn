'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { RotateCcw, MapPin, Package, CheckCircle, ArrowRight, User, Clock, Warehouse } from 'lucide-react'
import api from '../../../lib/api'

const WarehouseMap = dynamic(() => import('../../../components/features/WarehouseRoutingMap'), { ssr: false })

function getSellerToken() { return localStorage.getItem('sl_certified_seller_token') }
function sellerFetch(path) { return api.get(path, { headers: { Authorization: `Bearer ${getSellerToken()}` } }) }
function sellerPost(path, data = {}) { return api.post(path, data, { headers: { Authorization: `Bearer ${getSellerToken()}` } }) }

export default function SellerReturnsPage() {
  const [returns, setReturns] = useState([])
  const [demand, setDemand] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReturn, setSelectedReturn] = useState(null)
  const [routeResult, setRouteResult] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(null) // null | 'at_warehouse' | 'listed' | 'in_transit'
  const [expandedWarehouse, setExpandedWarehouse] = useState(null) // city name when expanded
  const [rerouteItem, setRerouteItem] = useState(null) // return item being rerouted
  const [demandForCategory, setDemandForCategory] = useState([]) // demand data for reroute dropdown
  const [demandLoading, setDemandLoading] = useState(false)
  const [confirmCity, setConfirmCity] = useState(null) // city pending confirmation

  useEffect(() => { fetchData() }, [])

  // Auto-refresh every 8 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 8000)
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    try {
      const [retRes, demandRes] = await Promise.all([
        sellerFetch('/api/v1/certified-seller/returns'),
        sellerFetch('/api/v1/certified-seller/demand-overview'),
      ])
      setReturns(retRes.data.returns || [])
      setDemand(demandRes.data.demand || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleRouteToCity(targetCity) {
    if (!selectedReturn) return
    setRouteLoading(true)
    try {
      const res = await sellerPost(`/api/v1/certified-seller/route-product/${selectedReturn.return_id}`, { target_city: targetCity })
      setRouteResult(res.data)
      setSelectedReturn(null)
      fetchData()
      setTimeout(() => setRouteResult(null), 5000)
    } catch (err) {
      setRouteResult({ message: err.response?.data?.detail || 'Routing failed' })
    } finally { setRouteLoading(false) }
  }

  async function handleListProduct(returnId) {
    try {
      const res = await sellerPost(`/api/v1/certified-seller/list-return/${returnId}`)
      setRouteResult(res.data)
      fetchData()
      setTimeout(() => setRouteResult(null), 5000)
    } catch (err) {
      setRouteResult({ message: err.response?.data?.detail || 'Listing failed' })
    }
  }

  async function handleRerouteClick(ret) {
    setRerouteItem(ret)
    setDemandLoading(true)
    try {
      const res = await sellerFetch(`/api/v1/certified-seller/demand-by-category?category=${encodeURIComponent(ret.category)}`)
      setDemandForCategory(res.data.demand || [])
    } catch (err) { console.error(err) }
    finally { setDemandLoading(false) }
  }

  async function handleRerouteConfirm(targetCity) {
    if (!rerouteItem) return
    setRouteLoading(true)
    try {
      const res = await sellerPost(`/api/v1/certified-seller/route-product/${rerouteItem.return_id}`, { target_city: targetCity })
      setRouteResult(res.data)
      setRerouteItem(null)
      setDemandForCategory([])
      fetchData()
      setTimeout(() => setRouteResult(null), 5000)
    } catch (err) {
      setRouteResult({ message: err.response?.data?.detail || 'Routing failed' })
    } finally { setRouteLoading(false) }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-gray-200 border-t-brand-green rounded-full animate-spin" /></div>

  const atWarehouse = returns.filter(r => r.status === 'at_warehouse')
  const listed = returns.filter(r => r.status === 'listed')
  const pending = returns.filter(r => ['pending', 'rider_assigned', 'picked_up'].includes(r.status))

  // Group warehouse items by city
  const warehouseGroups = atWarehouse.reduce((acc, ret) => {
    const city = ret.warehouse_city || 'Unknown'
    if (!acc[city]) acc[city] = []
    acc[city].push(ret)
    return acc
  }, {})

  // Get the filtered list based on active tab
  function getFilteredList() {
    if (activeTab === 'at_warehouse') return atWarehouse
    if (activeTab === 'listed') return listed
    if (activeTab === 'in_transit') return pending
    return []
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <RotateCcw className="h-5 w-5" /> Returns & Rescue
      </h1>

      {routeResult && (
        <div className="bg-brand-green-light border border-brand-green/20 rounded-xl p-3 text-sm text-brand-green-dark flex items-center gap-2">
          <CheckCircle className="h-4 w-4" /> {routeResult.message}
        </div>
      )}

      {/* Clickable Stats */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setActiveTab(activeTab === 'at_warehouse' ? null : 'at_warehouse')}
          className={`bg-white border rounded-xl p-4 text-center transition hover:shadow-md ${activeTab === 'at_warehouse' ? 'border-amber-400 ring-2 ring-amber-200' : 'border-gray-100'}`}
        >
          <p className="text-2xl font-bold text-amber-600">{atWarehouse.length}</p>
          <p className="text-xs text-gray-400">At Warehouse</p>
        </button>
        <button
          onClick={() => setActiveTab(activeTab === 'listed' ? null : 'listed')}
          className={`bg-white border rounded-xl p-4 text-center transition hover:shadow-md ${activeTab === 'listed' ? 'border-green-400 ring-2 ring-green-200' : 'border-gray-100'}`}
        >
          <p className="text-2xl font-bold text-green-600">{listed.length}</p>
          <p className="text-xs text-gray-400">Listed</p>
        </button>
        <button
          onClick={() => setActiveTab(activeTab === 'in_transit' ? null : 'in_transit')}
          className={`bg-white border rounded-xl p-4 text-center transition hover:shadow-md ${activeTab === 'in_transit' ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-100'}`}
        >
          <p className="text-2xl font-bold text-blue-500">{pending.length}</p>
          <p className="text-xs text-gray-400">In Transit</p>
        </button>
      </div>

      {/* Filtered List — shown when a counter is clicked */}
      {activeTab && activeTab !== 'at_warehouse' && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">
              {activeTab === 'listed' && `🏷️ Listed Products (${listed.length})`}
              {activeTab === 'in_transit' && `🚚 In Transit (${pending.length})`}
            </p>
            <button onClick={() => setActiveTab(null)} className="text-xs text-gray-400 hover:text-gray-600">✕ Close</button>
          </div>

          {getFilteredList().length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No items in this category</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {getFilteredList().map(ret => (
                <div key={ret.return_id} className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                    {ret.product_image_url?.startsWith('http') ? (
                      <img src={ret.product_image_url} alt="" className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full flex items-center justify-center text-lg">📦</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{ret.product_name}</h4>
                    <p className="text-xs text-gray-500">{ret.category} • ₹{Number(ret.original_price || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                      <User className="h-2.5 w-2.5" /> Returned by: {ret.customer_name || 'Unknown'} ({ret.customer_city || ''})
                    </p>
                    {activeTab === 'listed' && ret.warehouse_city && (
                      <p className="text-[10px] text-brand-green mt-0.5">
                        📍 Listed in: {ret.warehouse_city} marketplace {ret.routed_to_city ? `(routed from ${ret.customer_city})` : '(local)'}
                        {ret.green_score > 0 && ` • 🌱 Score: ${ret.green_score}`}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right space-y-1">
                    {activeTab === 'listed' && (
                      <>
                        <span className="block text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full">₹{ret.listing_price || '?'}</span>
                        <button
                          onClick={() => handleRerouteClick(ret)}
                          className="block px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded-full hover:bg-amber-200 transition"
                        >
                          🔄 Reroute
                        </button>
                      </>
                    )}
                    {activeTab === 'in_transit' && (
                      <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> {ret.status === 'pending' ? 'Awaiting Rider' : ret.status === 'rider_assigned' ? 'Rider Assigned' : 'Picked Up'}
                      </span>
                    )}
                  </div>

                  {/* Reroute dropdown for listed items */}
                  {activeTab === 'listed' && rerouteItem?.return_id === ret.return_id && (
                    <div className="w-full mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                      {!confirmCity ? (
                        <>
                          <p className="text-[10px] text-amber-700 font-medium">
                            Reroute to another city (sorted by demand for &quot;{ret.category}&quot;):
                          </p>
                          {demandLoading ? (
                            <p className="text-xs text-gray-400 text-center py-2">Loading demand data...</p>
                          ) : (
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {demandForCategory.filter(d => d.city !== ret.warehouse_city).map(d => (
                                <button
                                  key={d.city}
                                  onClick={() => setConfirmCity(d.city)}
                                  className="w-full flex items-center justify-between p-2 bg-white border border-gray-100 rounded hover:border-amber-300 hover:bg-amber-50 transition text-left"
                                >
                                  <span className="text-xs font-medium text-gray-900">{d.city}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-500">{d.buyer_count} buyers</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${d.demand_score >= 70 ? 'bg-green-100 text-green-700' : d.demand_score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                      Demand: {d.demand_score}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          <button onClick={() => setRerouteItem(null)} className="text-[10px] text-gray-400 hover:text-gray-600">Cancel</button>
                        </>
                      ) : (
                        <div className="text-center space-y-2 py-2">
                          <p className="text-xs font-medium text-gray-900">
                            Reroute to <span className="text-amber-700 font-bold">{confirmCity}</span>?
                          </p>
                          <p className="text-[10px] text-gray-500">Old listing will be removed. New listing created in {confirmCity} (₹50 fee).</p>
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => { handleRerouteConfirm(confirmCity); setConfirmCity(null) }}
                              disabled={routeLoading}
                              className="px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded hover:bg-amber-600 disabled:opacity-50"
                            >
                              {routeLoading ? 'Routing...' : 'Yes, Reroute'}
                            </button>
                            <button onClick={() => setConfirmCity(null)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded hover:bg-gray-200">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* At Warehouse: Grouped by warehouse city */}
      {activeTab === 'at_warehouse' && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">📦 Warehouses with Your Products ({atWarehouse.length} items)</p>
            <button onClick={() => { setActiveTab(null); setExpandedWarehouse(null); setRerouteItem(null) }} className="text-xs text-gray-400 hover:text-gray-600">✕ Close</button>
          </div>

          {Object.keys(warehouseGroups).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No products at any warehouse</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(warehouseGroups).map(([city, items]) => (
                <div key={city} className="border border-gray-100 rounded-lg overflow-hidden">
                  {/* Warehouse row — city on left, count on right */}
                  <button
                    onClick={() => { setExpandedWarehouse(expandedWarehouse === city ? null : city); setRerouteItem(null) }}
                    className={`w-full flex items-center justify-between p-3 hover:bg-gray-50 transition ${expandedWarehouse === city ? 'bg-amber-50' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-gray-900">{city} Warehouse</span>
                    </div>
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-bold text-sm">
                      {items.length}
                    </span>
                  </button>

                  {/* Expanded: products in this warehouse */}
                  {expandedWarehouse === city && (
                    <div className="border-t border-gray-100 p-3 bg-gray-50 space-y-3 max-h-80 overflow-y-auto">
                      {items.map(ret => (
                        <div key={ret.return_id} className="bg-white rounded-lg p-3 border border-gray-100 space-y-2">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                              {ret.product_image_url?.startsWith('http') ? (
                                <img src={ret.product_image_url} alt="" className="w-full h-full object-cover" />
                              ) : <div className="w-full h-full flex items-center justify-center text-lg">📦</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 truncate">{ret.product_name}</h4>
                              <p className="text-xs text-gray-500">{ret.category} • ₹{Number(ret.original_price || 0).toLocaleString()}</p>
                              <p className="text-[10px] text-red-500">{ret.return_reason}</p>
                              <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                <User className="h-2.5 w-2.5" /> Returned by: {ret.customer_name || 'Unknown'} ({ret.customer_city || ''})
                              </p>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleListProduct(ret.return_id)}
                              className="flex-1 py-1.5 px-2 bg-brand-green text-white text-xs font-medium rounded hover:bg-brand-green-dark transition"
                            >
                              🏷️ List in Local Marketplace (+50 credits)
                            </button>
                            <button
                              onClick={() => handleRerouteClick(ret)}
                              className="flex-1 py-1.5 px-2 bg-amber-500 text-white text-xs font-medium rounded hover:bg-amber-600 transition"
                            >
                              🔄 Reroute to Another City
                            </button>
                          </div>

                          {/* Reroute dropdown — demand sorted */}
                          {rerouteItem?.return_id === ret.return_id && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                              {!confirmCity ? (
                                <>
                                  <p className="text-[10px] text-amber-700 font-medium">
                                    Warehouses sorted by demand for &quot;{ret.category}&quot; (highest first):
                                  </p>
                                  {demandLoading ? (
                                    <p className="text-xs text-gray-400 text-center py-2">Loading demand data...</p>
                                  ) : (
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {demandForCategory.filter(d => d.city !== city).map(d => (
                                        <button
                                          key={d.city}
                                          onClick={() => setConfirmCity(d.city)}
                                          className="w-full flex items-center justify-between p-2 bg-white border border-gray-100 rounded hover:border-amber-300 hover:bg-amber-50 transition text-left"
                                        >
                                          <span className="text-xs font-medium text-gray-900">{d.city}</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-500">{d.buyer_count} buyers</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${d.demand_score >= 70 ? 'bg-green-100 text-green-700' : d.demand_score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                              Demand: {d.demand_score}
                                            </span>
                                          </div>
                                        </button>
                                      ))}
                                      {demandForCategory.filter(d => d.city !== city).length === 0 && (
                                        <p className="text-xs text-gray-400 text-center py-1">No other warehouses available</p>
                                      )}
                                    </div>
                                  )}
                                  <button onClick={() => setRerouteItem(null)} className="text-[10px] text-gray-400 hover:text-gray-600">Cancel</button>
                                </>
                              ) : (
                                <div className="text-center space-y-2 py-2">
                                  <p className="text-xs font-medium text-gray-900">
                                    Are you sure you want to route this product to <span className="text-amber-700 font-bold">{confirmCity}</span>?
                                  </p>
                                  <p className="text-[10px] text-gray-500">₹50 routing fee applies. Product will be listed on {confirmCity} marketplace (visible to same-state buyers only).</p>
                                  <div className="flex gap-2 justify-center">
                                    <button
                                      onClick={() => { handleRerouteConfirm(confirmCity); setConfirmCity(null) }}
                                      disabled={routeLoading}
                                      className="px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded hover:bg-amber-600 disabled:opacity-50"
                                    >
                                      {routeLoading ? 'Routing...' : 'Yes, Route It'}
                                    </button>
                                    <button
                                      onClick={() => setConfirmCity(null)}
                                      className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded hover:bg-gray-200"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map section — full width, always visible */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
          {selectedReturn ? `Route "${selectedReturn.product_name}" — Click a warehouse` : 'Warehouse Demand Map — Your Products Across India'}
        </p>
        <div className="h-[400px] rounded-lg overflow-hidden border border-gray-200">
          <WarehouseMap
            demand={demand}
            selectedProduct={selectedReturn}
            onWarehouseClick={(city) => {
              if (selectedReturn) handleRouteToCity(city)
            }}
            routeLoading={routeLoading}
            warehouseCounts={Object.fromEntries(Object.entries(warehouseGroups).map(([city, items]) => [city, items.length]))}
          />
        </div>
        {selectedReturn && (
          <p className="text-xs text-amber-600 mt-2 text-center">
            Click a green warehouse on the map to route &quot;{selectedReturn.product_name}&quot; there (₹50 fee)
          </p>
        )}
      </div>
    </div>
  )
}
