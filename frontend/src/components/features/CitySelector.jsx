'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Navigation, ChevronDown, X } from 'lucide-react'

// State → Major City mapping
const STATE_TO_CITY = {
  "west bengal": "Kolkata",
  "maharashtra": "Mumbai",
  "karnataka": "Bengaluru",
  "telangana": "Hyderabad",
  "tamil nadu": "Chennai",
  "delhi": "Delhi",
  "rajasthan": "Jaipur",
  "gujarat": "Ahmedabad",
  "kerala": "Kochi",
  "uttar pradesh": "Lucknow",
  "punjab": "Chandigarh",
  "chandigarh": "Chandigarh",
  "andhra pradesh": "Hyderabad",
  "madhya pradesh": "Indore",
  "odisha": "Bhubaneswar",
  "jharkhand": "Ranchi",
  "bihar": "Patna",
  "assam": "Guwahati",
  "goa": "Pune",
  "haryana": "Delhi",
  "uttarakhand": "Delhi",
  "chhattisgarh": "Nagpur",
}

// State abbreviations for display
const STATE_ABBR = {
  "West Bengal": "WB", "Maharashtra": "MH", "Karnataka": "KA", "Telangana": "TG",
  "Tamil Nadu": "TN", "Delhi": "DL", "Rajasthan": "RJ", "Gujarat": "GJ",
  "Kerala": "KL", "Uttar Pradesh": "UP", "Punjab": "PB", "Chandigarh": "CH",
  "Andhra Pradesh": "AP", "Madhya Pradesh": "MP", "Odisha": "OD", "Jharkhand": "JH",
  "Bihar": "BR", "Assam": "AS", "Goa": "GA", "Haryana": "HR",
}

const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai",
  "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Kochi",
  "Lucknow", "Chandigarh", "Nashik", "Indore", "Bhopal",
  "Nagpur", "Surat", "Vadodara", "Coimbatore", "Visakhapatnam",
  "Siliguri", "Durgapur", "Patna", "Ranchi", "Guwahati", "Bhubaneswar",
]

// City → State mapping
const CITY_TO_STATE = {
  "Mumbai": "Maharashtra", "Pune": "Maharashtra", "Nashik": "Maharashtra", "Nagpur": "Maharashtra",
  "Delhi": "Delhi",
  "Bengaluru": "Karnataka",
  "Hyderabad": "Telangana",
  "Chennai": "Tamil Nadu", "Coimbatore": "Tamil Nadu",
  "Kolkata": "West Bengal", "Siliguri": "West Bengal", "Durgapur": "West Bengal",
  "Ahmedabad": "Gujarat", "Surat": "Gujarat", "Vadodara": "Gujarat",
  "Jaipur": "Rajasthan",
  "Kochi": "Kerala",
  "Lucknow": "Uttar Pradesh",
  "Chandigarh": "Chandigarh",
  "Indore": "Madhya Pradesh", "Bhopal": "Madhya Pradesh",
  "Visakhapatnam": "Andhra Pradesh",
  "Patna": "Bihar",
  "Ranchi": "Jharkhand",
  "Guwahati": "Assam",
  "Bhubaneswar": "Odisha",
}

export { CITY_TO_STATE, STATE_ABBR }

export default function CitySelector({ onCityChange }) {
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const dropdownRef = useRef(null)

  // Load saved city on mount
  useEffect(() => {
    const savedCity = localStorage.getItem('sl_user_city')
    const savedState = localStorage.getItem('sl_user_state')
    if (savedCity) {
      setCity(savedCity)
      setState(savedState || '')
    } else {
      setIsOpen(true)
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectCity(selectedCity) {
    const selectedState = CITY_TO_STATE[selectedCity] || ''
    setCity(selectedCity)
    setState(selectedState)
    localStorage.setItem('sl_user_city', selectedCity)
    localStorage.setItem('sl_user_state', selectedState)
    setIsOpen(false)
    onCityChange?.(selectedCity, selectedState)
    updateBackendCity(selectedCity, selectedState)
  }

  async function handleGPS() {
    if (!navigator.geolocation) {
      alert('GPS not supported by your browser')
      return
    }

    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`
          )
          const data = await res.json()
          const address = data.address || {}

          // Get state from response
          const detectedState = address.state || ''
          const detectedDistrict = address.state_district || address.county || address.city || ''
          const detectedCity = address.city || address.town || address.village || ''

          // Map state → major city
          const mappedCity = STATE_TO_CITY[detectedState.toLowerCase()] || null

          // Try to match directly to our city list first
          const directMatch = INDIAN_CITIES.find(c =>
            detectedCity.toLowerCase().includes(c.toLowerCase()) ||
            detectedDistrict.toLowerCase().includes(c.toLowerCase())
          )

          const finalCity = directMatch || mappedCity || detectedCity || 'Mumbai'
          const finalState = CITY_TO_STATE[finalCity] || detectedState || ''

          selectCity(finalCity)
        } catch {
          selectCity('Mumbai')
        } finally {
          setGpsLoading(false)
        }
      },
      () => {
        setGpsLoading(false)
        alert('Location access denied. Please select your city manually.')
      },
      { timeout: 10000 }
    )
  }

  async function updateBackendCity(newCity, newState) {
    try {
      const token = localStorage.getItem('sl_token')
      if (!token) return
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/update-city`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ city: newCity, state: newState })
      })
    } catch {
      // Non-critical
    }
  }

  const stateAbbr = STATE_ABBR[state] || ''

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs text-gray-300 hover:text-white px-2 py-1 rounded transition"
      >
        <MapPin className="h-3.5 w-3.5 text-brand-green" />
        <span className="font-medium max-w-[100px] truncate">
          {city || 'Select City'}{stateAbbr ? `, ${stateAbbr}` : ''}
        </span>
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">Select Your City</p>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* GPS Button */}
          <div className="p-3 border-b border-gray-100">
            <button
              onClick={handleGPS}
              disabled={gpsLoading}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-brand-green-light text-brand-green rounded-lg text-sm font-medium hover:bg-brand-green/20 disabled:opacity-50 transition"
            >
              <Navigation className="h-4 w-4" />
              {gpsLoading ? 'Detecting your location...' : 'Detect My Location (GPS)'}
            </button>
            <p className="text-[10px] text-gray-400 mt-1.5 px-1">
              Auto-detects your state & maps to nearest major city
            </p>
          </div>

          {/* City List */}
          <div className="max-h-52 overflow-y-auto p-2">
            {INDIAN_CITIES.sort().map(c => (
              <button
                key={c}
                onClick={() => selectCity(c)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center justify-between ${
                  city === c ? 'bg-brand-green-light text-brand-green font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{c}</span>
                <span className="text-[10px] text-gray-400">{CITY_TO_STATE[c] || ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
