"use client"
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import React from 'react'

export default function Home() {
  const router = useRouter()

  const roles = [
    { id: 'admin', label: 'Admin', icon: '👨‍💼', color: 'from-purple-500 to-indigo-600' },
    { id: 'faculty', label: 'Faculty', icon: '👩‍🏫', color: 'from-blue-500 to-cyan-600' },
    { id: 'student', label: 'Student', icon: '🎓', color: 'from-emerald-500 to-teal-600' },
    { id: 'parent', label: 'Parent', icon: '👨‍👩‍👧‍👦', color: 'from-orange-500 to-red-600' }
  ]

  const handleRoleSelect = (roleId:any) => {
    router.push(`/${roleId}-login`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="w-full items-center justify-center flex">
          <Image src={'/brand/logo.svg'} alt='' width={200} height={200}/>
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-bold text-gray-900">Welcome</h2>
          <p className="text-gray-600">Please select your role to continue</p>
        </div>

        {/* Role Selection */}
        <div className="grid grid-cols-2 gap-4">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => handleRoleSelect(role.id)}
              className={`p-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 bg-white border-2 border-gray-200 hover:border-[#1f75fe] hover:shadow-[#1f75fe]/10`}
            >
              <div className="text-3xl mb-3">{role.icon}</div>
              <div className="text-lg font-semibold text-gray-800">{role.label}</div>
            </button>
          ))}
        </div>

        <div className="text-sm text-gray-500">
          <p>
            Need help?{' '}
            <button className="text-[#1f75fe] font-medium hover:underline">Contact support</button>
          </p>
        </div>
      </div>
    </div>
  )
}