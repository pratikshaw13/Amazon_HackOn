'use client'

import { MapContainer, TileLayer, CircleMarker, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const CITY_COORDS = {
  "Mumbai": [19.076, 72.877],
  "Delhi": [28.613, 77.209],
  "Bengaluru": [12.971, 77.594],
  "Hyderabad": [17.385, 78.486],
  "Chennai": [13.082, 80.270],
  "Pune": [18.520, 73.856],
  "Kolkata": [22.572, 88.363],
  "Ahmedabad": [23.022, 72.571],
  "Jaipur": [26.912, 75.787],
  "Kochi": [9.931, 76.267],
  "Lucknow": [26.846, 80.946],
  "Chandigarh": [30.733, 76.779],
}

function getDemandColor(score) {
  if (score >= 75) return '#1D9E75'  // Green — high demand
  if (score >= 55) return '#378ADD'  // Blue — medium-high
  if (score >= 40) return '#EF9F27'  // Amber — medium
  return '#E24B4A'                    // Red — low demand
}

function createCountIcon(count) {
  return L.divIcon({
    className: 'warehouse-count-badge',
    html: `<div style="
      position: relative;
      width: 0;
      height: 0;
    "><span style="
      position: absolute;
      top: -28px;
      left: 4px;
      background: #F59E0B;
      color: white;
      font-size: 10px;
      font-weight: 700;
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      border: 1.5px solid white;
    ">${count}</span></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

export default function WarehouseRoutingMap({ demand = [], selectedProduct, onWarehouseClick, routeLoading, warehouseCounts = {} }) {
  const center = [22.5, 78.9]

  return (
    <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {demand.map(d => {
        const coords = CITY_COORDS[d.city]
        if (!coords) return null
        const color = getDemandColor(d.demand_score)
        const isCurrentCity = selectedProduct?.warehouse_city === d.city
        const radius = d.demand_score >= 75 ? 16 : d.demand_score >= 55 ? 13 : 10
        const count = warehouseCounts[d.city] || 0

        return (
          <CircleMarker
            key={d.city}
            center={coords}
            radius={isCurrentCity ? radius + 4 : radius}
            pathOptions={{
              color: isCurrentCity ? '#111' : count > 0 ? '#F59E0B' : color,
              fillColor: count > 0 ? color : color,
              fillOpacity: count > 0 ? 0.9 : 0.75,
              weight: isCurrentCity ? 3 : count > 0 ? 2.5 : 2,
            }}
            eventHandlers={{
              click: () => {
                if (selectedProduct && !isCurrentCity && !routeLoading) {
                  if (window.confirm(`Route "${selectedProduct.product_name}" to ${d.city} warehouse?\n\nDemand: ${d.demand_score}/100\nFee: ₹50\nGreen Credits on sale: +30`)) {
                    onWarehouseClick?.(d.city)
                  }
                }
              }
            }}
          >
            <Popup>
              <div className="text-center p-1 min-w-[120px]">
                <p className="font-bold text-sm">{d.city}</p>
                <p className="text-xs text-gray-500">{d.warehouse_id}</p>
                <p className="text-lg font-bold mt-1" style={{ color }}>{d.demand_score}/100</p>
                {count > 0 && (
                  <p className="text-xs text-amber-600 font-medium mt-0.5">📦 {count} of your products here</p>
                )}
                <p className="text-[10px] text-gray-400">
                  {d.trending_categories?.join(', ')}
                </p>
                <p className="text-[10px] text-gray-400">~{d.avg_days_to_sell}d to sell</p>
                {selectedProduct && !isCurrentCity && (
                  <button
                    onClick={() => onWarehouseClick?.(d.city)}
                    className="mt-2 px-2 py-1 bg-green-500 text-white text-[10px] rounded font-medium w-full"
                  >
                    Route Here →
                  </button>
                )}
                {isCurrentCity && (
                  <p className="mt-1 text-[10px] text-amber-600 font-medium">📍 Product is here</p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}

      {/* Count badge overlays — superscript numbers on warehouses with products */}
      {demand.map(d => {
        const coords = CITY_COORDS[d.city]
        if (!coords) return null
        const count = warehouseCounts[d.city] || 0
        if (count === 0) return null

        return (
          <Marker
            key={`badge-${d.city}`}
            position={coords}
            icon={createCountIcon(count)}
            interactive={false}
          />
        )
      })}
    </MapContainer>
  )
}
