'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Leaf, TrendingUp, Clock, Package, Zap, Star } from 'lucide-react'
import api from '../../../lib/api'

function getToken() { return localStorage.getItem('sl_delivery_token') }

export default function EarningsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.get('/api/v1/delivery-partner/earnings', {
          headers: { Authorization: `Bearer ${getToken()}` }
        })
        setData(res.data)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetch()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-gray-200 border-t-amber-500 rounded-full animate-spin" /></div>
  if (!data) return null

  const s = data.summary
  const rate = data.rate_card

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-green-600" /> Earnings & Green Credits
      </h1>

      {/* Total Earnings Hero */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
        <p className="text-sm text-green-100">Total Lifetime Earnings</p>
        <p className="text-4xl font-bold mt-1">₹{Number(s.total_earnings).toLocaleString()}</p>
        <div className="flex gap-6 mt-4">
          <div>
            <p className="text-xl font-bold">{s.total_deliveries}</p>
            <p className="text-xs text-green-200">Deliveries</p>
          </div>
          <div>
            <p className="text-xl font-bold">{s.green_credits_earned}</p>
            <p className="text-xs text-green-200">Green Credits</p>
          </div>
          <div>
            <p className="text-xl font-bold">{s.hours_worked_approx}h</p>
            <p className="text-xs text-green-200">Hours Worked</p>
          </div>
        </div>
      </div>

      {/* Today's Earnings */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Today</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-lg font-bold text-green-600">₹{s.today_earnings}</p>
            <p className="text-xs text-gray-500">Earned Today</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-lg font-bold text-amber-600">{s.today_deliveries}</p>
            <p className="text-xs text-gray-500">Deliveries</p>
          </div>
          <div className="bg-brand-green-light rounded-lg p-3">
            <p className="text-lg font-bold text-brand-green">+{s.today_green_credits}</p>
            <p className="text-xs text-gray-500">Green Credits</p>
          </div>
        </div>
      </div>

      {/* Earnings Breakdown */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Breakdown</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-gray-700">Flex Base (₹470/4hr blocks)</span>
            </div>
            <span className="font-bold text-gray-900">₹{s.flex_base_earned}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-700">Per-Delivery Bonus (₹15-20 each)</span>
            </div>
            <span className="font-bold text-gray-900">₹{s.per_delivery_earned}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-700">Average Per Delivery</span>
            </div>
            <span className="font-bold text-green-600">₹{s.avg_per_delivery}</span>
          </div>
        </div>
      </div>

      {/* Rate Card */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">SecondLife Flex Rate Card</p>
        <div className="grid grid-cols-2 gap-3">
          <RateItem icon={<Clock className="h-4 w-4 text-amber-500" />} label="Base Rate (4hr block)" value={`₹${rate.flex_base_per_4hr}`} />
          <RateItem icon={<Package className="h-4 w-4 text-blue-500" />} label="Per Delivery" value={`₹${rate.per_delivery_min}-${rate.per_delivery_max}`} />
          <RateItem icon={<Leaf className="h-4 w-4 text-brand-green" />} label="Green Credits/delivery" value={`+${rate.green_credits_per_delivery}`} />
          <RateItem icon={<Zap className="h-4 w-4 text-orange-500" />} label="Peak Hour Bonus" value={`+₹${rate.peak_hour_bonus}`} />
          <RateItem icon={<Star className="h-4 w-4 text-yellow-500" />} label="High Rating Bonus (4.8+)" value={`+₹${rate.high_rating_bonus}`} />
        </div>
      </div>

      {/* Delivery Log */}
      {data.delivery_log.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Recent Deliveries</p>
          <div className="space-y-2">
            {data.delivery_log.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                <div>
                  <p className="font-medium text-gray-800 truncate max-w-[200px]">{d.product_name}</p>
                  <p className="text-xs text-gray-400">{d.seller_city} • {d.distance_km}km • {d.date ? new Date(d.date).toLocaleDateString() : ''}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">₹{d.earning}</p>
                  <p className="text-xs text-brand-green">+{d.green_credits} 🌱</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Green Credits History & Redeem */}
      <GreenCreditsSection />
    </div>
  )
}

function GreenCreditsSection() {
  const [gcData, setGcData] = useState(null)
  const [redeemMsg, setRedeemMsg] = useState('')
  const [redeemLoading, setRedeemLoading] = useState(false)

  useEffect(() => {
    async function fetchGC() {
      try {
        const res = await api.get('/api/v1/delivery-partner/green-credits', {
          headers: { Authorization: `Bearer ${getToken()}` }
        })
        setGcData(res.data)
      } catch (err) { console.error(err) }
    }
    fetchGC()
  }, [])

  async function handleRedeem(amount, voucherType) {
    setRedeemLoading(true)
    setRedeemMsg('')
    try {
      const res = await api.post('/api/v1/delivery-partner/redeem-credits', 
        { amount, voucher_type: voucherType },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      )
      setRedeemMsg(`${res.data.message} Code: ${res.data.voucher_code}`)
      setGcData(prev => prev ? { ...prev, balance: res.data.new_balance } : prev)
    } catch (err) {
      setRedeemMsg(err.response?.data?.detail || 'Redeem failed')
    } finally { setRedeemLoading(false) }
  }

  if (!gcData) return null

  const vouchers = [
    { name: '₹50 Amazon Pay', cost: 100, icon: '💰' },
    { name: '₹100 Amazon Pay', cost: 200, icon: '💰' },
    { name: 'Free Delivery Coupon', cost: 50, icon: '🚚' },
    { name: '10% Off Coupon', cost: 75, icon: '🏷️' },
  ]

  return (
    <>
      {/* Green Credits Balance */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Leaf className="h-5 w-5" />
          <span className="text-sm font-medium text-green-100">Green Credits</span>
        </div>
        <p className="text-3xl font-bold">{gcData.balance}</p>
        <div className="flex gap-4 mt-2 text-xs text-green-200">
          <span>Earned: {gcData.total_earned}</span>
          <span>Redeemed: {gcData.total_redeemed}</span>
        </div>
      </div>

      {/* Redeem Vouchers */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Redeem Credits</p>
        {redeemMsg && (
          <div className="mb-3 p-2 bg-brand-green-light border border-brand-green/20 rounded-lg text-xs text-brand-green-dark">{redeemMsg}</div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {vouchers.map(v => (
            <button
              key={v.name}
              onClick={() => handleRedeem(v.cost, v.name)}
              disabled={redeemLoading || gcData.balance < v.cost}
              className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-left hover:border-brand-green hover:bg-brand-green-light transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="text-lg">{v.icon}</span>
              <p className="text-xs font-medium text-gray-900 mt-1">{v.name}</p>
              <p className="text-[10px] text-brand-green font-medium">{v.cost} credits</p>
            </button>
          ))}
        </div>
      </div>

      {/* Credit History */}
      {gcData.history.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Green Credits History</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {gcData.history.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs font-medium text-gray-800">{h.reason}</p>
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
    </>
  )
}

function RateItem({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
      {icon}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-bold text-gray-800">{value}</p>
      </div>
    </div>
  )
}
