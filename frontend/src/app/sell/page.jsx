'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { valuationApi } from '../../lib/api'
import { CATEGORIES } from '../../lib/constants'
import { Bot, User, Send, Upload, Camera, Check, Sparkles, ArrowRight } from 'lucide-react'
import api from '../../lib/api'

export default function SellPage() {
  const router = useRouter()
  const [messages, setMessages] = useState([
    {
      role: 'agent',
      text: "👋 Hi! I'm your SecondLife AI selling assistant. I'll help you list your product in under 60 seconds.\n\nLet's start — **what category** does your product belong to?",
      options: CATEGORIES
    }
  ])
  const [step, setStep] = useState('category')
  const [sessionData, setSessionData] = useState({})
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)
  const chatEndRef = useRef(null)

  function scrollToBottom() {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  function addMessage(role, text, options = null, extra = null) {
    setMessages(prev => [...prev, { role, text, options, ...extra }])
    scrollToBottom()
  }

  async function handleCategorySelect(category) {
    addMessage('user', category)
    setSessionData(prev => ({ ...prev, category }))
    setStep('scope')

    const userCity = localStorage.getItem('sl_user_city') || 'your city'

    setTimeout(() => {
      addMessage('agent', `Great choice! **${category}** is in demand right now 📈\n\nWhere would you like to sell this product?`, null, { scopeOptions: true, city: userCity })
      scrollToBottom()
    }, 500)
  }

  function handleScopeSelect(scope) {
    const userCity = localStorage.getItem('sl_user_city') || 'Mumbai'
    addMessage('user', scope === 'local' ? `🏠 Local: ${userCity} only` : `🌐 Regional: ${userCity} + nearby cities`)
    setSessionData(prev => ({ ...prev, listing_scope: scope, listing_city: userCity }))
    setStep('image')

    const credits = scope === 'local' ? 50 : 30
    setTimeout(() => {
      addMessage('agent', `${scope === 'local' ? '🏠' : '🌐'} Got it! Listing for **${scope === 'local' ? userCity + ' only' : userCity + ' + neighbouring cities'}**.\nYou'll earn **+${credits} extra Green Credits** on sale.\n\nNow please **upload 1-5 photos** of your product.`)
      scrollToBottom()
    }, 500)
  }

  async function handleImageUpload(e) {
    const files = Array.from(e.target.files || []).slice(0, 5)
    if (files.length === 0) return

    addMessage('user', `📸 Uploaded ${files.length} photo${files.length > 1 ? 's' : ''}`)
    setLoading(true)

    try {
      const formData = new FormData()
      files.forEach(f => formData.append('images', f))
      formData.append('category', sessionData.category || 'Electronics')
      formData.append('product_name', sessionData.product_name || '')

      const res = await api.post('/api/v1/sell/agent/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const data = res.data

      setSessionData(prev => ({
        ...prev,
        product_id: data.product_id,
        image_urls: data.image_urls,
        ai_assessment: data.ai_assessment,
      }))

      addMessage('agent', data.message)
      setStep('details')
    } catch (err) {
      addMessage('agent', '⚠️ Image upload failed. Please try again.')
    } finally {
      setLoading(false)
      scrollToBottom()
    }
  }

  async function handleDetailsSubmit(e) {
    e.preventDefault()
    const name = e.target.product_name.value
    const price = parseFloat(e.target.original_price.value)

    if (!name || !price) return

    addMessage('user', `Product: ${name}\nOriginal Price: ₹${price.toLocaleString()}`)
    setSessionData(prev => ({ ...prev, product_name: name, original_price: price }))
    setLoading(true)

    try {
      const res = await api.post('/api/v1/sell/agent/estimate', {
        step: 'details',
        category: sessionData.category,
        product_name: name,
        original_price: price,
        product_id: sessionData.product_id,
      })
      const data = res.data
      setSessionData(prev => ({ ...prev, estimate: data.estimate }))
      addMessage('agent', data.message)
      setStep('confirm')
    } catch (err) {
      addMessage('agent', '⚠️ Estimation failed. Please try again.')
    } finally {
      setLoading(false)
      scrollToBottom()
    }
  }

  async function handleConfirm() {
    addMessage('user', '✅ Confirm — List it!')
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('product_id', sessionData.product_id || '')
      formData.append('product_name', sessionData.product_name || '')
      formData.append('category', sessionData.category || 'Electronics')
      formData.append('original_price', String(sessionData.original_price || 5000))
      formData.append('estimated_value', String(sessionData.estimate?.estimated_value || 3000))
      formData.append('condition_score', String(sessionData.ai_assessment?.condition_score || 75))
      formData.append('condition_grade', sessionData.ai_assessment?.condition_grade || 'Good')
      formData.append('green_impact_kg', String(sessionData.ai_assessment?.green_impact_kg || 15))
      formData.append('image_urls', JSON.stringify(sessionData.image_urls || []))
      formData.append('listing_scope', sessionData.listing_scope || 'regional')
      formData.append('listing_city', sessionData.listing_city || localStorage.getItem('sl_user_city') || 'Mumbai')

      const res = await api.post('/api/v1/sell/agent/confirm', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const data = res.data
      addMessage('agent', data.message)
      setStep('done')
    } catch (err) {
      addMessage('agent', '⚠️ Listing failed. Please try again.')
    } finally {
      setLoading(false)
      scrollToBottom()
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 rounded-full bg-brand-green-light flex items-center justify-center">
          <Bot className="h-5 w-5 text-brand-green" />
        </div>
        <div>
          <h1 className="font-bold text-gray-900">SecondLife AI Agent</h1>
          <p className="text-xs text-gray-400">Your personal selling assistant</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'agent' && (
              <div className="w-8 h-8 rounded-full bg-brand-green-light flex-shrink-0 flex items-center justify-center">
                <Bot className="h-4 w-4 text-brand-green" />
              </div>
            )}
            <div className={`max-w-[80%] ${
              msg.role === 'user'
                ? 'bg-brand-green text-white rounded-2xl rounded-br-md px-4 py-2.5'
                : 'bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm'
            }`}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
              />
              {/* Category options */}
              {msg.options && step === 'category' && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {msg.options.map(opt => (
                    <button key={opt} onClick={() => handleCategorySelect(opt)}
                      className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-brand-green-light hover:border-brand-green hover:text-brand-green transition">
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {/* Scope options (local vs regional) */}
              {msg.scopeOptions && step === 'scope' && (
                <div className="grid grid-cols-1 gap-2 mt-3">
                  <button onClick={() => handleScopeSelect('local')}
                    className="px-3 py-2.5 bg-brand-green-light border border-brand-green/30 rounded-lg text-sm font-medium text-brand-green-dark hover:bg-brand-green/20 transition text-left">
                    🏠 <strong>My City Only</strong> ({msg.city}) — <span className="text-brand-green">+50 extra Green Credits</span>
                  </button>
                  <button onClick={() => handleScopeSelect('regional')}
                    className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-brand-blue-light hover:border-brand-blue/30 transition text-left">
                    🌐 <strong>Neighbouring Cities</strong> — <span className="text-gray-500">+30 Green Credits</span>
                  </button>
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
                <User className="h-4 w-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-green-light flex-shrink-0 flex items-center justify-center">
              <Bot className="h-4 w-4 text-brand-green" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-100 pt-4">
        {step === 'image' && (
          <div className="flex gap-2">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={loading}
              className="flex-1 py-3 bg-brand-green text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-brand-green-dark disabled:opacity-50">
              <Upload className="h-4 w-4" /> Upload Photos
            </button>
          </div>
        )}

        {step === 'details' && (
          <form onSubmit={handleDetailsSubmit} className="space-y-3">
            <input name="product_name" placeholder="Product name (e.g., Sony WH-1000XM5)" required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30" />
            <div className="flex gap-2">
              <input name="original_price" type="number" placeholder="Original price (₹)" required
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30" />
              <button type="submit" disabled={loading}
                className="px-6 py-2.5 bg-brand-green text-white rounded-xl font-medium flex items-center gap-2 hover:bg-brand-green-dark disabled:opacity-50">
                <Send className="h-4 w-4" /> Estimate
              </button>
            </div>
          </form>
        )}

        {step === 'confirm' && (
          <div className="flex gap-2">
            <button onClick={handleConfirm} disabled={loading}
              className="flex-1 py-3 bg-brand-green text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-brand-green-dark disabled:opacity-50">
              <Check className="h-4 w-4" /> Confirm & List Product
            </button>
            <button onClick={() => { setStep('details'); addMessage('agent', 'No problem! Let me adjust the details.') }}
              className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200">
              Edit
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="flex gap-2">
            <button onClick={() => router.push('/marketplace')}
              className="flex-1 py-3 bg-brand-green text-white rounded-xl font-medium flex items-center justify-center gap-2">
              View Marketplace <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => { setMessages([messages[0]]); setStep('category'); setSessionData({}) }}
              className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200">
              Sell Another
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
