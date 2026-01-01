"use client"
import React, { useState, useEffect } from 'react'
import { collection, addDoc, getDocs } from 'firebase/firestore'
import { db } from '../../../../config/firebaseConfig'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function AddSubject() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<string[]>([])
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    department: '',
    semester: '',
    credits: '',
    type: 'Core',
    status: 'active',
  })

  useEffect(() => {
    const fetchDepartments = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "departments"));
            const deptNames = querySnapshot.docs.map(doc => doc.data().name);
            setDepartments(deptNames);
        } catch (error) {
            console.error("Failed to fetch departments", error);
        }
    }
    fetchDepartments();
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'code' ? value.toUpperCase() : value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
        if(!formData.name || !formData.code) {
            throw new Error("Subject Name and Code are required")
        }
        
       await addDoc(collection(db, "subjects"), {
        ...formData,
        credits: Number(formData.credits),
        createdAt: new Date().toISOString()
       })

        // Create Notification
       await addDoc(collection(db, "notifications"), {
           title: "New Subject Added",
           message: `Subject ${formData.name} (${formData.code}) added to curriculum.`,
           createdAt: new Date().toISOString(),
           read: false,
           type: 'info'
       });
       
       toast.success("Subject added successfully! 🎉")
       router.push('/admin/subject')

    } catch (error: any) {
        console.log(error)
        toast.error(error.message || "Failed to add subject")
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Add New Subject</h1>
            <Link href="/admin/subject" className="text-sm text-gray-500 hover:text-gray-700">
                Cancel
            </Link>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                    <input 
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        type="text" 
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="e.g. Data Structures and Algorithms"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code</label>
                    <input 
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        type="text" 
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="e.g. CS-301"
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select 
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                    <select 
                        name="semester"
                        value={formData.semester}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    >
                        <option value="">Select Semester</option>
                        <option value="1st Semester">1st Semester</option>
                        <option value="2nd Semester">2nd Semester</option>
                        <option value="3rd Semester">3rd Semester</option>
                        <option value="4th Semester">4th Semester</option>
                        <option value="5th Semester">5th Semester</option>
                        <option value="6th Semester">6th Semester</option>
                        <option value="7th Semester">7th Semester</option>
                        <option value="8th Semester">8th Semester</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Credits</label>
                    <input 
                        name="credits"
                        value={formData.credits}
                        onChange={handleChange}
                        type="number" 
                        required
                        min="1"
                        max="10"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="e.g. 4"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select 
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    >
                        <option value="Core">Core</option>
                        <option value="Elective">Elective</option>
                        <option value="Lab">Lab</option>
                    </select>
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
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                    {loading ? 'Saving...' : 'Create Subject'}
                </button>
            </div>
        </form>
      </div>
    </div>
  )
}
