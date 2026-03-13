"use client"
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { MdArrowBack, MdEmail, MdPhone, MdLocationOn, MdSend } from 'react-icons/md'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to send')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-4">
      <div className="max-w-4xl mx-auto py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <MdArrowBack className="text-gray-600 text-xl" />
          </Link>
          <div className="flex items-center gap-3">
            <Image src="/brand/logo.svg" alt="EduMate" width={40} height={40} />
            <h1 className="text-2xl font-bold text-gray-900">Contact Support</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">We're here to help</h2>
              <p className="text-gray-500 text-sm">
                Reach out to our support team and we'll get back to you as soon as possible.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <MdEmail className="text-[#1f75fe] text-xl" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Email</p>
                  <p className="text-gray-700 font-medium">support@edumate.app</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <MdPhone className="text-[#1f75fe] text-xl" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Phone</p>
                  <p className="text-gray-700 font-medium">+91 98765 43210</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <MdLocationOn className="text-[#1f75fe] text-xl" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Office Hours</p>
                  <p className="text-gray-700 font-medium">Mon – Fri, 9 AM – 6 PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-10">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                  <MdSend className="text-green-500 text-2xl" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Message Sent!</h3>
                <p className="text-gray-500 text-sm">We'll get back to you within 24 hours.</p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }) }}
                  className="text-[#1f75fe] text-sm font-medium hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Send us a message</h2>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Your name"
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#1f75fe] focus:ring-1 focus:ring-[#1f75fe]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="your@email.com"
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#1f75fe] focus:ring-1 focus:ring-[#1f75fe]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Subject</label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="How can we help?"
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#1f75fe] focus:ring-1 focus:ring-[#1f75fe]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Describe your issue..."
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#1f75fe] focus:ring-1 focus:ring-[#1f75fe] resize-none"
                  />
                </div>
                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#1f75fe] text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <MdSend className="text-base" />
                  )}
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
