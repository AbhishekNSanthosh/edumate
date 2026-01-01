"use client"
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '../../../config/firebaseConfig'
import { useAuth } from '../../../context/AuthContext'
import toast from 'react-hot-toast'

export default function ParentLogin() {
  const { user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && user) {
        // Redirect to Parent dashboard
      router.replace('/parent/dashboard')
    }
  }, [user, authLoading, router])

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/invalid-credential':
        return 'Incorrect email or password.';
      case 'auth/user-not-found':
        return 'No account found with this email.'; // Generic message since we use Student creds
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return;
    
    setLoading(true)
    const toastId = toast.loading("Verifying credentials...");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      console.log("✅ Logged in:", userCredential.user)

      toast.success("Welcome back! Redirecting...", { id: toastId })
      setTimeout(() => {
        router.push('/parent/dashboard')
      }, 1000)

    } catch (err: any) {
      console.error(err)
      const message = getErrorMessage(err.code);
      toast.error(message, { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        // Handled by onSubmit
    }
  }

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#1f75fe]/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-purple-400/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-8 border border-white/20">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto rounded-full flex items-center justify-center">
            <Image src={'/brand/logo.svg'} alt='Edumate Logo' width={120} height={40} priority className="h-10 w-auto"/>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Parent Portal</h2>
          <p className="text-gray-500 text-sm">Sign in using Student credentials</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6" onKeyDown={handleKeyDown}>
          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 ml-1">
              Student Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder-gray-400 text-gray-900"
              placeholder="student@example.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 ml-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder-gray-400 text-gray-900"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
                <input id="remember_me" name="remember_me" type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"/>
                <label htmlFor="remember_me" className="ml-2 block text-gray-600">Remember me</label>
            </div>
            <a href="#" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
                <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                </span>
            ) : "Sign In"}
          </button>

          <div className="text-center pt-2">
            <button
                type="button"
                onClick={() => router.push('/')}
                className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors"
            >
                ← Back to Home
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
