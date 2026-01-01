"use client"
import React, { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, setDoc, doc } from 'firebase/firestore'
import { db, firebaseConfig } from '../../../../config/firebaseConfig'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { initializeApp, deleteApp, getApps } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth'

export default function AddFaculty() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<string[]>([])
  
  const [formData, setFormData] = useState({
    name: '',
    uid: '',
    email: '',
    password: '', // Password field
    phone: '',
    department: '',
    designation: '',
    role: 'Faculty',
    accessStatus: 'active',
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
      [name]: name === 'uid' ? value.toUpperCase() : value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
     // Secondary App for creating user without logging out admin
    let secondaryApp: any = null;

    try {
        if(!formData.name || !formData.uid || !formData.email) {
            throw new Error("Name, ID, and Email are required")
        }
        if(!formData.password || formData.password.length < 6) {
             throw new Error("Password must be at least 6 characters")
        }

        // 1. Initialize secondary app
        const existingApps = getApps();
        const secondaryAppName = "SecondaryAppFaculty"; // Unique name
        const foundApp = existingApps.find(app => app.name === secondaryAppName);
        secondaryApp = foundApp || initializeApp(firebaseConfig, secondaryAppName);
        
        const secondaryAuth = getAuth(secondaryApp);

        // 2. Create User in Auth
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
        const { uid } = userCredential.user;
        
        // 3. Save to Firestore (using MAIN db instance, but new UID)
        // Link Auth User <-> Firestore Document
        const facultyData = {
           name: formData.name,
           uid: formData.uid, // Faculty ID (e.g. FAC001)
           email: formData.email,
           phone: formData.phone,
           department: formData.department,
           designation: formData.designation,
           role: formData.role,
           accessStatus: formData.accessStatus,
           authUid: uid, // Store auth UID reference
           createdAt: new Date().toISOString()
        };
        
        // Create document with Auth UID as key for easier retrieval
       await setDoc(doc(db, "faculty", uid), facultyData);

        // 4. Create Notification
       await addDoc(collection(db, "notifications"), {
           title: "New Faculty Added",
           message: `Faculty ${formData.name} (${formData.uid}) added to roster.`,
           createdAt: new Date().toISOString(),
           read: false,
           type: 'info',
           audience: ['admin', 'faculty']
       });
       
       // 5. Cleanup Secondary Auth
        await signOut(secondaryAuth);
       
       toast.success("Faculty added & account created! 🎉")
       router.push('/admin/faculty')

    } catch (error: any) {
        console.error(error)
        let msg = error.message;
        if(error.code === 'auth/email-already-in-use') msg = "Email is already registered";
        if(error.code === 'auth/weak-password') msg = "Password is too weak";
        toast.error(msg || "Failed to add faculty")
    } finally {
         if (secondaryApp) {
           try { await deleteApp(secondaryApp); } catch(e) {}
        }
        setLoading(false)
    }
  }

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Add New Faculty</h1>
            <Link href="/admin/faculty" className="text-sm text-gray-500 hover:text-gray-700">
                Cancel
            </Link>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input 
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        type="text" 
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="e.g. Dr. John Doe"
                    />
                </div>
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Faculty ID (UID)</label>
                    <input 
                        name="uid"
                        value={formData.uid}
                        onChange={handleChange}
                        type="text" 
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="e.g. FAC-001"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input 
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        type="email" 
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="john.doe@university.edu"
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input 
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        type="password" 
                        required
                         minLength={6}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="••••••••"
                    />
                     <p className="text-xs text-gray-500 mt-1">Min. 6 characters. Encrypted.</p>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input 
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        type="tel" 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                    <input 
                        name="designation"
                        value={formData.designation}
                        onChange={handleChange}
                        type="text" 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="e.g. Associate Professor"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select 
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    >
                        <option value="Faculty">Faculty</option>
                        <option value="Tutor">Tutor</option>
                        <option value="Coordinator">Coordinator</option>
                         <option value="HOD">HOD</option>
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select 
                        name="accessStatus"
                        value={formData.accessStatus}
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
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg shadow-blue-500/30"
                >
                    {loading ? (
                         <>
                         <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                         </svg>
                         Creating Account...
                        </>
                    ) : 'Add Faculty Member'}
                </button>
            </div>
        </form>
      </div>
    </div>
  )
}
