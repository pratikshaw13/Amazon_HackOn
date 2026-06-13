'use client'

import { useEffect, useState } from 'react'
import { agentsApi } from '../../lib/api'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { Bot, Eye, Brain, Users, MapPin, Shield } from 'lucide-react'

const agentIcons = {
  condition_agent: <Eye className="h-6 w-6 text-brand-green" />,
  routing_agent: <Brain className="h-6 w-6 text-brand-blue" />,
  buyer_matching_agent: <Users className="h-6 w-6 text-brand-amber" />,
  demand_agent: <MapPin className="h-6 w-6 text-purple-500" />,
  prevention_agent: <Shield className="h-6 w-6 text-brand-red" />,
}

export default function AgentsPage() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await agentsApi.getStatus()
        setAgents(res.data.agents || [])
      } catch (err) {
        console.error('Agent status error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStatus()
  }, [])

  if (loading) return <LoadingSpinner text="Checking agent status..." />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <Bot className="h-8 w-8 text-gray-700" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">AI Agent Orchestra</h1>
        <p className="text-gray-500 mt-1">5 specialized AI agents working together to power SecondLife</p>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-white border border-gray-100 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center">
                {agentIcons[agent.id] || <Bot className="h-6 w-6 text-gray-400" />}
              </div>
              <Badge variant="green">● Active</Badge>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{agent.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{agent.description}</p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
              <div>
                <p className="text-xs text-gray-400">Calls Today</p>
                <p className="text-sm font-bold text-gray-700">{agent.calls_today}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Avg Latency</p>
                <p className="text-sm font-bold text-gray-700">{agent.avg_latency_ms}ms</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Model</p>
                <p className="text-xs font-medium text-brand-blue">{agent.model?.split(' ')[0]}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Architecture Diagram */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">Agent Orchestration Flow</p>
        <div className="flex flex-col items-center gap-3">
          <div className="px-4 py-2 bg-brand-green-light rounded-lg text-sm font-medium text-brand-green">
            📸 User Uploads Photos
          </div>
          <div className="text-gray-300">↓</div>
          <div className="px-4 py-2 bg-brand-green-light rounded-lg text-sm font-medium text-brand-green">
            👁️ Condition Agent (Gemini Vision)
          </div>
          <div className="text-gray-300">↓</div>
          <div className="flex gap-4">
            <div className="px-3 py-2 bg-brand-blue-light rounded-lg text-xs font-medium text-brand-blue">
              📊 Demand Agent
            </div>
            <div className="px-3 py-2 bg-brand-amber-light rounded-lg text-xs font-medium text-brand-amber">
              👥 Buyer Agent
            </div>
          </div>
          <div className="text-gray-300">↓</div>
          <div className="px-4 py-2 bg-brand-blue-light rounded-lg text-sm font-medium text-brand-blue">
            🧠 Routing Agent (Decision)
          </div>
          <div className="text-gray-300">↓</div>
          <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
            ✅ Product Listed / Buyback / Donated
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">Technology Stack</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: 'Google Gemini', role: 'AI Vision + Text' },
            { name: 'LangChain', role: 'RAG Orchestration' },
            { name: 'FAISS', role: 'Vector Search' },
            { name: 'DynamoDB', role: 'Database' },
            { name: 'S3', role: 'Image Storage' },
            { name: 'FastAPI', role: 'Backend API' },
            { name: 'Next.js', role: 'Frontend' },
            { name: 'EC2', role: 'Hosting' },
          ].map((tech, i) => (
            <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-800">{tech.name}</p>
              <p className="text-xs text-gray-400">{tech.role}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
