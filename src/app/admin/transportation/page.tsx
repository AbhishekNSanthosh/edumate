"use client"
import React, { useState, useEffect } from 'react'
import { collection, doc, getDocs, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'

interface TransportRoute {
  id: string;
  routeNumber: string;
  name: string;
  stops: string[];
  driver: string;
  vehicleId: string;
  status: 'Active' | 'Inactive';
}

interface Vehicle {
  id: string;
  registrationNumber: string; // e.g., MH-12-AB-1234
  type: string; // Bus, Van
  capacity: number;
  driverName: string;
  status: 'Operational' | 'Maintenance';
}

interface TransportAllocation {
  id: string;
  studentId: string;
  studentName: string;
  routeId: string;
  routeNumber: string;
  stop: string; 
  fees: number;
  status: 'Active' | 'Cancelled';
}

export default function TransportationPage() {
  const [activeTab, setActiveTab] = useState<'Routes' | 'Vehicles' | 'Allocations'>('Routes')
  const [loading, setLoading] = useState(true)
  
  const [routes, setRoutes] = useState<TransportRoute[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [allocations, setAllocations] = useState<TransportAllocation[]>([])
  const [students, setStudents] = useState<any[]>([])

  // Modals
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false)
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false)
  const [isAllocModalOpen, setIsAllocModalOpen] = useState(false)

  // Forms
  const [routeForm, setRouteForm] = useState<any>({ stops: [] })
  const [vehicleForm, setVehicleForm] = useState<any>({})
  const [allocForm, setAllocForm] = useState<any>({})

  useEffect(() => {
    const unsubRoutes = onSnapshot(collection(db, "transport_routes"), (snap) => {
        setRoutes(snap.docs.map(d => ({id: d.id, ...d.data()} as TransportRoute)))
    })
    const unsubVehicles = onSnapshot(collection(db, "transport_vehicles"), (snap) => {
        setVehicles(snap.docs.map(d => ({id: d.id, ...d.data()} as Vehicle)))
    })
    const unsubAlloc = onSnapshot(collection(db, "student_transport"), (snap) => {
        setAllocations(snap.docs.map(d => ({id: d.id, ...d.data()} as TransportAllocation)))
    })

    const fetchStudents = async () => {
        const snap = await getDocs(collection(db, "students"))
        setStudents(snap.docs.map(d => ({id: d.id, ...d.data()})))
        setLoading(false)
    }
    fetchStudents()

    return () => {
        unsubRoutes()
        unsubVehicles()
        unsubAlloc()
    }
  }, [])

  // Handlers
  const handleAddRoute = async () => {
      try {
          const stopsArray = routeForm.stopsString ? routeForm.stopsString.split(',').map((s:string) => s.trim()) : []
          await addDoc(collection(db, "transport_routes"), {
              ...routeForm,
              stops: stopsArray,
              status: 'Active'
          })
          toast.success("Route added")
          setIsRouteModalOpen(false)
          setRouteForm({})
      } catch (error) {
          toast.error("Failed to add route")
      }
  }

  const handleAddVehicle = async () => {
      try {
          await addDoc(collection(db, "transport_vehicles"), {
              ...vehicleForm,
              capacity: parseInt(vehicleForm.capacity),
              status: 'Operational'
          })
          toast.success("Vehicle added")
          setIsVehicleModalOpen(false)
          setVehicleForm({})
      } catch (error) {
          toast.error("Failed to add vehicle")
      }
  }

  const handleAllocate = async () => {
      if(!allocForm.studentId || !allocForm.routeId) return;
      
      const student = students.find(s => s.id === allocForm.studentId)
      const route = routes.find(r => r.id === allocForm.routeId)
      
      try {
          await addDoc(collection(db, "student_transport"), {
              studentId: student.id,
              studentName: student.name,
              routeId: route?.id,
              routeNumber: route?.routeNumber,
              stop: allocForm.stop,
              fees: parseInt(allocForm.fees),
              status: 'Active'
          })
          toast.success("Student allocated")
          setIsAllocModalOpen(false)
          setAllocForm({})
      } catch (error) {
          toast.error("Allocation failed")
      }
  }

  const handleDelete = async (col: string, id: string) => {
      if(!confirm("Are you sure?")) return;
      await deleteDoc(doc(db, col, id))
      toast.success("Deleted successfully")
  }

  if(loading) return <div className="p-10">Loading...</div>

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Transportation Management</h1>
          <p className="text-gray-600 mt-2">Manage bus routes, vehicles, and student transport subscriptions.</p>
        </div>

        {/* Stats */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
             <div className="text-sm font-medium text-gray-500 uppercase">Total Routes</div>
             <div className="text-3xl font-bold mt-1 text-gray-900">{routes.length}</div>
           </div>
           <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
             <div className="text-sm font-medium text-gray-500 uppercase">Operational Vehicles</div>
             <div className="text-3xl font-bold mt-1 text-gray-900">{vehicles.filter(v => v.status === 'Operational').length}</div>
           </div>
           <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
             <div className="text-sm font-medium text-gray-500 uppercase">Students Using Transport</div>
             <div className="text-3xl font-bold mt-1 text-gray-900">{allocations.filter(a => a.status === 'Active').length}</div>
           </div>
         </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
            {['Routes', 'Vehicles', 'Allocations'].map(tab => (
                 <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-2 rounded-lg font-medium ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                >
                    {tab}
                </button>
            ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
             
             {/* Routes Tab */}
             {activeTab === 'Routes' && (
                 <div>
                     <div className="p-6 border-b flex justify-between items-center">
                         <h2 className="text-lg font-semibold">Bus Routes</h2>
                         <button onClick={() => setIsRouteModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">+ Add Route</button>
                     </div>
                     <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-50">
                             <tr>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Route #</th>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Stops</th>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Driver / Vehicle</th>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-200">
                             {routes.map(r => (
                                 <tr key={r.id}>
                                     <td className="px-6 py-4 font-bold text-gray-900">{r.routeNumber}</td>
                                     <td className="px-6 py-4 text-gray-900">{r.name}</td>
                                     <td className="px-6 py-4 text-sm text-gray-500">{r.stops.join(', ')}</td>
                                     <td className="px-6 py-4 text-sm text-gray-500">
                                         {r.driver} <br/> 
                                         <span className="text-xs text-gray-400">{vehicles.find(v => v.id === r.vehicleId)?.registrationNumber || r.vehicleId}</span>
                                     </td>
                                     <td className="px-6 py-4">
                                         <button onClick={() => handleDelete("transport_routes", r.id)} className="text-red-500 hover:text-red-700 text-sm font-bold">Delete</button>
                                     </td>
                                 </tr>
                             ))}
                             {routes.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">No routes found.</td></tr>}
                         </tbody>
                     </table>
                 </div>
             )}

             {/* Vehicles Tab */}
             {activeTab === 'Vehicles' && (
                 <div>
                     <div className="p-6 border-b flex justify-between items-center">
                         <h2 className="text-lg font-semibold">Fleet Management</h2>
                         <button onClick={() => setIsVehicleModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">+ Add Vehicle</button>
                     </div>
                     <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-50">
                             <tr>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Veh No.</th>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Capacity</th>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Driver</th>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-200">
                             {vehicles.map(v => (
                                 <tr key={v.id}>
                                     <td className="px-6 py-4 font-bold text-gray-900">{v.registrationNumber}</td>
                                     <td className="px-6 py-4 text-gray-900">{v.type}</td>
                                     <td className="px-6 py-4 text-gray-900">{v.capacity}</td>
                                     <td className="px-6 py-4 text-gray-900">{v.driverName}</td>
                                     <td className="px-6 py-4">
                                         <button onClick={() => handleDelete("transport_vehicles", v.id)} className="text-red-500 hover:text-red-700 text-sm font-bold">Delete</button>
                                     </td>
                                 </tr>
                             ))}
                             {vehicles.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">No vehicles found.</td></tr>}
                         </tbody>
                     </table>
                 </div>
             )}

             {/* Allocations Tab */}
             {activeTab === 'Allocations' && (
                 <div>
                     <div className="p-6 border-b flex justify-between items-center">
                         <h2 className="text-lg font-semibold">Student Allocations</h2>
                         <button onClick={() => setIsAllocModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">Allocate Student</button>
                     </div>
                     <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-50">
                             <tr>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Route</th>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Stop</th>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Fees</th>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-200">
                             {allocations.map(a => (
                                 <tr key={a.id}>
                                     <td className="px-6 py-4 font-bold text-gray-900">{a.studentName}</td>
                                     <td className="px-6 py-4 text-gray-900">{a.routeNumber}</td>
                                     <td className="px-6 py-4 text-gray-500">{a.stop}</td>
                                     <td className="px-6 py-4 text-gray-900">${a.fees}</td>
                                     <td className="px-6 py-4">
                                         <button onClick={() => handleDelete("student_transport", a.id)} className="text-red-500 hover:text-red-700 text-sm font-bold">Remove</button>
                                     </td>
                                 </tr>
                             ))}
                             {allocations.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">No allocations found.</td></tr>}
                         </tbody>
                     </table>
                 </div>
             )}
        </div>
      </div>

      {/* Modals */}
      {isRouteModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-96">
                  <h3 className="text-lg font-bold mb-4">Add Route</h3>
                  <input type="text" placeholder="Route Number (e.g. RT-01)" className="w-full border p-2 mb-2 rounded" 
                    value={routeForm.routeNumber} onChange={e => setRouteForm({...routeForm, routeNumber: e.target.value})} />
                  <input type="text" placeholder="Route Name" className="w-full border p-2 mb-2 rounded" 
                    value={routeForm.name} onChange={e => setRouteForm({...routeForm, name: e.target.value})} />
                  <input type="text" placeholder="Stops (comma separated)" className="w-full border p-2 mb-2 rounded" 
                    value={routeForm.stopsString} onChange={e => setRouteForm({...routeForm, stopsString: e.target.value})} />
                  <input type="text" placeholder="Driver Name" className="w-full border p-2 mb-2 rounded" 
                    value={routeForm.driver} onChange={e => setRouteForm({...routeForm, driver: e.target.value})} />
                  
                  <select className="w-full border p-2 mb-4 rounded" 
                    value={routeForm.vehicleId} onChange={e => setRouteForm({...routeForm, vehicleId: e.target.value})}>
                      <option value="">Select Vehicle</option>
                      {vehicles.filter(v => v.status === 'Operational').map(v => <option key={v.id} value={v.id}>{v.registrationNumber}</option>)}
                  </select>

                  <div className="flex justify-end space-x-2">
                       <button onClick={() => setIsRouteModalOpen(false)} className="text-gray-500">Cancel</button>
                       <button onClick={handleAddRoute} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
                  </div>
              </div>
          </div>
      )}

      {isVehicleModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-96">
                  <h3 className="text-lg font-bold mb-4">Add Vehicle</h3>
                  <input type="text" placeholder="Reg Number" className="w-full border p-2 mb-2 rounded" 
                    value={vehicleForm.registrationNumber} onChange={e => setVehicleForm({...vehicleForm, registrationNumber: e.target.value})} />
                  <select className="w-full border p-2 mb-2 rounded" 
                    value={vehicleForm.type} onChange={e => setVehicleForm({...vehicleForm, type: e.target.value})}>
                        <option value="Bus">Bus</option>
                        <option value="Van">Van</option>
                        <option value="Mini Bus">Mini Bus</option>
                  </select>
                   <input type="number" placeholder="Capacity" className="w-full border p-2 mb-2 rounded" 
                    value={vehicleForm.capacity} onChange={e => setVehicleForm({...vehicleForm, capacity: e.target.value})} />
                   <input type="text" placeholder="Default Driver" className="w-full border p-2 mb-4 rounded" 
                    value={vehicleForm.driverName} onChange={e => setVehicleForm({...vehicleForm, driverName: e.target.value})} />
                  
                   <div className="flex justify-end space-x-2">
                       <button onClick={() => setIsVehicleModalOpen(false)} className="text-gray-500">Cancel</button>
                       <button onClick={handleAddVehicle} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
                  </div>
              </div>
          </div>
      )}
      
      {isAllocModalOpen && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-96">
                  <h3 className="text-lg font-bold mb-4">Allocate Student</h3>
                  <select className="w-full border p-2 mb-2 rounded" 
                    value={allocForm.studentId} onChange={e => setAllocForm({...allocForm, studentId: e.target.value})}>
                        <option value="">Select Student</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.registerNumber})</option>)}
                  </select>
                   <select className="w-full border p-2 mb-2 rounded" 
                    value={allocForm.routeId} onChange={e => setAllocForm({...allocForm, routeId: e.target.value})}>
                        <option value="">Select Route</option>
                        {routes.map(r => <option key={r.id} value={r.id}>{r.routeNumber} - {r.name}</option>)}
                  </select>
                  <input type="text" placeholder="Pickup Stop" className="w-full border p-2 mb-2 rounded" 
                    value={allocForm.stop} onChange={e => setAllocForm({...allocForm, stop: e.target.value})} />
                  <input type="number" placeholder="Transport Fees" className="w-full border p-2 mb-4 rounded" 
                    value={allocForm.fees} onChange={e => setAllocForm({...allocForm, fees: e.target.value})} />

                   <div className="flex justify-end space-x-2">
                       <button onClick={() => setIsAllocModalOpen(false)} className="text-gray-500">Cancel</button>
                       <button onClick={handleAllocate} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
                  </div>
              </div>
           </div>
      )}

    </div>
  )
}