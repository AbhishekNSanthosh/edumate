"use client"
import React, { useState, useEffect } from 'react'
import { collection, doc, getDocs, onSnapshot, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'

interface Room {
  id: string;
  block: string;
  roomNumber: string;
  type: string; // Single/Double/Triple
  capacity: number;
  fees: number;
  occupants: string[]; // List of Student IDs
}

interface Allocation {
  id: string;
  studentId: string;
  studentName: string;
  roomId: string;
  roomNumber: string;
  block: string;
  checkInDate: string;
  status: 'Active' | 'CheckedOut';
}

export default function HostelPage() {
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<Room[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [students, setStudents] = useState<any[]>([])

  const [activeTab, setActiveTab] = useState<'Rooms' | 'Allocations'>('Rooms')
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false)
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false)
  
  const [roomForm, setRoomForm] = useState<any>({ block: 'Block A', type: 'Double', capacity: 2 })
  const [allocationForm, setAllocationForm] = useState<any>({})

  useEffect(() => {
    // Listeners
    const unsubRooms = onSnapshot(collection(db, "hostel_rooms"), (snap) => {
        setRooms(snap.docs.map(d => ({id: d.id, ...d.data()} as Room)))
    })
    const unsubAlloc = onSnapshot(collection(db, "hostel_allocations"), (snap) => {
        setAllocations(snap.docs.map(d => ({id: d.id, ...d.data()} as Allocation)))
    })

    const fetchStudents = async () => {
        const snap = await getDocs(collection(db, "students"))
        setStudents(snap.docs.map(d => ({id: d.id, ...d.data()})))
        setLoading(false)
    }
    fetchStudents()

    return () => {
        unsubRooms()
        unsubAlloc()
    }
  }, [])

  const handleAddRoom = async () => {
      try {
          await addDoc(collection(db, "hostel_rooms"), {
              ...roomForm,
              occupants: [],
              capacity: parseInt(roomForm.capacity),
              fees: parseInt(roomForm.fees || 0)
          })
          toast.success("Room added")
          setIsRoomModalOpen(false)
      } catch (error) {
          toast.error("Failed to add room")
      }
  }

  const handleAllocate = async () => {
      if (!allocationForm.studentId || !allocationForm.roomId) {
          toast.error("Please select student and room")
          return
      }
      
      const room = rooms.find(r => r.id === allocationForm.roomId)
      if (!room) return
      
      if (room.occupants.length >= room.capacity) {
          toast.error("Room is full!")
          return
      }

      const student = students.find(s => s.id === allocationForm.studentId)

      try {
          // 1. Create Allocation Record
          await addDoc(collection(db, "hostel_allocations"), {
              studentId: student.id,
              studentName: student.name,
              roomId: room.id,
              roomNumber: room.roomNumber,
              block: room.block,
              checkInDate: new Date().toISOString().split('T')[0],
              status: 'Active'
          })

          // 2. Update Room Occupants
          await updateDoc(doc(db, "hostel_rooms", room.id), {
              occupants: [...room.occupants, student.id]
          })

          toast.success("Room allocated successfully")
          setIsAllocateModalOpen(false)
          setAllocationForm({})
      } catch (error) {
          console.error(error)
          toast.error("Allocation failed")
      }
  }

  const handleCheckOut = async (alloc: Allocation) => {
      if(!confirm("Check out this student?")) return;
      
      try {
          // 1. Mark Allocation as CheckedOut
          await updateDoc(doc(db, "hostel_allocations", alloc.id), {
              status: 'CheckedOut',
              checkOutDate: new Date().toISOString().split('T')[0]
          })

          // 2. Remove from Room
          const room = rooms.find(r => r.id === alloc.roomId)
          if(room) {
              await updateDoc(doc(db, "hostel_rooms", room.id), {
                  occupants: room.occupants.filter(id => id !== alloc.studentId)
              })
          }
          toast.success("Checked out")
      } catch (error) {
          toast.error("Checkout failed")
      }
  }

  const handleDeleteRoom = async (id: string) => {
      if(!confirm("Delete this room?")) return;
      await deleteDoc(doc(db, "hostel_rooms", id))
      toast.success("Room deleted")
  }

  // Derived Stats
  const totalCapacity = rooms.reduce((acc, r) => acc + r.capacity, 0)
  const totalOccupied = rooms.reduce((acc, r) => acc + r.occupants.length, 0)
  const availableBeds = totalCapacity - totalOccupied

  if(loading) return <div className="p-10">Loading...</div>

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Hostel Management</h1>
          <p className="text-gray-600 mt-2">Manage rooms, capacity, and student allocations.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                <div className="text-sm font-medium text-gray-500 uppercase">Total Capacity</div>
                <div className="text-3xl font-bold mt-1">{totalCapacity}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                <div className="text-sm font-medium text-gray-500 uppercase">Occupied</div>
                <div className="text-3xl font-bold mt-1 text-green-600">{totalOccupied}</div>
            </div>
             <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
                <div className="text-sm font-medium text-gray-500 uppercase">Available</div>
                <div className="text-3xl font-bold mt-1 text-yellow-600">{availableBeds}</div>
            </div>
        </div>

        <div className="flex space-x-4 mb-6">
            <button 
                onClick={() => setActiveTab('Rooms')}
                className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'Rooms' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
                Rooms
            </button>
            <button 
                onClick={() => setActiveTab('Allocations')}
                className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'Allocations' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
                Allocations
            </button>
        </div>

        {activeTab === 'Rooms' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Room List</h2>
                    <button 
                        onClick={() => setIsRoomModalOpen(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    >
                        + Add Room
                    </button>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Room No</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Block</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Fees</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-200">
                         {rooms.map(room => (
                             <tr key={room.id}>
                                 <td className="px-6 py-4 text-sm font-bold text-gray-900">{room.roomNumber}</td>
                                 <td className="px-6 py-4 text-sm text-gray-500">{room.block}</td>
                                 <td className="px-6 py-4 text-sm text-gray-500">{room.type} ({room.capacity} Bed)</td>
                                 <td className="px-6 py-4">
                                     <span className={`px-2 py-1 rounded text-xs ${
                                         room.occupants.length >= room.capacity ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                     }`}>
                                         {room.occupants.length} / {room.capacity}
                                     </span>
                                 </td>
                                 <td className="px-6 py-4 text-sm text-gray-900">${room.fees}</td>
                                 <td className="px-6 py-4 space-x-2">
                                     <button 
                                        onClick={() => handleDeleteRoom(room.id)}
                                        className="text-red-600 hover:text-red-900 text-xs font-bold"
                                     >
                                         Delete
                                     </button>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                </table>
            </div>
        )}

        {activeTab === 'Allocations' && (
             <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Allocations</h2>
                    <button 
                        onClick={() => setIsAllocateModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                        Allocate Room
                    </button>
                </div>
                 <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Block / Room</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Check In</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-200">
                         {allocations.map(alloc => (
                             <tr key={alloc.id}>
                                 <td className="px-6 py-4 text-sm text-gray-900 font-medium">{alloc.studentName}</td>
                                 <td className="px-6 py-4 text-sm text-gray-500">{alloc.block} - {alloc.roomNumber}</td>
                                 <td className="px-6 py-4 text-sm text-gray-500">{alloc.checkInDate}</td>
                                 <td className="px-6 py-4">
                                     <span className={`px-2 py-1 rounded text-xs ${
                                         alloc.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                     }`}>
                                         {alloc.status}
                                     </span>
                                 </td>
                                 <td className="px-6 py-4 space-x-2">
                                     {alloc.status === 'Active' && (
                                        <button 
                                            onClick={() => handleCheckOut(alloc)}
                                            className="text-red-600 hover:text-red-900 text-xs font-bold"
                                        >
                                            Check Out
                                        </button>
                                     )}
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                </table>
            </div>
        )}

      </div>

      {/* Add Room Modal */}
      {isRoomModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-96">
                  <h3 className="text-lg font-bold mb-4">Add Room</h3>
                  <div className="space-y-3">
                      <input type="text" placeholder="Block Name (e.g. Block A)" className="w-full border p-2 rounded" 
                        value={roomForm.block} onChange={e => setRoomForm({...roomForm, block: e.target.value})} />
                      <input type="text" placeholder="Room Number" className="w-full border p-2 rounded" 
                        value={roomForm.roomNumber} onChange={e => setRoomForm({...roomForm, roomNumber: e.target.value})} />
                       <select className="w-full border p-2 rounded"
                            value={roomForm.type} onChange={e => setRoomForm({...roomForm, type: e.target.value, capacity: e.target.value === 'Single' ? 1 : e.target.value === 'Double' ? 2 : 3})}
                       >
                           <option value="Single">Single (1 Bed)</option>
                           <option value="Double">Double (2 Beds)</option>
                           <option value="Triple">Triple (3 Beds)</option>
                       </select>
                      <input type="number" placeholder="Fees (Monthly)" className="w-full border p-2 rounded" 
                        value={roomForm.fees} onChange={e => setRoomForm({...roomForm, fees: e.target.value})} />
                  </div>
                  <div className="mt-4 flex justify-end space-x-2">
                      <button onClick={() => setIsRoomModalOpen(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                      <button onClick={handleAddRoom} className="px-4 py-2 bg-green-600 text-white rounded">Save</button>
                  </div>
              </div>
          </div>
      )}

      {/* Allocate Modal */}
      {isAllocateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-96">
                  <h3 className="text-lg font-bold mb-4">Allocate Room</h3>
                  <div className="space-y-3">
                      <label className="block text-xs font-bold text-gray-500">Select Student</label>
                      <select className="w-full border p-2 rounded mb-2"
                        value={allocationForm.studentId} 
                        onChange={e => setAllocationForm({...allocationForm, studentId: e.target.value})}
                      >
                          <option value="">Choose Student</option>
                          {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.registerNumber})</option>)}
                      </select>
                      
                       <label className="block text-xs font-bold text-gray-500">Select Room (Available Only)</label>
                      <select className="w-full border p-2 rounded"
                        value={allocationForm.roomId} 
                        onChange={e => setAllocationForm({...allocationForm, roomId: e.target.value})}
                      >
                          <option value="">Choose Room</option>
                          {rooms.filter(r => r.occupants.length < r.capacity).map(r => (
                              <option key={r.id} value={r.id}>{r.block} - {r.roomNumber} ({r.type})</option>
                          ))}
                      </select>
                  </div>
                  <div className="mt-4 flex justify-end space-x-2">
                       <button onClick={() => setIsAllocateModalOpen(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                      <button onClick={handleAllocate} className="px-4 py-2 bg-blue-600 text-white rounded">Allocate</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  )
}