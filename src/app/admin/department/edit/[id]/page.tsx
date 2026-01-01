"use client"
import React, { useState, useEffect } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../../../config/firebaseConfig'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function EditDepartment() {
  const router = useRouter()
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    hod: '',
    status: 'active',
  })

  useEffect(() => {
     if(!id) return;
     const fetchDept = async () => {
         try {
             const docRef = doc(db, "departments", id as string);
             const docSnap = await getDoc(docRef);
             if (docSnap.exists()) {
                 setFormData(docSnap.data() as any);
             } else {
                 toast.error("Department not found");
                 router.push('/admin/department');
             }
         } catch (error) {
             console.error(error);
             toast.error("Failed to load department");
         } finally {
             setLoading(false);
         }
     }
     fetchDept();
  }, [id, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
       const docRef = doc(db, "departments", id as string);
       await updateDoc(docRef, {
        ...formData
       })
       
       toast.success("Department updated successfully! 🎉")
       router.push('/admin/department')

    } catch (error: any) {
        console.log(error)
        toast.error("Failed to update department")
    } finally {
        setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Loading department details...</div>

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Edit Department</h1>
            <Link href="/admin/department" className="text-sm text-gray-500 hover:text-gray-700">
                Cancel
            </Link>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
                    <input 
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        type="text" 
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department Code</label>
                    <input 
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        type="text" 
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Head of Department (HOD)</label>
                    <input 
                        name="hod"
                        value={formData.hod}
                        onChange={handleChange}
                        type="text" 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select 
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <button 
                    type="submit" 
                    disabled={saving}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                    {saving ? 'Saving...' : 'Update Department'}
                </button>
            </div>
        </form>
      </div>
    </div>
  )
}
