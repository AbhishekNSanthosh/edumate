"use client"
import React, { useState, useEffect } from 'react'
import { collection, doc, getDocs, onSnapshot, addDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'

interface Exam {
  id: string;
  type: string;
  name: string;
  date: string;
  time: string;
  department: string;
  batch: string;
  faculty: string;
  room: string;
  status: string;
  published: boolean;
}

interface Assignment {
  id: string;
  name: string;
  deadline: string;
  subject: string;
  department: string;
  batch: string;
  faculty: string;
  submissions: number;
  evaluated: number;
  status: string;
}

export default function ExamsAssignmentsPage() {
  const [selectedType, setSelectedType] = useState<'Exam' | 'Assignment'>('Exam')
  const [loading, setLoading] = useState(true)
  
  const [exams, setExams] = useState<Exam[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  
  // Metadata for dropdowns
  const [batches, setBatches] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [faculty, setFaculty] = useState<any[]>([])

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<any>({})

  useEffect(() => {
    const fetchData = async () => {
        try {
            const [bSnap, sSnap, fSnap] = await Promise.all([
                getDocs(collection(db, "batches")),
                getDocs(collection(db, "subjects")),
                getDocs(collection(db, "faculty"))
            ])
            setBatches(bSnap.docs.map(d => ({id: d.id, ...d.data()})))
            setSubjects(sSnap.docs.map(d => ({id: d.id, ...d.data()})))
            setFaculty(fSnap.docs.map(d => ({id: d.id, ...d.data()})))
        } catch (error) {
            console.error("Meta fetch error", error)
        }
    }
    fetchData()

    // Real-time listeners
    const unsubExams = onSnapshot(collection(db, "exams"), (snap) => {
        setExams(snap.docs.map(d => ({id: d.id, ...d.data()} as Exam)))
    })
    const unsubAssign = onSnapshot(collection(db, "assignments"), (snap) => {
        setAssignments(snap.docs.map(d => ({id: d.id, ...d.data()} as Assignment)))
        setLoading(false)
    })

    return () => {
        unsubExams()
        unsubAssign()
    }
  }, [])

  const handleCreate = async () => {
      try {
          const colName = selectedType === 'Exam' ? 'exams' : 'assignments'
          const payload = {
              ...formData,
              status: selectedType === 'Exam' ? 'Scheduled' : 'Open',
              published: selectedType === 'Exam' ? false : true, // Exams default unpublished
              submissions: 0,
              evaluated: 0,
              createdAt: new Date().toISOString()
          }
          
          await addDoc(collection(db, colName), payload)
          toast.success(`${selectedType} created successfully`)
          setIsModalOpen(false)
          setFormData({})
      } catch (error) {
          console.error(error)
          toast.error("Failed to create")
      }
  }

  const handleDelete = async (id: string, type: 'Exam' | 'Assignment') => {
      if(!confirm("Are you sure?")) return;
      try {
          await deleteDoc(doc(db, type === 'Exam' ? 'exams' : 'assignments', id))
          toast.success("Deleted successfully")
      } catch (error) {
          toast.error("Delete failed")
      }
  }

  const toggleStatus = async (item: any) => {
      try {
          const col = selectedType === 'Exam' ? 'exams' : 'assignments'
          const update = selectedType === 'Exam' 
            ? { published: !item.published, status: !item.published ? 'Published' : 'Scheduled' }
            : { status: item.status === 'Open' ? 'Closed' : 'Open' }
            
          await updateDoc(doc(db, col, item.id), update)
          toast.success("Status updated")
      } catch (error) {
          toast.error("Update failed")
      }
  }

  // --- UI Components ---

  const CreateModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New {selectedType}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Title / Name</label>
                    <input type="text" className="w-full border rounded p-2" 
                        value={formData.name || ''} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                </div>
                
                {selectedType === 'Exam' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium mb-1">Exam Type</label>
                            <select className="w-full border rounded p-2"
                                value={formData.type || ''}
                                onChange={e => setFormData({...formData, type: e.target.value})}
                            >
                                <option value="">Select Type</option>
                                <option value="Internal">Internal</option>
                                <option value="External">External</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium mb-1">Date</label>
                            <input type="date" className="w-full border rounded p-2"
                                value={formData.date || ''}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Time</label>
                            <input type="text" className="w-full border rounded p-2" placeholder="10:00 AM - 12:00 PM"
                                value={formData.time || ''}
                                onChange={e => setFormData({...formData, time: e.target.value})}
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium mb-1">Room</label>
                            <input type="text" className="w-full border rounded p-2"
                                value={formData.room || ''}
                                onChange={e => setFormData({...formData, room: e.target.value})}
                            />
                        </div>
                    </>
                )}

                {selectedType === 'Assignment' && (
                     <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Deadline</label>
                        <input type="datetime-local" className="w-full border rounded p-2"
                             value={formData.deadline || ''}
                             onChange={e => setFormData({...formData, deadline: e.target.value})}
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium mb-1">Batch</label>
                    <select className="w-full border rounded p-2"
                         value={formData.batch || ''}
                         onChange={e => {
                             const b = batches.find(bat => bat.name === e.target.value)
                             setFormData({...formData, batch: e.target.value, department: b?.department || ''})
                         }}
                    >
                        <option value="">Select Batch</option>
                         {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">Subject</label>
                    <select className="w-full border rounded p-2"
                         value={formData.subject || ''}
                         onChange={e => setFormData({...formData, subject: e.target.value})}
                    >
                         <option value="">Select Subject</option>
                         {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                </div>
                 <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Faculty In-Charge</label>
                    <select className="w-full border rounded p-2"
                         value={formData.faculty || ''}
                         onChange={e => setFormData({...formData, faculty: e.target.value})}
                    >
                         <option value="">Select Faculty</option>
                         {faculty.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                    </select>
                </div>

            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded">Create</button>
            </div>
        </div>
    </div>
  )

  if (loading) return (
     <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Exams & Assignments</h1>
          <p className="text-gray-600 mt-2">Manage assessments and evaluations.</p>
        </div>

        <div className="flex justify-between items-center mb-6">
             <div className="bg-white p-1 rounded-lg shadow-sm border inline-flex">
                <button
                    onClick={() => setSelectedType('Exam')}
                    className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedType === 'Exam' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    Exams
                </button>
                <button
                    onClick={() => setSelectedType('Assignment')}
                    className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedType === 'Assignment' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    Assignments
                </button>
            </div>

            <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                + Create New {selectedType}
            </button>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                   {selectedType === 'Exam' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>}
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(selectedType === 'Exam' ? exams : assignments).map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{item.name}</td>
                    {selectedType === 'Exam' && <td className="px-6 py-4 text-sm text-gray-500">{item.type}</td>}
                    <td className="px-6 py-4 text-sm text-gray-500">
                        {selectedType === 'Exam' ? (
                            <div>{item.date} <br/> <span className="text-xs text-gray-400">{item.time}</span></div>
                        ) : (
                             <div>Deadline: <br/> {new Date(item.deadline).toLocaleDateString()}</div>
                        )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="font-medium text-gray-900">{item.batch}</div>
                        <div className="text-xs">{item.subject}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.faculty}</td>
                    <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            item.status === 'Published' || item.status === 'Closed' ? 'bg-green-100 text-green-800' : 
                            item.status === 'Open' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                            {item.status}
                        </span>
                    </td>
                    <td className="px-6 py-4 space-x-2">
                         <button onClick={() => toggleStatus(item)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                            {selectedType === 'Exam' ? (item.published ? 'Unpublish' : 'Publish') : (item.status === 'Open' ? 'Close' : 'Reopen')}
                         </button>
                         <button onClick={() => handleDelete(item.id, selectedType)} className="text-xs text-red-600 hover:text-red-800 font-medium">
                            Delete
                         </button>
                    </td>
                  </tr>
                ))}
                { (selectedType === 'Exam' ? exams : assignments).length === 0 && (
                    <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                            No {selectedType.toLowerCase()}s found.
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                <h3 className="text-sm font-medium text-gray-500 uppercase">Total {selectedType}s</h3>
                <p className="text-3xl font-bold mt-1">{(selectedType === 'Exam' ? exams : assignments).length}</p>
             </div>
             <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                <h3 className="text-sm font-medium text-gray-500 uppercase">Active / Scheduled</h3>
                <p className="text-3xl font-bold mt-1">
                    {(selectedType === 'Exam' ? exams.filter(e => e.status === 'Scheduled') : assignments.filter(a => a.status === 'Open')).length}
                </p>
             </div>
             <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                 <h3 className="text-sm font-medium text-gray-500 uppercase">Completed / Published</h3>
                <p className="text-3xl font-bold mt-1">
                    {(selectedType === 'Exam' ? exams.filter(e => e.published) : assignments.filter(a => a.status === 'Closed')).length}
                </p>
             </div>
        </div>

      </div>
      
      {isModalOpen && <CreateModal />}
    </div>
  )
}