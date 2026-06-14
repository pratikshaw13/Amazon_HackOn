'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function getDemandColor(score) {
  if (score >= 80) return '#1D9E75'
  if (score >= 60) return '#378ADD'
  if (score >= 40) return '#EF9F27'
  return '#E24B4A'
}

function getMarkerRadius(score) {
  if (score >= 80) return 18
  if (score >= 60) return 14
  if (score >= 40) return 10
  return 7
}

// Component to fly to selected city
function FlyToCity({ selectedCity }) {
  const map = useMap()
  useEffect(() => {
    if (selectedCity && selectedCity.lat && selectedCity.lng) {
      map.flyTo([selectedCity.lat, selectedCity.lng], 7, { duration: 1 })
    }
  }, [selectedCity, map])
  return null
}

export default function DemandMapLeaflet({ demandData = [], selectedCity, onCityClick }) {
  // India center
  const center = [22.5, 78.9]
  const zoom = 5

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
      scrollWheelZoom={true}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FlyToCity selectedCity={selectedCity} />

      {demandData.map((city) => {
        if (!city.lat || !city.lng) return null
        const color = getDemandColor(city.score)
        const radius = getMarkerRadius(city.score)
        const isSelected = selectedCity?.city === city.city

        return (
          <CircleMarker
            key={city.city}
            center={[city.lat, city.lng]}
            radius={isSelected ? radius + 5 : radius}
            pathOptions={{
              color: isSelected ? '#111' : color,
              fillColor: color,
              fillOpacity: 0.7,
              weight: isSelected ? 3 : 2,
            }}
            eventHandlers={{
              click: () => onCityClick?.(city),
            }}
          >
            <Popup>
              <div className="text-center p-1">
                <p className="font-bold text-sm">{city.city}</p>
                <p className="text-xs text-gray-500">{city.demand} Demand</p>
                <p className="text-lg font-bold" style={{ color }}>{city.score}/100</p>
                {city.buyer_count && <p className="text-xs">{city.buyer_count} buyers</p>}
                {city.expected_resale_days && <p className="text-xs">~{city.expected_resale_days} days to sell</p>}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
