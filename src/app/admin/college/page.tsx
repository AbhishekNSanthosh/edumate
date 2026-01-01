"use client"
import React, { useState, useEffect } from 'react'
import { collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'

interface CollegeProfile {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

interface Accreditation {
  id: string;
  body: string;
  grade: string;
  year: string;
  validity: string;
}

interface AcademicYear {
  id: string;
  year: string;
  startDate: string;
  endDate: string;
  semesters: number;
  status: 'active' | 'completed' | 'upcoming';
}

interface SystemSettings {
    maxCreditHours: number;
    minCGPA: number;
    attendanceThreshold: number;
    gradingScale: string;
    language: string;
}

export default function CollegePage() {
  const [loading, setLoading] = useState(true)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  
  // Data State
  const [college, setCollege] = useState<CollegeProfile>({
      name: '', address: '', phone: '', email: '', website: ''
  })
  const [accreditation, setAccreditation] = useState<Accreditation[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [settings, setSettings] = useState<SystemSettings>({
      maxCreditHours: 0, minCGPA: 0.0, attendanceThreshold: 75, gradingScale: '10.0', language: 'English'
  })

  // Forms
  const [accForm, setAccForm] = useState<any>({})
  const [yearForm, setYearForm] = useState<any>({ status: 'upcoming' })

  useEffect(() => {
      const fetchData = async () => {
          try {
              // 1. College Profile
              const profileSnap = await getDoc(doc(db, "settings", "college_profile"))
              if (profileSnap.exists()) {
                  setCollege(profileSnap.data() as CollegeProfile)
              }

              // 2. System Settings
              const settingsSnap = await getDoc(doc(db, "settings", "general"))
              if (settingsSnap.exists()) {
                  setSettings(settingsSnap.data() as SystemSettings)
              }
              
              setLoading(false)
          } catch (error) {
              console.error("Error fetching settings", error)
          }
      }
      fetchData()

      // Real-time Listeners
      const unsubAcc = onSnapshot(collection(db, "college_accreditation"), (snap) => {
          setAccreditation(snap.docs.map(d => ({id: d.id, ...d.data()} as Accreditation)))
      })
      const unsubYears = onSnapshot(collection(db, "academic_years"), (snap) => {
          setAcademicYears(snap.docs.map(d => ({id: d.id, ...d.data()} as AcademicYear)))
      })

      return () => {
          unsubAcc()
          unsubYears()
      }
  }, [])

  // Handlers
  const handleSaveProfile = async () => {
      try {
          await setDoc(doc(db, "settings", "college_profile"), college)
          toast.success("Profile updated")
          setEditingSection(null)
      } catch (error) {
          toast.error("Failed to update profile")
      }
  }

  const handleSaveSettings = async () => {
      try {
          await setDoc(doc(db, "settings", "general"), settings)
          toast.success("Settings updated")
          setEditingSection(null)
      } catch (error) {
          toast.error("Failed to update settings")
      }
  }

  const handleAddAccreditation = async () => {
      try {
          await addDoc(collection(db, "college_accreditation"), accForm)
          toast.success("Accreditation added")
          setEditingSection(null)
          setAccForm({})
      } catch (error) {
          toast.error("Failed to add accreditation")
      }
  }

  const handleDeleteAccreditation = async (id: string) => {
      if(!confirm("Delete this record?")) return;
      await deleteDoc(doc(db, "college_accreditation", id))
      toast.success("Deleted")
  }

  const handleAddYear = async () => {
      try {
          await addDoc(collection(db, "academic_years"), {
              ...yearForm,
              semesters: parseInt(yearForm.semesters)
          })
          toast.success("Academic Year added")
          setEditingSection(null)
          setYearForm({ status: 'upcoming' })
      } catch (error) {
          toast.error("Failed to add year")
      }
  }

  const toggleYearStatus = async (item: AcademicYear) => {
      const newStatus = item.status === 'active' ? 'completed' : 'active'
      await updateDoc(doc(db, "academic_years", item.id), { status: newStatus })
  }

  const getStatusColor = (status: string) => {
      switch (status) {
        case 'active': return 'bg-green-100 text-green-800';
        case 'completed': return 'bg-gray-100 text-gray-800';
        case 'upcoming': return 'bg-blue-100 text-blue-800';
        default: return 'bg-gray-100 text-gray-800';
      }
  }

  if (loading) return <div className="p-10">Loading configuration...</div>

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">College Configuration</h1>
          <p className="text-gray-600 mt-2">Manage institution profile, accreditation, and academic calendars.</p>
        </div>

        {/* 1. College Profile */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">College Profile</h2>
                <button 
                    onClick={() => setEditingSection(editingSection === 'profile' ? null : 'profile')}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                    {editingSection === 'profile' ? 'Cancel' : 'Edit'}
                </button>
            </div>
            
            {editingSection === 'profile' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="College Name" className="border p-2 rounded" 
                        value={college.name} onChange={e => setCollege({...college, name: e.target.value})} />
                    <input type="text" placeholder="Phone" className="border p-2 rounded" 
                        value={college.phone} onChange={e => setCollege({...college, phone: e.target.value})} />
                    <input type="email" placeholder="Email" className="border p-2 rounded" 
                        value={college.email} onChange={e => setCollege({...college, email: e.target.value})} />
                    <input type="url" placeholder="Website" className="border p-2 rounded" 
                         value={college.website} onChange={e => setCollege({...college, website: e.target.value})} />
                    <textarea placeholder="Address" className="border p-2 rounded md:col-span-2" rows={3}
                         value={college.address} onChange={e => setCollege({...college, address: e.target.value})} />
                    <div className="md:col-span-2">
                        <button onClick={handleSaveProfile} className="bg-green-600 text-white px-4 py-2 rounded">Save Profile</button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 text-sm">
                    <div><span className="text-gray-500 block">Name</span> <span className="font-medium text-lg">{college.name || '-'}</span></div>
                    <div><span className="text-gray-500 block">Phone</span> <span className="font-medium">{college.phone || '-'}</span></div>
                    <div><span className="text-gray-500 block">Email</span> <span className="font-medium">{college.email || '-'}</span></div>
                    <div><span className="text-gray-500 block">Website</span> <a href={college.website} target="_blank" className="text-blue-600 hover:underline">{college.website || '-'}</a></div>
                    <div className="md:col-span-2"><span className="text-gray-500 block">Address</span> <span className="font-medium">{college.address || '-'}</span></div>
                </div>
            )}
        </div>

        {/* 2. Accreditation */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">Accreditation</h2>
                <button 
                    onClick={() => setEditingSection(editingSection === 'accreditation' ? null : 'accreditation')}
                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
                >
                    {editingSection === 'accreditation' ? 'Close' : '+ Add New'}
                </button>
            </div>
            
            {editingSection === 'accreditation' && (
                <div className="p-6 bg-blue-50 grid grid-cols-1 md:grid-cols-5 gap-4 items-end border-b">
                    <input type="text" placeholder="Body (e.g. NAAC)" className="border p-2 rounded" 
                        value={accForm.body || ''} onChange={e => setAccForm({...accForm, body: e.target.value})} />
                    <input type="text" placeholder="Grade (e.g. A+)" className="border p-2 rounded" 
                        value={accForm.grade || ''} onChange={e => setAccForm({...accForm, grade: e.target.value})} />
                    <input type="text" placeholder="Year" className="border p-2 rounded" 
                        value={accForm.year || ''} onChange={e => setAccForm({...accForm, year: e.target.value})} />
                    <input type="text" placeholder="Validity" className="border p-2 rounded" 
                        value={accForm.validity || ''} onChange={e => setAccForm({...accForm, validity: e.target.value})} />
                    <button onClick={handleAddAccreditation} className="bg-green-600 text-white p-2 rounded">Save</button>
                </div>
            )}

            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Body</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Grade</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Year</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Validity</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {accreditation.map(a => (
                        <tr key={a.id}>
                            <td className="px-6 py-4 font-bold text-gray-900">{a.body}</td>
                            <td className="px-6 py-4 text-gray-900">{a.grade}</td>
                            <td className="px-6 py-4 text-gray-500">{a.year}</td>
                            <td className="px-6 py-4 text-gray-500">{a.validity}</td>
                            <td className="px-6 py-4">
                                <button onClick={() => handleDeleteAccreditation(a.id)} className="text-red-600 hover:text-red-900 text-xs font-bold">Delete</button>
                            </td>
                        </tr>
                    ))}
                    {accreditation.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">No accreditation records found.</td></tr>}
                </tbody>
            </table>
        </div>

        {/* 3. Academic Years */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">Academic Years</h2>
                <button 
                    onClick={() => setEditingSection(editingSection === 'years' ? null : 'years')}
                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
                >
                    {editingSection === 'years' ? 'Close' : '+ Add Year'}
                </button>
            </div>
            
            {editingSection === 'years' && (
                <div className="p-6 bg-blue-50 grid grid-cols-1 md:grid-cols-6 gap-4 items-end border-b">
                     <div className="col-span-2">
                        <input type="text" placeholder="Year Label (e.g. 2025-26)" className="border p-2 rounded w-full" 
                            value={yearForm.year || ''} onChange={e => setYearForm({...yearForm, year: e.target.value})} />
                     </div>
                     <input type="date" className="border p-2 rounded" 
                        value={yearForm.startDate || ''} onChange={e => setYearForm({...yearForm, startDate: e.target.value})} />
                     <input type="date" className="border p-2 rounded" 
                        value={yearForm.endDate || ''} onChange={e => setYearForm({...yearForm, endDate: e.target.value})} />
                     <input type="number" placeholder="Semesters" className="border p-2 rounded" 
                        value={yearForm.semesters || ''} onChange={e => setYearForm({...yearForm, semesters: e.target.value})} />
                    <button onClick={handleAddYear} className="bg-green-600 text-white p-2 rounded">Save</button>
                </div>
            )}

            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Academic Year</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Duration</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Semesters</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {academicYears.map(y => (
                        <tr key={y.id}>
                            <td className="px-6 py-4 font-bold text-gray-900">{y.year}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{y.startDate} to {y.endDate}</td>
                            <td className="px-6 py-4 text-gray-900">{y.semesters}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(y.status)}`}>
                                    {y.status.toUpperCase()}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <button onClick={() => toggleYearStatus(y)} className="text-blue-600 hover:text-blue-900 text-xs font-bold mr-2">
                                    {y.status === 'active' ? 'Mark Completed' : 'Activate'}
                                </button>
                            </td>
                        </tr>
                    ))}
                    {academicYears.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">No academic years found.</td></tr>}
                </tbody>
            </table>
        </div>

        {/* 4. System Settings */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">System Settings</h2>
                <button 
                    onClick={() => setEditingSection(editingSection === 'settings' ? null : 'settings')}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                    {editingSection === 'settings' ? 'Cancel' : 'Edit'}
                </button>
            </div>
             {editingSection === 'settings' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Max Credit Hours</label>
                        <input type="number" className="border p-2 rounded w-full" 
                        value={settings.maxCreditHours} onChange={e => setSettings({...settings, maxCreditHours: parseInt(e.target.value)})} />
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Min CGPA</label>
                        <input type="number" step="0.1" className="border p-2 rounded w-full" 
                        value={settings.minCGPA} onChange={e => setSettings({...settings, minCGPA: parseFloat(e.target.value)})} />
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Attendance Threshold (%)</label>
                        <input type="number" className="border p-2 rounded w-full" 
                        value={settings.attendanceThreshold} onChange={e => setSettings({...settings, attendanceThreshold: parseInt(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Grading Scale</label>
                        <select className="border p-2 rounded w-full"
                             value={settings.gradingScale} onChange={e => setSettings({...settings, gradingScale: e.target.value})}
                        >
                            <option value="4.0">4.0</option>
                            <option value="10.0">10.0</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">System Language</label>
                        <select className="border p-2 rounded w-full"
                             value={settings.language} onChange={e => setSettings({...settings, language: e.target.value})}
                        >
                            <option value="English">English</option>
                            <option value="Hindi">Hindi</option>
                        </select>
                    </div>
                    <div className="md:col-span-2 mt-4">
                        <button onClick={handleSaveSettings} className="bg-green-600 text-white px-4 py-2 rounded">Save Settings</button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 text-sm">
                    <div><span className="text-gray-500 block">Max Credits</span> <span className="font-medium text-lg">{settings.maxCreditHours}</span></div>
                    <div><span className="text-gray-500 block">Min CGPA</span> <span className="font-medium">{settings.minCGPA}</span></div>
                    <div><span className="text-gray-500 block">Attendance Threshold</span> <span className="font-medium">{settings.attendanceThreshold}%</span></div>
                    <div><span className="text-gray-500 block">Grading Scale</span> <span className="font-medium">{settings.gradingScale}</span></div>
                    <div><span className="text-gray-500 block">Language</span> <span className="font-medium">{settings.language}</span></div>
                </div>
            )}
        </div>

      </div>
    </div>
  )
}