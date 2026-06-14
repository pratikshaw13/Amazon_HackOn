'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Custom delivery icon
const deliveryIcon = new L.DivIcon({
  html: '<div style="font-size:24px;text-align:center;">🚴</div>',
  className: 'delivery-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

export default function TrackingMap({ partnerLat, partnerLng, partnerName }) {
  if (!partnerLat || !partnerLng) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-sm text-gray-400">
        Location not available
      </div>
    )
  }

  return (
    <MapContainer
      center={[partnerLat, partnerLng]}
      zoom={14}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={false}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[partnerLat, partnerLng]} icon={deliveryIcon}>
        <Popup>
          <div className="text-center">
            <p className="font-bold text-sm">{partnerName}</p>
            <p className="text-xs text-gray-500">Delivery Partner</p>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  )
}
