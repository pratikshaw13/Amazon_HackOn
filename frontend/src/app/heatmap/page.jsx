'use client'

import { useEffect, useState } from 'react'
import { heatmapApi } from '../../lib/api'
import { CATEGORIES } from '../../lib/constants'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { MapPin, TrendingUp } from 'lucide-react'

export default function HeatmapPage() {
  const [category, setCategory] = useState('Electronics')
  const [demandData, setDemandData] = useState([])
  const [loading, setLoading] = useState(true)

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

  const getDemandColor = (demand) => {
    switch (demand) {
      case 'Very High': return '#1D9E75'
      case 'High': return '#378ADD'
      case 'Medium': return '#EF9F27'
      case 'Low': return '#E24B4A'
      default: return '#999'
    }
  }

  const getDemandBadgeVariant = (demand) => {
    switch (demand) {
      case 'Very High': return 'green'
      case 'High': return 'blue'
      case 'Medium': return 'amber'
      case 'Low': return 'red'
      default: return 'gray'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-brand-blue" />
            Demand Heatmap
          </h1>
          <p className="text-gray-500 mt-1">AI-powered demand forecasting across Indian cities</p>
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:border-brand-green"
        >
          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner text="Forecasting demand..." />
      ) : (
        <>
          {/* Demand Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {demandData
              .sort((a, b) => (b.score || 0) - (a.score || 0))
              .map((city, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{city.city}</h3>
                    <Badge variant={getDemandBadgeVariant(city.demand)}>{city.demand}</Badge>
                  </div>
                  {/* Score Bar */}
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${city.score}%`,
                        backgroundColor: getDemandColor(city.demand)
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Score: {city.score}/100</span>
                  </div>
                  {city.reasoning && (
                    <p className="text-xs text-gray-500 mt-2">{city.reasoning}</p>
                  )}
                </div>
              ))}
          </div>

          {/* Legend */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Legend</p>
            <div className="flex gap-4 flex-wrap">
              {['Very High', 'High', 'Medium', 'Low'].map(level => (
                <div key={level} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getDemandColor(level) }} />
                  <span className="text-xs text-gray-600">{level}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
