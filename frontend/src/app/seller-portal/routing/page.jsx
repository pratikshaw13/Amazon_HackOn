'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Truck, Filter, Package, ArrowRight, CheckCircle } from 'lucide-react'
import api from '../../../lib/api'

const WarehouseRoutingMap = dynamic(() => import('../../../components/features/WarehouseRoutingMap'), { ssr: false })

function getSellerToken() { return localStorage.getItem('sl_certified_seller_token') }
function sellerFetch(path) { return api.get(path, { headers: { Authorization: `Bearer ${getSellerToken()}` } }) }
function sellerPost(path, data = {}) { return api.post(path, data, { headers: { Authorization: `Bearer ${getSellerToken()}` } }) }

const CATEGORIES = ["Electronics", "Baby Products", "Fashion", "Home", "Kitchen", "Books", "Sports", "Personal Care"]

export default function SellerRoutingPage() {
  const [category, setCategory] = useState('Electronics')
  const [categoryDemand, setCategoryDemand] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCity, setSelectedCity] = useState(null)
  const [cityProducts, setCityProducts] = useState([])
  const [routeResult, setRouteResult] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)

  useEffect(() => { fetchData() }, [category])

  async function fetchData() {
    setLoading(true)
    try {
      const [demandRes, whRes] = await Promise.all([
        sellerFetch(`/api/v1/certified-seller/demand-by-category?category=${category}`),
        sellerFetch('/api/v1/certified-seller/warehouses'),
      ])
      setCategoryDemand(demandRes.data.demand || [])
      setWarehouses(whRes.data.warehouses || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  function handleCityClick(city) {
    setSelectedCity(city)
    // Find products in this city
    const wh = warehouses.find(w => w.city === city)
    const products = wh ? wh.products.filter(p => p.category.toLowerCase() === category.toLowerCase()) : []
    setCityProducts(products)
  }

  async function handleRouteProduct(returnId, targetCity) {
    setRouteLoading(true)
    try {
      const res = await sellerPost(`/api/v1/certified-seller/route-product/${returnId}`, { target_city: targetCity })
      setRouteResult(res.data)
      fetchData()
      setSelectedCity(null)
      setCityProducts([])
      setTimeout(() => setRouteResult(null), 5000)
    } catch (err) {
      setRouteResult({ message: err.response?.data?.detail || 'Routing failed' })
    } finally { setRouteLoading(false) }
  }

  // Build demand data for the map (category-specific)
  const mapDemand = categoryDemand.map(d => ({
    city: d.city,
    warehouse_id: `WH-${d.city.substring(0, 3).toUpperCase()}-01`,
    demand_score: d.demand_score,
    trending_categories: [category],
    avg_days_to_sell: d.avg_days_to_sell,
    buyer_count: d.buyer_count,
  }))

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-gray-200 border-t-brand-green rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Truck className="h-5 w-5" /> Routing Engine
        </h1>
        {/* Category Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select value={category} onChange={e => { setCategory(e.target.value); setSelectedCity(null); setCityProducts([]) }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:border-brand-green bg-white">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {routeResult && (
        <div className="bg-brand-green-light border border-brand-green/20 rounded-xl p-3 text-sm text-brand-green-dark flex items-center gap-2">
          <CheckCircle className="h-4 w-4" /> {routeResult.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map — takes 2 cols */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
            Demand Map — {category} (click a city to see products)
          </p>
          <div className="h-[450px] rounded-lg overflow-hidden border border-gray-200">
            <WarehouseRoutingMap
              demand={mapDemand}
              selectedProduct={null}
              onWarehouseClick={(city) => handleCityClick(city)}
              routeLoading={routeLoading}
            />
          </div>
          {/* Legend */}
          <div className="flex gap-4 mt-3 flex-wrap justify-center text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#1D9E75]" /> High (75+)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#378ADD]" /> Med-High (55-74)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#EF9F27]" /> Medium (40-54)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#E24B4A]" /> Low (&lt;40)</span>
          </div>
        </div>

        {/* Right panel — City details + products */}
        <div className="space-y-4">
          {selectedCity ? (
            <>
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-900">{selectedCity}</h3>
                  <span className="text-sm font-bold text-brand-green">
                    {categoryDemand.find(d => d.city === selectedCity)?.demand_score || '?'}/100
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {category} demand • ~{categoryDemand.find(d => d.city === selectedCity)?.avg_days_to_sell || '?'}d to sell
                  • {categoryDemand.find(d => d.city === selectedCity)?.buyer_count || 0} buyers
                </p>
              </div>

              {/* Products in this city for this category */}
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
                  {category} products in {selectedCity} ({cityProducts.length})
                </p>
                {cityProducts.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No {category} products in this warehouse.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cityProducts.map(p => (
                      <div key={p.return_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs font-medium text-gray-800 truncate max-w-[140px]">{p.product_name}</p>
                          <p className="text-[10px] text-gray-400">₹{Number(p.original_price || 0).toLocaleString()}</p>
                        </div>
                        <RouteDropdown
                          returnId={p.return_id}
                          currentCity={selectedCity}
                          cities={categoryDemand.map(d => d.city)}
                          onRoute={handleRouteProduct}
                          loading={routeLoading}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* All cities demand for this category */}
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">All Cities — {category}</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {categoryDemand.map((d, i) => (
                    <button key={d.city} onClick={() => handleCityClick(d.city)}
                      className={`w-full flex items-center justify-between p-1.5 rounded text-xs transition ${selectedCity === d.city ? 'bg-brand-green-light' : 'hover:bg-gray-50'}`}>
                      <span className="text-gray-700">{i + 1}. {d.city}</span>
                      <span className="font-bold" style={{ color: d.demand_score >= 75 ? '#1D9E75' : d.demand_score >= 55 ? '#378ADD' : d.demand_score >= 40 ? '#EF9F27' : '#E24B4A' }}>
                        {d.demand_score}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl p-6 text-center">
              <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Click a city on the map to view {category} products and route them.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RouteDropdown({ returnId, currentCity, cities, onRoute, loading }) {
  const [isOpen, setIsOpen] = useState(false)
  const otherCities = cities.filter(c => c !== currentCity)

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} disabled={loading}
        className="px-2 py-1 bg-brand-blue text-white text-[10px] rounded hover:bg-brand-blue/80 disabled:opacity-50">
        Route →
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 max-h-32 overflow-y-auto">
          {otherCities.slice(0, 6).map(city => (
            <button key={city} onClick={() => { onRoute(returnId, city); setIsOpen(false) }}
              className="w-full text-left px-2 py-1 text-[10px] text-gray-700 hover:bg-gray-50">
              {city}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
