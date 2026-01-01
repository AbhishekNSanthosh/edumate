"use client"
import React, { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../../../config/firebaseConfig'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function AddBatch() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<string[]>([])
  const [tutors, setTutors] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    semester: '',
    tutor: '',
    academicYear: '',
    status: 'active',
  })

  useEffect(() => {
    const fetchData = async () => {
        try {
            // Fetch Departments
            const deptSnapshot = await getDocs(collection(db, "departments"));
            const deptNames = deptSnapshot.docs.map(doc => doc.data().name);
            setDepartments(deptNames);

            // Fetch Potential Tutors (Faculty)
            // Ideally filter for those who can be tutors, but for now fetch all
            const facultySnapshot = await getDocs(collection(db, "faculty"));
            const facultyList = facultySnapshot.docs.map(doc => ({id: doc.id, name: doc.data().name}));
            setTutors(facultyList);

        } catch (error) {
            console.error("Failed to fetch data", error);
        }
    }
    fetchData();
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'name' ? value.toUpperCase() : value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
        if(!formData.name || !formData.department || !formData.academicYear) {
            throw new Error("Batch Name, Department, and Academic Year are required")
        }
        
       await addDoc(collection(db, "batches"), {
        ...formData,
        createdAt: new Date().toISOString()
       })

        // Create Notification
       await addDoc(collection(db, "notifications"), {
           title: "New Batch Updated",
           message: `Batch ${formData.name} created for ${formData.department}.`,
           createdAt: new Date().toISOString(),
           read: false,
           type: 'info'
       });
       
       toast.success("Batch added successfully! 🎉")
       router.push('/admin/batches')

    } catch (error: any) {
        console.log(error)
        toast.error(error.message || "Failed to add batch")
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Create New Batch</h1>
            <Link href="/admin/batches" className="text-sm text-gray-500 hover:text-gray-700">
                Cancel
            </Link>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
                    <input 
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        type="text" 
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="e.g. CSE 2024-2028"
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
                     <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                    <input 
                        name="academicYear"
                        value={formData.academicYear}
                        onChange={handleChange}
                        type="text" 
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="e.g. 2024-2028"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Semester</label>
                    <select 
                        name="semester"
                        value={formData.semester}
                        onChange={handleChange}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class Tutor (Optional)</label>
                    <select 
                        name="tutor"
                        value={formData.tutor}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    >
                        <option value="">Select Tutor</option>
                        {tutors.map(tutor => (
                            <option key={tutor.id} value={tutor.name}>{tutor.name}</option>
                        ))}
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
                        <option value="completed">Completed</option>
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
                    {loading ? 'Create Batch' : 'Create Batch'}
                </button>
            </div>
        </form>
      </div>
    </div>
  )
}
