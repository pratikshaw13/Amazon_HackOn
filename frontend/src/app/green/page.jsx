'use client'

import { useEffect, useState } from 'react'
import { greenApi } from '../../lib/api'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { Leaf, Trophy, TreePine, Recycle } from 'lucide-react'

const DEMO_USER = 'demo_user'

export default function GreenPage() {
  const [credits, setCredits] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [creditsRes, leaderboardRes] = await Promise.all([
        greenApi.getCredits(DEMO_USER),
        greenApi.getLeaderboard()
      ])
      setCredits(creditsRes.data)
      setLeaderboard(leaderboardRes.data.leaderboard || [])
    } catch (err) {
      console.error('Green credits error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading Green Credits..." />

  const levelProgress = credits ? (credits.balance / 300) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-brand-green to-brand-green-dark rounded-2xl p-8 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Leaf className="h-5 w-5" />
          <span className="text-sm font-medium text-green-200">Green Credits Balance</span>
        </div>
        <p className="text-5xl font-bold">{credits?.balance || 0}</p>
        <div className="mt-4 flex items-center gap-3">
          <Badge variant="green" className="bg-white/20 text-white">
            🌿 {credits?.level || 'Seedling'}
          </Badge>
          <div className="flex-1">
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${Math.min(levelProgress, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Impact Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-brand-green">{credits?.co2_saved_kg || 0} kg</p>
          <p className="text-xs text-gray-400 mt-1">CO₂ Saved</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-brand-blue">{credits?.products_saved || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Products Given Second Life</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-brand-amber">{credits?.packaging_saved_kg || 0} kg</p>
          <p className="text-xs text-gray-400 mt-1">Packaging Saved</p>
        </div>
      </div>

      {/* Earn Credits */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">Earn Green Credits</p>
        <div className="space-y-3">
          {[
            { action: 'Sell a pre-owned item', credits: 50, icon: '🏷️' },
            { action: 'Donate an item', credits: 75, icon: '💚' },
            { action: 'Buy pre-owned (vs new)', credits: 30, icon: '🛒' },
            { action: 'P2P Exchange', credits: 40, icon: '🤝' },
            { action: 'Upload photos for AI verification', credits: 10, icon: '📸' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm text-gray-700">{item.action}</span>
              </div>
              <span className="text-sm font-bold text-brand-green">+{item.credits}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-4 w-4 text-brand-amber" />
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Leaderboard</p>
        </div>
        {leaderboard.length > 0 ? (
          <div className="space-y-2">
            {leaderboard.map((entry, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-green-light text-brand-green text-xs font-bold flex items-center justify-center">
                    {entry.rank}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{entry.user_id}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-brand-green">{entry.balance} credits</span>
                  <p className="text-xs text-gray-400">{entry.level}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">No leaderboard data yet</p>
        )}
      </div>
    </div>
  )
}
