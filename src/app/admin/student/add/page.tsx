"use client"
import React, { useState } from 'react'
import { collection, addDoc, getDocs, setDoc, doc, query, where } from 'firebase/firestore'
import { db, firebaseConfig } from '../../../../config/firebaseConfig'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { initializeApp, deleteApp, getApps } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth'

export default function AddStudent() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: '',
    regNumber: '',
    rollNumber: '', // New Roll Number field
    email: '',
    password: '', 
    phone: '',
    department: '',
    batch: '',
    status: 'active',
    attendance: '0%', 
  })

  // Fetch departments on load
  React.useEffect(() => {
    const fetchDepartments = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "departments"));
            const deptNames = querySnapshot.docs.map(doc => doc.data().name);
            setDepartments(deptNames);
        } catch (error) {
            console.error("Failed to fetch departments", error);
            toast.error("Could not load departments");
        }
    }
    fetchDepartments();
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: (name === 'regNumber' || name === 'rollNumber') ? value.toUpperCase() : value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Secondary App for creating user without logging out admin
    let secondaryApp: any = null;

    try {
        // Validation (basic)
        if(!formData.name || !formData.regNumber) {
            throw new Error("Name and Register Number are required")
        }
        if(!formData.password || formData.password.length < 6) {
           throw new Error("Password must be at least 6 characters")
        }

        // Check for Unique Register Number
        const studentsRef = collection(db, "students");
        const q = query(studentsRef, where("regNumber", "==", formData.regNumber));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            throw new Error(`Register Number ${formData.regNumber} already exists!`); 
        }

        // 1. Initialize secondary app
        // Check if app named 'Secondary' already exists to avoid duplicate error
        const existingApps = getApps();
        const secondaryAppName = "SecondaryApp";
        const foundApp = existingApps.find(app => app.name === secondaryAppName);
        secondaryApp = foundApp || initializeApp(firebaseConfig, secondaryAppName);
        
        const secondaryAuth = getAuth(secondaryApp);

        // 2. Create User in Auth
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
        const { uid } = userCredential.user;

        // 3. Save to Firestore (using MAIN db instance, but new UID)
        // Use setDoc to create document with specific ID (auth uid)
        // This links Auth User <-> Firestore Document
        const studentData = {
           name: formData.name,
           regNumber: formData.regNumber,
           rollNumber: formData.rollNumber, // Save Roll No
           email: formData.email,
           phone: formData.phone,
           department: formData.department,
           batch: formData.batch,
           status: formData.status,
           attendance: formData.attendance,
           role: 'student',
           uid: uid,
           createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, "students", uid), studentData);

        // 4. Create Parent Profile (Linked to Student UID)
        // Since we are using the "Same Credential" model, the Parent logs in as the Student Auth User.
        // We ensure a parent document exists for them to fetch specific parent data if needed.
        await setDoc(doc(db, "parents", uid), {
            studentId: uid,
            studentName: formData.name,
            email: formData.email, // Shared email
            phone: formData.phone, // Shared phone initially
            role: 'parent',
            createdAt: new Date().toISOString()
        });

        // 5. Create Notification
        await addDoc(collection(db, "notifications"), {
            title: "New Student Added",
            message: `Student ${formData.name} (${formData.regNumber}) has been added to ${formData.department}. Parent profile initialized.`,
            createdAt: new Date().toISOString(),
            read: false,
            type: 'success',
            audience: ['admin', 'faculty']
        });

        // 5. Cleanup Secondary Auth
        await signOut(secondaryAuth);
        
        toast.success("Student added & account created! 🎉")
        router.push('/admin/student')

    } catch (error: any) {
        console.error(error)
        
        let msg = error.message;
        if(error.code === 'auth/email-already-in-use') msg = "Email is already registered";
        if(error.code === 'auth/weak-password') msg = "Password is too weak";
        
        toast.error(msg || "Failed to add student")
    } finally {
        if (secondaryApp) {
           // We try to delete the app to clean up, but sometimes it's fine to leave it if we reuse
           try { await deleteApp(secondaryApp); } catch(e) {}
        }
        setLoading(false)
    }
  }

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Add New Student</h1>
            <Link href="/admin/student" className="text-sm text-gray-500 hover:text-gray-700">
                Cancel
            </Link>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input 
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        type="text" 
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="e.g. John Doe"
                    />
                </div>
                <div>
                     {/* Register Number */}
                     <label className="block text-sm font-medium text-gray-700 mb-1">Register Number</label>
                    <input 
                        name="regNumber"
                        value={formData.regNumber}
                        onChange={handleChange}
                        type="text" 
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="e.g. 2024CSE001"
                    />
                </div>
                <div>
                     {/* Roll Number */}
                    <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                    <input 
                        name="rollNumber"
                        value={formData.rollNumber}
                        onChange={handleChange}
                        type="text" 
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="e.g. 24001"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input 
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        type="email" 
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="john@university.edu"
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
                    <p className="text-xs text-gray-500 mt-1">Min. 6 characters. Encrypted by Firebase.</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input 
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        type="tel" 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="+1 (555) 000-0000"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select 
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Batch / Year</label>
                    <input 
                        name="batch"
                        value={formData.batch}
                        onChange={handleChange}
                        type="text" 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="e.g. 2024-2028"
                    />
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
                    ) : 'Create Student Account'}
                </button>
            </div>
        </form>
      </div>
    </div>
  )
}
