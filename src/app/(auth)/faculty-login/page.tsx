"use client"
import Image from 'next/image'
import React, { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'

export default function FacultyLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      console.log("✅ Logged in:", userCredential.user)

      toast.success("Login successful! 🎉 Redirecting...")
      setTimeout(() => {
        router.push('/faculty/dashboard')
      }, 1500)

    } catch (err: any) {
      console.error(err)
      toast.error(err.code === "auth/invalid-credential" 
        ? "Invalid email or password ❌" 
        : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#1f75fe]/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-purple-400/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10 bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className=" mx-auto rounded-full flex items-center justify-center">
            <Image src={'/brand/logo.svg'} alt='' width={100} height={100}/>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Faculty Portal</h2>
          <p className="text-gray-600">Sign in to access your edumate dashboard</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1f75fe] focus:border-transparent transition-all duration-300 placeholder-gray-500"
              placeholder="faculty@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1f75fe] focus:border-transparent transition-all duration-300 placeholder-gray-500"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <div></div>
            <a href="#" className="text-[#1f75fe] hover:underline font-medium">
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#1f75fe] to-blue-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#1f75fe]/50 disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  )
}
