'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RotateCcw, Package, Clock, CheckCircle, Plus } from 'lucide-react'
import api from '../../lib/api'

export default function MyReturnsPage() {
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.get('/api/v1/returns/my-returns')
        setReturns(res.data.returns || [])
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetch()
  }, [])

  const statusInfo = {
    pending: { label: 'Awaiting Pickup', color: 'bg-amber-100 text-amber-700', icon: '⏳' },
    rider_assigned: { label: 'Rider Assigned', color: 'bg-blue-100 text-blue-700', icon: '🚴' },
    picked_up: { label: 'Picked Up', color: 'bg-purple-100 text-purple-700', icon: '📦' },
    at_warehouse: { label: 'At Warehouse', color: 'bg-teal-100 text-teal-700', icon: '🏭' },
    listed: { label: 'Listed for Resale', color: 'bg-green-100 text-green-700', icon: '🏷️' },
    sold: { label: 'Sold', color: 'bg-brand-green-light text-brand-green', icon: '✅' },
  }

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 border-2 border-gray-200 border-t-brand-green rounded-full animate-spin" /></div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <RotateCcw className="h-5 w-5" /> My Returns
        </h1>
        <Link href="/returns/new"
          className="px-4 py-2 bg-brand-amber hover:bg-amber-500 text-white rounded-lg text-sm font-medium flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Initiate Return
        </Link>
      </div>

      {returns.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          <RotateCcw className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No returns yet.</p>
          <Link href="/returns/new" className="text-brand-amber text-sm hover:underline mt-2 inline-block">
            Initiate a Return →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {returns.map(ret => {
            const info = statusInfo[ret.status] || statusInfo.pending
            return (
              <div key={ret.return_id} className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {ret.product_image_url?.startsWith('http') ? (
                      <img src={ret.product_image_url} alt="" className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 text-sm">{ret.product_name}</h3>
                    <p className="text-xs text-gray-500">{ret.category} • {ret.return_reason}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${info.color}`}>
                        {info.icon} {info.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {ret.created_at ? new Date(ret.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {ret.status === 'pending' && (
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400">Pickup OTP</p>
                        <p className="text-lg font-bold text-amber-600">{ret.pickup_otp}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
