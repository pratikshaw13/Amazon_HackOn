'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { heatmapApi } from '../../lib/api'
import { CATEGORIES } from '../../lib/constants'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { MapPin, TrendingUp, Users, Clock } from 'lucide-react'

// Dynamically import the map component (Leaflet requires window)
const DemandMap = dynamic(() => import('../../components/features/DemandMapLeaflet'), { ssr: false })

export default function HeatmapPage() {
  const [category, setCategory] = useState('Electronics')
  const [demandData, setDemandData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCity, setSelectedCity] = useState(null)

  useEffect(() => {
    fetchDemand()
  }, [category])

  async function fetchDemand() {
    setLoading(true)
    try {
      const res = await heatmapApi.getDemand(category)
      setDemandData(res.data.city_demand || [])
    } catch (err) {
      console.error('Demand fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getDemandBadge = (demand) => {
    switch (demand) {
      case 'Very High': return 'green'
      case 'High': return 'blue'
      case 'Medium': return 'amber'
      default: return 'red'
    }
  }

  const getDemandColor = (score) => {
    if (score >= 80) return '#1D9E75'
    if (score >= 60) return '#378ADD'
    if (score >= 40) return '#EF9F27'
    return '#E24B4A'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-brand-blue" />
            India Demand Intelligence
          </h1>
          <p className="text-gray-500 mt-1">Real-time AI demand forecasting across Indian cities</p>
        </div>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setSelectedCity(null) }}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:border-brand-green bg-white"
        >
          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner text="Forecasting demand..." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-4 overflow-hidden">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
              Demand Map — {category}
            </p>
            <div className="h-[500px] rounded-lg overflow-hidden">
              <DemandMap
                demandData={demandData}
                selectedCity={selectedCity}
                onCityClick={(city) => setSelectedCity(city)}
              />
            </div>
            {/* Legend */}
            <div className="flex gap-4 mt-3 flex-wrap justify-center">
              {[{label: 'Very High (80+)', color: '#1D9E75'}, {label: 'High (60-79)', color: '#378ADD'}, {label: 'Medium (40-59)', color: '#EF9F27'}, {label: 'Low (<40)', color: '#E24B4A'}].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-xs text-gray-500">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* City Details Panel */}
          <div className="space-y-4">
            {selectedCity ? (
              <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-lg">{selectedCity.city}</h3>
                  <Badge variant={getDemandBadge(selectedCity.demand)}>{selectedCity.demand}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <TrendingUp className="h-4 w-4 text-brand-green mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">{selectedCity.score}/100</p>
                    <p className="text-xs text-gray-400">Demand Score</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <Users className="h-4 w-4 text-brand-blue mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">{selectedCity.buyer_count || '—'}</p>
                    <p className="text-xs text-gray-400">Active Buyers</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <Clock className="h-4 w-4 text-brand-amber mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">{selectedCity.expected_resale_days || '—'}d</p>
                    <p className="text-xs text-gray-400">Avg Sale Time</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <MapPin className="h-4 w-4 text-purple-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">{selectedCity.lat?.toFixed(2)}°</p>
                    <p className="text-xs text-gray-400">Latitude</p>
                  </div>
                </div>
                {selectedCity.reasoning && (
                  <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">{selectedCity.reasoning}</p>
                )}
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-xl p-5 text-center text-gray-400 text-sm">
                Click a city marker on the map to view demand analytics
              </div>
            )}

            {/* Ranked list */}
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Cities Ranked</p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {demandData
                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                  .map((city, i) => (
                    <button
                      key={city.city}
                      onClick={() => setSelectedCity(city)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left hover:bg-gray-50 transition ${selectedCity?.city === city.city ? 'bg-brand-green-light' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                          style={{ backgroundColor: getDemandColor(city.score) }}>
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-700">{city.city}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: getDemandColor(city.score) }}>
                        {city.score}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
