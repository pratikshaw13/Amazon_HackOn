'use client'

import { useEffect, useState } from 'react'
import { Leaf, Globe, TreePine, Recycle, Award, TrendingUp } from 'lucide-react'
import api from '../../../lib/api'

function getSellerToken() {
  return localStorage.getItem('sl_certified_seller_token')
}

export default function SellerGreenPage() {
  const [data, setData] = useState(null)
  const [seller, setSeller] = useState(null)
  const [loading, setLoading] = useState(true)
  const [gcData, setGcData] = useState(null)
  const [redeemMsg, setRedeemMsg] = useState('')
  const [redeemLoading, setRedeemLoading] = useState(false)

  useEffect(() => {
    async function fetch() {
      try {
        const [analyticsRes, profileRes, gcRes] = await Promise.all([
          api.get('/api/v1/seller-analytics/overview', { headers: { Authorization: `Bearer ${getSellerToken()}` } }),
          api.get('/api/v1/certified-seller/me', { headers: { Authorization: `Bearer ${getSellerToken()}` } }),
          api.get('/api/v1/certified-seller/green-credits', { headers: { Authorization: `Bearer ${getSellerToken()}` } }),
        ])
        setData(analyticsRes.data)
        setSeller(profileRes.data)
        setGcData(gcRes.data)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetch()
  }, [])

  async function handleRedeem(amount, voucherType) {
    setRedeemLoading(true)
    setRedeemMsg('')
    try {
      const res = await api.post('/api/v1/certified-seller/redeem-credits',
        { amount, voucher_type: voucherType },
        { headers: { Authorization: `Bearer ${getSellerToken()}` } }
      )
      setRedeemMsg(`${res.data.message} Code: ${res.data.voucher_code}`)
      setGcData(prev => prev ? { ...prev, balance: res.data.new_balance } : prev)
    } catch (err) {
      setRedeemMsg(err.response?.data?.detail || 'Redeem failed')
    } finally { setRedeemLoading(false) }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-gray-200 border-t-brand-green rounded-full animate-spin" /></div>
  if (!data || !seller) return null

  const s = data.summary
  const rescued = data.status_breakdown.rescued || 0
  const donated = data.status_breakdown.donated || 0
  const greenScore = int(seller.green_score || 0)
  const co2Saved = (rescued + donated) * 15.5  // ~15.5 kg per rescued item
  const treesEquivalent = Math.round(co2Saved / 21)  // ~21kg CO2 per tree per year
  const wastePreventedKg = (rescued + donated) * 2.3
  const circularScore = Math.min(100, Math.round((rescued + donated) / Math.max(1, s.total_products) * 200))

  function int(v) { return parseInt(v) || 0 }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-green to-brand-green-dark rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Leaf className="h-8 w-8" />
          <div>
            <h1 className="text-xl font-bold">Green Impact Dashboard</h1>
            <p className="text-sm text-green-200">{seller.company_name} • Sustainability Metrics</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-3xl font-bold">{greenScore}</p>
            <p className="text-xs text-green-200">Green Score /100</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-3xl font-bold">{Math.round(co2Saved)}</p>
            <p className="text-xs text-green-200">kg CO₂ Saved</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-3xl font-bold">{rescued + donated}</p>
            <p className="text-xs text-green-200">Products Saved</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-3xl font-bold">{circularScore}%</p>
            <p className="text-xs text-green-200">Circular Score</p>
          </div>
        </div>
      </div>

      {/* Impact Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ImpactCard icon={<Globe className="h-6 w-6 text-blue-500" />} label="CO₂ Prevented" value={`${Math.round(co2Saved)} kg`} sub="Equivalent to driving 400km less" />
        <ImpactCard icon={<TreePine className="h-6 w-6 text-green-600" />} label="Trees Equivalent" value={treesEquivalent} sub="Annual CO₂ absorption" />
        <ImpactCard icon={<Recycle className="h-6 w-6 text-brand-amber" />} label="Waste Prevented" value={`${Math.round(wastePreventedKg)} kg`} sub="Diverted from landfill" />
        <ImpactCard icon={<Award className="h-6 w-6 text-purple-500" />} label="Green Credits" value={gcData?.balance || 0} sub="Earned from sustainable actions" />
      </div>

      {/* How Credits Are Earned */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">How You Earn Green Score</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { action: "Rescue dead inventory", points: "+5 per product", icon: "🚀" },
            { action: "Cross-city routing (reuse)", points: "+8 per route", icon: "🗺️" },
            { action: "Donate products", points: "+10 per donation", icon: "💚" },
            { action: "Reduce return rate", points: "+3 per % reduced", icon: "📉" },
            { action: "Bundle unsold items", points: "+4 per bundle", icon: "📦" },
            { action: "Featured as green seller", points: "+15 badge", icon: "🏅" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm text-gray-700">{item.action}</span>
              </div>
              <span className="text-sm font-bold text-brand-green">{item.points}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sustainability Impact */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">Environmental Impact Breakdown</p>
        <div className="space-y-4">
          <ProgressMetric label="Products rescued from liquidation" current={rescued} max={s.total_products} color="bg-brand-green" />
          <ProgressMetric label="Products donated" current={donated} max={s.total_products} color="bg-emerald-500" />
          <ProgressMetric label="Circular economy participation" current={circularScore} max={100} color="bg-blue-500" />
          <ProgressMetric label="Green score" current={greenScore} max={100} color="bg-brand-green" />
        </div>
      </div>

      {/* Redeem Vouchers */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">Redeem Green Credits</p>
        {redeemMsg && (
          <div className="mb-3 p-2 bg-brand-green-light border border-brand-green/20 rounded-lg text-xs text-brand-green-dark">{redeemMsg}</div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: '₹50 Amazon Pay', cost: 100, icon: '💰' },
            { name: '₹100 Amazon Pay', cost: 200, icon: '💰' },
            { name: 'Free Delivery (5 orders)', cost: 50, icon: '🚚' },
            { name: '10% Off Coupon', cost: 75, icon: '🏷️' },
          ].map(v => (
            <button
              key={v.name}
              onClick={() => handleRedeem(v.cost, v.name)}
              disabled={redeemLoading || (gcData?.balance || 0) < v.cost}
              className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-left hover:border-brand-green hover:bg-brand-green-light transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="text-lg">{v.icon}</span>
              <p className="text-xs font-medium text-gray-900 mt-1">{v.name}</p>
              <p className="text-[10px] text-brand-green font-medium">{v.cost} credits</p>
            </button>
          ))}
        </div>
      </div>

      {/* Green Credits History */}
      {gcData?.history?.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">Credits Transaction History</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {gcData.history.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">{h.reason}</p>
                  <p className="text-[10px] text-gray-400">{h.timestamp ? new Date(h.timestamp).toLocaleDateString() : ''}</p>
                </div>
                <span className={`text-sm font-bold ${h.type === 'earn' ? 'text-green-600' : 'text-red-500'}`}>
                  {h.type === 'earn' ? '+' : '-'}{h.credits}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certification Badge */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-sm mb-3">
          <Leaf className="h-8 w-8 text-brand-green" />
        </div>
        <h3 className="font-bold text-gray-900 text-lg">Amazon SecondLife Green Certified Seller</h3>
        <p className="text-sm text-gray-500 mt-1">{seller.company_name} — Score: {greenScore}/100</p>
        <p className="text-xs text-gray-400 mt-3">
          Your contributions have prevented {Math.round(co2Saved)}kg of CO₂ emissions
          and saved {rescued + donated} products from landfill disposal.
        </p>
      </div>
    </div>
  )
}

function ImpactCard({ icon, label, value, sub }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function ProgressMetric({ label, current, max, color }) {
  const pct = Math.min(100, Math.round((current / Math.max(1, max)) * 100))
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-800">{current}/{max}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
