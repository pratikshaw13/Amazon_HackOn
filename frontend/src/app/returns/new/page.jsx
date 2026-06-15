'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, User, Upload, Send, CheckCircle, ArrowLeft } from 'lucide-react'
import api from '../../../lib/api'

const CATEGORIES = ["Electronics", "Baby Products", "Fashion", "Home", "Kitchen", "Books", "Sports", "Personal Care", "Toys", "Furniture"]
const REASONS = [
  "Product not as described", "Defective / Damaged", "Wrong item delivered",
  "Better price available", "No longer needed", "Size/fit issue",
  "Quality not satisfactory", "Missing parts/accessories", "Arrived too late", "Changed my mind"
]

export default function NewReturnPage() {
  const router = useRouter()
  const [step, setStep] = useState('category')
  const [formData, setFormData] = useState({ category: '', reason: '', product_name: '', order_number: '', description: '', original_price: '' })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi! I'll help you initiate a return. **What category** is the product you want to return?" }
  ])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)

  function addMsg(role, text) {
    setMessages(prev => [...prev, { role, text }])
  }

  function handleCategory(cat) {
    setFormData(p => ({ ...p, category: cat }))
    addMsg('user', cat)
    addMsg('bot', `Got it — **${cat}**. What's the product name?`)
    setStep('product_name')
  }

  function handleProductName(e) {
    e.preventDefault()
    const name = e.target.elements.input.value
    if (!name) return
    setFormData(p => ({ ...p, product_name: name }))
    addMsg('user', name)
    addMsg('bot', 'What was your Amazon order number? (Optional — skip if unknown)')
    setStep('order_number')
    e.target.reset()
  }

  function handleOrderNumber(e) {
    e.preventDefault()
    const num = e.target.elements.input.value || 'N/A'
    setFormData(p => ({ ...p, order_number: num }))
    addMsg('user', num)
    addMsg('bot', '**Why are you returning this item?** Select a reason:')
    setStep('reason')
    e.target.reset()
  }

  function handleReason(reason) {
    setFormData(p => ({ ...p, reason }))
    addMsg('user', reason)
    addMsg('bot', 'What was the original price (₹)?')
    setStep('price')
  }

  function handlePrice(e) {
    e.preventDefault()
    const price = e.target.elements.input.value || '0'
    setFormData(p => ({ ...p, original_price: price }))
    addMsg('user', `₹${price}`)
    addMsg('bot', 'Please upload a photo of the product (optional but helps with faster processing).')
    setStep('image')
    e.target.reset()
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      addMsg('user', '📸 Photo uploaded')
      addMsg('bot', `Great! Here's your return summary:\n\n**Product:** ${formData.product_name}\n**Category:** ${formData.category}\n**Reason:** ${formData.reason}\n**Price:** ₹${formData.original_price}\n\nClick **Submit Return** to confirm.`)
      setStep('confirm')
    }
  }

  function skipImage() {
    addMsg('user', 'Skipped photo')
    addMsg('bot', `Here's your return summary:\n\n**Product:** ${formData.product_name}\n**Category:** ${formData.category}\n**Reason:** ${formData.reason}\n**Price:** ₹${formData.original_price}\n\nClick **Submit Return** to confirm.`)
    setStep('confirm')
  }

  async function handleSubmit() {
    setLoading(true)
    addMsg('user', '✅ Confirm Return')
    try {
      const fd = new FormData()
      fd.append('product_name', formData.product_name)
      fd.append('category', formData.category)
      fd.append('order_number', formData.order_number)
      fd.append('return_reason', formData.reason)
      fd.append('description', formData.description)
      fd.append('original_price', formData.original_price || '0')
      if (imageFile) fd.append('image', imageFile)

      const res = await api.post('/api/v1/returns/create', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(res.data)
      addMsg('bot', `🎉 **Return request submitted!**\n\nReturn ID: ${res.data.return_id}\nPickup OTP: **${res.data.pickup_otp}**\n\nA delivery partner will be assigned to pick up the item from your location. Share the OTP with them.`)
      setStep('done')
    } catch (err) {
      addMsg('bot', '⚠️ Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <button onClick={() => router.push('/returns')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
          <Bot className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="font-bold text-gray-900">Return Assistant</h1>
          <p className="text-xs text-gray-400">Initiate an Amazon product return</p>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'bot' && <div className="w-7 h-7 rounded-full bg-amber-100 flex-shrink-0 flex items-center justify-center"><Bot className="h-3.5 w-3.5 text-amber-600" /></div>}
            <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${msg.role === 'user' ? 'bg-brand-green text-white rounded-br-sm' : 'bg-white border border-gray-100 rounded-bl-sm shadow-sm'}`}
              dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
            {msg.role === 'user' && <div className="w-7 h-7 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center"><User className="h-3.5 w-3.5 text-gray-600" /></div>}
          </div>
        ))}
        {loading && <div className="flex gap-2"><div className="w-7 h-7 rounded-full bg-amber-100 flex-shrink-0" /><div className="px-3 py-2 bg-white border border-gray-100 rounded-xl"><div className="flex gap-1"><div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" /><div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay:'150ms'}} /><div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay:'300ms'}} /></div></div></div>}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-100 pt-3">
        {step === 'category' && (
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => handleCategory(c)}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-amber-50 hover:border-amber-300 transition">
                {c}
              </button>
            ))}
          </div>
        )}

        {(step === 'product_name' || step === 'order_number' || step === 'price') && (
          <form onSubmit={step === 'product_name' ? handleProductName : step === 'order_number' ? handleOrderNumber : handlePrice} className="flex gap-2">
            <input name="input" placeholder={step === 'product_name' ? 'e.g., Sony WH-1000XM5' : step === 'order_number' ? 'e.g., 171-1234567-1234567 (or skip)' : 'e.g., 29990'}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
            <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-lg"><Send className="h-4 w-4" /></button>
          </form>
        )}

        {step === 'reason' && (
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {REASONS.map(r => (
              <button key={r} onClick={() => handleReason(r)}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-left text-gray-700 hover:bg-amber-50 hover:border-amber-300 transition">
                {r}
              </button>
            ))}
          </div>
        )}

        {step === 'image' && (
          <div className="flex gap-2">
            <input type="file" ref={fileRef} onChange={handleImageChange} accept="image/*" className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="flex-1 py-2.5 bg-amber-500 text-white rounded-lg font-medium flex items-center justify-center gap-2">
              <Upload className="h-4 w-4" /> Upload Photo
            </button>
            <button onClick={skipImage} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium">Skip</button>
          </div>
        )}

        {step === 'confirm' && (
          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-3 bg-brand-green hover:bg-brand-green-dark text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
            <CheckCircle className="h-4 w-4" /> Submit Return Request
          </button>
        )}

        {step === 'done' && (
          <div className="flex gap-2">
            <button onClick={() => router.push('/returns')} className="flex-1 py-2.5 bg-brand-green text-white rounded-lg font-medium">
              View My Returns
            </button>
            <button onClick={() => { setMessages([messages[0]]); setStep('category'); setFormData({category:'',reason:'',product_name:'',order_number:'',description:'',original_price:''}) }}
              className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium">
              New Return
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
