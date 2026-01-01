"use client"
import React, { useState, useEffect } from 'react'
import { collection, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'


// Standard time slots for the dropdown to ensure grid alignment
const TIME_SLOTS = [
  "09:30 AM - 10:30 AM",
  "10:30 AM - 11:30 AM",
  "11:30 AM - 12:30 PM",
  "12:30 PM - 01:30 PM",
  "01:30 PM - 02:30 PM",
  "02:30 PM - 03:30 PM",
  "03:30 PM - 04:30 PM"
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function TimetablePage() {
  const [loading, setLoading] = useState(true)
  const [batches, setBatches] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [faculty, setFaculty] = useState<any[]>([])
  
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [timetableEntries, setTimetableEntries] = useState<any[]>([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    day: 'Monday',
    time: TIME_SLOTS[0],
    subject: '',
    faculty: '',
    room: ''
  })

  // 1. Fetch Initial Meta Data
  useEffect(() => {
    const fetchMetadata = async () => {
        try {
            const [bSnap, sSnap, fSnap] = await Promise.all([
                getDocs(collection(db, "batches")),
                getDocs(collection(db, "subjects")),
                getDocs(collection(db, "faculty"))
            ])
            
            const bList = bSnap.docs.map(d => ({id: d.id, ...d.data()}))
            const sList = sSnap.docs.map(d => ({id: d.id, ...d.data()}))
            const fList = fSnap.docs.map(d => ({id: d.id, ...d.data()}))

            setBatches(bList)
            setSubjects(sList)
            setFaculty(fList)
            
            if(bList.length > 0) {
                setSelectedBatchId(bList[0].id)
            }
            setLoading(false)
        } catch (error) {
            console.error(error)
            toast.error("Failed to load metadata")
            setLoading(false)
        }
    }
    fetchMetadata()
  }, [])

  // 2. Fetch Timetable for Selected Batch
  useEffect(() => {
    if(!selectedBatchId) return;

    const unsub = onSnapshot(doc(db, "timetables", selectedBatchId), (docSnap) => {
        if(docSnap.exists()) {
            setTimetableEntries(docSnap.data().entries || [])
        } else {
            setTimetableEntries([])
        }
    })
    return () => unsub()
  }, [selectedBatchId])


  const saveTimetableEntry = async () => {
    if(!formData.subject || !formData.faculty) {
        toast.error("Subject and Faculty are required")
        return
    }

    try {
        const newEntry = {
            id: Math.random().toString(36).substr(2, 9),
            ...formData,
            status: 'scheduled',
            published: true
        }
        
        // Simple conflict check
        const conflict = timetableEntries.find(e => 
            e.day === formData.day && e.time === formData.time
        )
        if(conflict) {
            if(!confirm("A class is already scheduled at this time. Overwrite?")) return;
        }

        const updatedEntries = conflict 
            ? timetableEntries.map(e => e.id === conflict.id ? newEntry : e)
            : [...timetableEntries, newEntry]

        await setDoc(doc(db, "timetables", selectedBatchId), {
            batchId: selectedBatchId,
            entries: updatedEntries,
            updatedAt: new Date().toISOString()
        })

        toast.success("Class added successfully")
        setIsModalOpen(false)
        setFormData({
            day: 'Monday',
            time: TIME_SLOTS[0],
            subject: '',
            faculty: '',
            room: ''
        })

    } catch (error) {
        console.error(error)
        toast.error("Failed to save class")
    }
  }

  const deleteEntry = async (entryId: string) => {
      if(!confirm("Remove this class?")) return;
      try {
        const updated = timetableEntries.filter(e => e.id !== entryId)
        await setDoc(doc(db, "timetables", selectedBatchId), {
            entries: updated,
            updatedAt: new Date().toISOString()
        }, { merge: true })
        toast.success("Class removed")
      } catch (error) {
          toast.error("Failed to remove")
      }
  }
  
  // Helpers
  const getEntryForSlot = (day: string, time: string) => {
      return timetableEntries.find(e => e.day === day && e.time === time)
  }

  const selectedBatchName = batches.find(b => b.id === selectedBatchId)?.name || 'Batch'

  if(loading) return (
    <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-end">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Time Table Management</h1>
                <p className="text-gray-600 mt-2">Design and manage weekly schedules for batches.</p>
            </div>
            
            <div className="w-64">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Batch</label>
                <select 
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                    {batches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>
            </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex items-center justify-between">
            <h2 className="font-semibold text-lg text-gray-800">
                Schedule for <span className="text-blue-600">{selectedBatchName}</span>
            </h2>
            <div className="space-x-4">
                 <button 
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    + Add Class
                </button>
            </div>
        </div>

        {/* The Grid */}
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-32 border-r">Time Slot</th>
                        {DAYS.map(day => (
                            <th key={day} className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[140px]">
                                {day}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {TIME_SLOTS.map((time) => (
                        <tr key={time}>
                            <td className="px-4 py-4 whitespace-nowrap text-xs font-bold text-gray-900 border-r bg-gray-50">
                                {time}
                            </td>
                            {DAYS.map(day => {
                                const entry = getEntryForSlot(day, time);
                                return (
                                    <td key={day + time} className="px-2 py-2 text-center border-l border-gray-100 relative group h-24 align-top">
                                        {entry ? (
                                           <div className={`p-2 rounded-lg text-xs h-full flex flex-col justify-between ${entry.status === 'conflict' ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-100'}`}>
                                                <div>
                                                    <div className="font-bold text-gray-900">{entry.subject}</div>
                                                    <div className="text-gray-600 mt-1">{entry.faculty}</div>
                                                    {entry.room && <div className="text-gray-500 mt-1">Room: {entry.room}</div>}
                                                </div>
                                                <button 
                                                    onClick={() => deleteEntry(entry.id)}
                                                    className="w-full mt-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    Remove
                                                </button>
                                           </div>
                                        ) : (
                                            <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <button 
                                                    onClick={() => {
                                                        setFormData(prev => ({...prev, day, time}))
                                                        setIsModalOpen(true)
                                                    }}
                                                    className="text-xs text-gray-400 hover:text-blue-500 border border-dashed border-gray-300 rounded px-2 py-1"
                                                >
                                                    + Add
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                    <h2 className="text-xl font-bold mb-4">Add Class to Schedule</h2>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Day</label>
                                <select 
                                    className="w-full border rounded p-2 text-sm"
                                    value={formData.day}
                                    onChange={e => setFormData({...formData, day: e.target.value})}
                                >
                                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Time</label>
                                <select 
                                    className="w-full border rounded p-2 text-sm"
                                    value={formData.time}
                                    onChange={e => setFormData({...formData, time: e.target.value})}
                                >
                                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
                            <select 
                                className="w-full border rounded p-2 text-sm"
                                value={formData.subject}
                                onChange={e => setFormData({...formData, subject: e.target.value})}
                            >
                                <option value="">Select Subject</option>
                                {subjects.map(s => <option key={s.id} value={s.name}>{s.name} ({s.code})</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Faculty</label>
                            <select 
                                className="w-full border rounded p-2 text-sm"
                                value={formData.faculty}
                                onChange={e => setFormData({...formData, faculty: e.target.value})}
                            >
                                <option value="">Select Faculty</option>
                                {faculty.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Room / Lab (Optional)</label>
                            <input 
                                type="text"
                                className="w-full border rounded p-2 text-sm"
                                placeholder="e.g. Lab 101"
                                value={formData.room}
                                onChange={e => setFormData({...formData, room: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={saveTimetableEntry}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Save Class
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  )
}