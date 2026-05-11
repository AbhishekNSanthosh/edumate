"use client"
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { db } from '../config/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'

export default function Home() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (authLoading || !user) return

    const detectAndRedirect = async () => {
      setChecking(true)
      try {
        const adminSnap = await getDoc(doc(db, 'admins', user.uid))
        if (adminSnap.exists()) { router.replace('/admin/dashboard'); return }

        const facultySnap = await getDoc(doc(db, 'faculty', user.uid))
        if (facultySnap.exists()) { router.replace('/faculty/dashboard'); return }

        const studentSnap = await getDoc(doc(db, 'students', user.uid))
        if (studentSnap.exists()) { router.replace('/student/dashboard'); return }
      } catch (e) {
        console.error('Role detection error:', e)
      } finally {
        setChecking(false)
      }
    }

    detectAndRedirect()
  }, [user, authLoading, router])

  if (authLoading || checking) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1f75fe]"></div>
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  )

  const roles = [
    {
      id: 'admin',
      label: 'Admin',
      description: 'Manage institution',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'hover:border-purple-300',
      badge: 'bg-purple-100 text-purple-700',
    },
    {
      id: 'faculty',
      label: 'Faculty',
      description: 'Teach & manage classes',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'hover:border-blue-300',
      badge: 'bg-blue-100 text-blue-700',
    },
    {
      id: 'student',
      label: 'Student',
      description: 'Access courses & grades',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      ),
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'hover:border-emerald-300',
      badge: 'bg-emerald-100 text-emerald-700',
    },
    {
      id: 'parent',
      label: 'Parent',
      description: "Track child's progress",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'hover:border-orange-300',
      badge: 'bg-orange-100 text-orange-700',
    },
  ]

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#1f75fe] via-[#1a65e0] to-[#1254b8] flex-col items-center justify-center p-16 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -right-16 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full" />

        <div className="relative z-10 flex flex-col items-center text-center gap-8 max-w-sm">
          <div className="bg-white rounded-2xl p-5 shadow-2xl">
            <Image src="/brand/logo.svg" alt="EduMate" width={120} height={120} />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-white tracking-tight">EduMate</h1>
            <p className="text-blue-100 text-lg leading-relaxed">
              Your all-in-one education management platform for students, faculty, and parents.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full mt-2">
            {[
              { label: 'Students', value: '10K+' },
              { label: 'Faculty', value: '500+' },
              { label: 'Courses', value: '200+' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                <div className="text-white font-bold text-xl">{stat.value}</div>
                <div className="text-blue-200 text-xs mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — role selection */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Image src="/brand/logo.svg" alt="EduMate" width={80} height={80} />
        </div>

        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500">Select your role to sign in to your account.</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {roles.map((role) => (
              <Link
                key={role.id}
                href={`/${role.id}-login`}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 ${role.border} bg-white hover:shadow-md transition-all duration-200 group`}
              >
                <div className={`${role.bg} ${role.color} p-3 rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-110`}>
                  {role.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">{role.label}</div>
                  <div className="text-sm text-gray-500 truncate">{role.description}</div>
                </div>
                <svg className="w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all duration-200 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>

          <div className="pt-2 text-sm text-gray-500 text-center">
            Need help?{' '}
            <Link href="/contact" className="text-[#1f75fe] font-medium hover:underline">
              Contact support
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
