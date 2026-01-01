"use client"
import React, { useState, useEffect } from 'react'
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'

export default function UniversityPage() {
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  
  // Default State
  const [data, setData] = useState({
    name: 'Edumate University',
    code: 'EDU',
    address: '123 Education Lane, Tech City',
    contactEmail: 'admin@edumate.edu',
    website: 'www.edumate.edu',
    gradingSystem: [
        { grade: 'A', points: 4.0, range: '90-100%' },
        { grade: 'B', points: 3.0, range: '80-89%' },
        { grade: 'C', points: 2.0, range: '70-79%' },
        { grade: 'D', points: 1.0, range: '60-69%' },
        { grade: 'F', points: 0.0, range: 'Below 60%' },
    ],
    regulations: [
        'Minimum attendance of 75% is mandatory.',
        'Use of mobile phones in classrooms is prohibited.'
    ]
  })

  // Fetch Data
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "university"), (doc) => {
        if(doc.exists()) {
            setData(doc.data() as any);
        }
        setLoading(false);
    });
    return () => unsub();
  }, [])

  const handleSave = async () => {
    try {
        await setDoc(doc(db, "settings", "university"), data);
        toast.success("University settings updated!");
        setEditing(false);
    } catch (error) {
        toast.error("Failed to save settings");
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setData({
        ...data,
        [e.target.name]: e.target.value
    })
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">University Settings</h1>
                <p className="text-gray-600 mt-2">Manage global university configuration and details.</p>
            </div>
            <button 
                onClick={() => editing ? handleSave() : setEditing(true)}
                className={`px-6 py-2 rounded-lg text-white transition-colors ${editing ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                {editing ? 'Save Changes' : 'Edit Settings'}
            </button>
        </div>

        {/* General Info */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 border-b pb-2">General Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">University Name</label>
                    {editing ? (
                        <input 
                            name="name"
                            value={data.name} 
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    ) : (
                        <p className="text-lg text-gray-900 font-medium">{data.name}</p>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">University Code</label>
                    {editing ? (
                        <input 
                            name="code"
                            value={data.code} 
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    ) : (
                        <p className="text-lg text-gray-900 font-medium">{data.code}</p>
                    )}
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    {editing ? (
                        <input 
                            name="address"
                            value={data.address} 
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    ) : (
                        <p className="text-gray-900">{data.address}</p>
                    )}
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                    {editing ? (
                        <input 
                            name="contactEmail"
                            value={data.contactEmail} 
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    ) : (
                        <p className="text-gray-900">{data.contactEmail}</p>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    {editing ? (
                        <input 
                            name="website"
                            value={data.website} 
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    ) : (
                        <a href={`https://${data.website}`} target="_blank" className="text-blue-600 hover:underline">{data.website}</a>
                    )}
                </div>
            </div>
        </div>

        {/* Grading System (Read-Only for now) */}
         <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Grading System</h2>
            <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Range</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.gradingSystem.map((g: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{g.grade}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{g.points}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{g.range}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
            <p className="text-xs text-gray-500 mt-4">* Grading system modification requires super-admin privileges.</p>
         </div>

      </div>
    </div>
  )
}