'use client'

import { useEffect, useState } from 'react'
import { greenApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import api from '../../lib/api'
import { Leaf, Trophy, TreePine, Award, ShoppingBag, Clock, Globe, Recycle } from 'lucide-react'

export default function GreenPage() {
  const { user } = useAuth()
  const [credits, setCredits] = useState(null)
  const [rewards, setRewards] = useState([])
  const [ledger, setLedger] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [platformImpact, setPlatformImpact] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [redeemMsg, setRedeemMsg] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const userId = user?.user_id || 'demo_user'
      const [creditsRes, rewardsRes, ledgerRes, leaderRes, impactRes] = await Promise.allSettled([
        greenApi.getCredits(userId),
        api.get('/api/v1/green/rewards/catalog'),
        api.get(`/api/v1/green/${userId}/ledger`),
        greenApi.getLeaderboard(),
        api.get('/api/v1/green/impact/platform'),
      ])
      if (creditsRes.status === 'fulfilled') setCredits(creditsRes.value.data)
      if (rewardsRes.status === 'fulfilled') setRewards(rewardsRes.value.data.rewards || [])
      if (ledgerRes.status === 'fulfilled') setLedger(ledgerRes.value.data.ledger || [])
      if (leaderRes.status === 'fulfilled') setLeaderboard(leaderRes.value.data.leaderboard || [])
      if (impactRes.status === 'fulfilled') setPlatformImpact(impactRes.value.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRedeem(rewardId) {
    try {
      const userId = user?.user_id || 'demo_user'
      const res = await api.post(`/api/v1/green/${userId}/redeem`, { reward_id: rewardId })
      setRedeemMsg(res.data.message)
      setCredits(prev => ({ ...prev, balance: res.data.new_balance }))
      setTimeout(() => setRedeemMsg(''), 4000)
    } catch (err) {
      setRedeemMsg(err.response?.data?.detail || 'Redemption failed')
      setTimeout(() => setRedeemMsg(''), 4000)
    }
  }

  if (loading) return <LoadingSpinner text="Loading Green Credits..." />

  const balance = credits?.balance || 0
  const impact = credits?.impact || {}
  const levelProgress = credits?.level_progress || {}

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'rewards', label: 'Rewards Shop' },
    { id: 'ledger', label: 'Credit History' },
    { id: 'leaderboard', label: 'Leaderboard' },
  ]

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-brand-green to-brand-green-dark rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Leaf className="h-5 w-5" />
              <span className="text-sm font-medium text-green-200">Green Credits Balance</span>
            </div>
            <p className="text-5xl font-bold">{balance.toLocaleString()}</p>
            <div className="flex items-center gap-3 mt-3">
              <Badge variant="green" className="bg-white/20 text-white border-0">
                🌿 {levelProgress.current_level || 'Seedling'}
              </Badge>
              <span className="text-xs text-green-200">{levelProgress.credits_to_next || 0} credits to {levelProgress.next_level}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-white/10 rounded-lg px-4 py-2">
              <p className="text-2xl font-bold">{impact.co2_saved_kg || 0}</p>
              <p className="text-xs text-green-200">kg CO₂ Saved</p>
            </div>
            <div className="bg-white/10 rounded-lg px-4 py-2">
              <p className="text-2xl font-bold">{impact.products_saved || 0}</p>
              <p className="text-xs text-green-200">Products Saved</p>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4">
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${levelProgress.progress_pct || 0}%` }} />
          </div>
        </div>
      </div>

      {/* Redeem message */}
      {redeemMsg && (
        <div className="bg-brand-green-light border border-brand-green/20 rounded-xl p-3 text-sm text-brand-green-dark font-medium text-center">
          {redeemMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
              tab === t.id ? 'bg-brand-green text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Impact Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <Globe className="h-6 w-6 text-brand-green mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{impact.co2_saved_kg || 0} kg</p>
              <p className="text-xs text-gray-400">CO₂ Prevented</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <TreePine className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{impact.trees_planted || 0}</p>
              <p className="text-xs text-gray-400">Trees Planted</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <Recycle className="h-6 w-6 text-brand-blue mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{impact.circular_economy_score || 0}%</p>
              <p className="text-xs text-gray-400">Circular Score</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <ShoppingBag className="h-6 w-6 text-brand-amber mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{impact.packaging_saved_kg || 0} kg</p>
              <p className="text-xs text-gray-400">Packaging Saved</p>
            </div>
          </div>

          {/* Earn credits */}
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">How to Earn</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { action: 'Sell a product', credits: 50, icon: '🏷️' },
                { action: 'Donate a product', credits: 75, icon: '💚' },
                { action: 'Buy pre-owned', credits: 30, icon: '🛒' },
                { action: 'P2P Exchange', credits: 40, icon: '🤝' },
                { action: 'Cross-city reuse', credits: 60, icon: '🚛' },
                { action: 'Verify a product', credits: 10, icon: '✓' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm text-gray-700">{item.action}</span>
                  </div>
                  <span className="text-sm font-bold text-brand-green">+{item.credits}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Impact */}
          {platformImpact && (
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">Platform Impact</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="bg-brand-green-light rounded-lg p-3">
                  <p className="text-xl font-bold text-brand-green">{platformImpact.total_co2_saved_tons}t</p>
                  <p className="text-xs text-gray-500">Total CO₂ Saved</p>
                </div>
                <div className="bg-brand-blue-light rounded-lg p-3">
                  <p className="text-xl font-bold text-brand-blue">{platformImpact.total_products_saved}</p>
                  <p className="text-xs text-gray-500">Products Saved</p>
                </div>
                <div className="bg-brand-amber-light rounded-lg p-3">
                  <p className="text-xl font-bold text-brand-amber">{platformImpact.total_trees_planted}</p>
                  <p className="text-xs text-gray-500">Trees Planted</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xl font-bold text-gray-700">{platformImpact.active_green_users}</p>
                  <p className="text-xs text-gray-500">Active Users</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'rewards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((reward) => (
            <div key={reward.reward_id} className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{reward.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{reward.name}</h3>
                  <p className="text-xs text-gray-400">{reward.category}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4 flex-1">{reward.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-brand-green">{reward.cost} credits</span>
                <button
                  onClick={() => handleRedeem(reward.reward_id)}
                  disabled={balance < reward.cost}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    balance >= reward.cost
                      ? 'bg-brand-green text-white hover:bg-brand-green-dark'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Redeem
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'ledger' && (
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">Credit Transaction History</p>
          {ledger.length > 0 ? (
            <div className="space-y-2">
              {ledger.map((entry, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      entry.type === 'redeem' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {entry.type === 'redeem' ? '-' : '+'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {entry.type === 'redeem' ? entry.reward_name || 'Redeemed' : entry.action?.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${entry.type === 'redeem' ? 'text-red-500' : 'text-brand-green'}`}>
                    {entry.type === 'redeem' ? '-' : '+'}{entry.credits}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">No transactions yet. Start earning by selling or buying!</p>
          )}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-brand-amber" />
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Top Contributors</p>
          </div>
          {leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.map((entry) => (
                <div key={entry.rank} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      entry.rank === 1 ? 'bg-yellow-500' : entry.rank === 2 ? 'bg-gray-400' : entry.rank === 3 ? 'bg-amber-600' : 'bg-gray-300'
                    }`}>
                      {entry.rank}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{entry.name || entry.user_id?.slice(0, 8)}</p>
                      <p className="text-xs text-gray-400">{entry.level} • {entry.products_saved} products saved</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-brand-green">{entry.balance}</p>
                    <p className="text-xs text-gray-400">credits</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">No leaderboard data yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
