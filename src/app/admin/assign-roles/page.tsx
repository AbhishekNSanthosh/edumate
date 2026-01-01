"use client"
import React, { useState, useEffect } from 'react'
import { collection, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

const ROLES_CONFIG = {
  'Super Admin': {
    permissions: ['All Permissions'],
    modules: ['All'],
    color: 'bg-red-100 text-red-800'
  },
  'HOD': {
    permissions: ['Dept Management', 'Faculty Oversight', 'Reports'],
    modules: ['Dashboard', 'Department', 'Faculty', 'Students', 'Reports'],
    color: 'bg-purple-100 text-purple-800'
  },
  'Coordinator': {
    permissions: ['Batch Management', 'Timetable', 'Events'],
    modules: ['Dashboard', 'Batches', 'Timetable', 'Events'],
    color: 'bg-orange-100 text-orange-800'
  },
  'Faculty': {
    permissions: ['View Students', 'Grade Assignments', 'Attendance'],
    modules: ['Dashboard', 'Students', 'Subjects', 'Attendance'],
    color: 'bg-green-100 text-green-800'
  },
  'Tutor': {
    permissions: ['Student Mentoring', 'Basic View'],
    modules: ['Dashboard', 'Students'],
    color: 'bg-blue-100 text-blue-800'
  },
  'Student': {
    permissions: ['View Own Data'],
    modules: ['Dashboard', 'Courses'],
    color: 'bg-gray-100 text-gray-800'
  }
}

export default function AssignRolesPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetching Faculty as the primary "users" to assign roles to for this context
    const unsub = onSnapshot(collection(db, "faculty"), (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setUsers(list)
        setLoading(false)
    }, (error) => {
        console.error(error)
        toast.error("Failed to load users")
        setLoading(false)
    })
    return () => unsub()
  }, [])

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      const userRef = doc(db, "faculty", userId)
      await updateDoc(userRef, { 
          role: newRole,
          updatedAt: new Date().toISOString()
      })
      
      // Notify
      await addDoc(collection(db, "notifications"), {
          title: "Role Updated",
          message: `User role updated to ${newRole}`,
          createdAt: new Date().toISOString(),
          read: false,
          type: 'warning'
      })

      toast.success(`Role updated to ${newRole}`)
    } catch (error) {
      console.error(error)
      toast.error("Failed to update role")
    }
  }

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    try {
      await updateDoc(doc(db, "faculty", userId), { 
          accessStatus: newStatus,
          updatedAt: new Date().toISOString()
      })
      toast.success(`User ${newStatus === 'active' ? 'enabled' : 'disabled'}`)
    } catch (error) {
      console.error(error)
      toast.error("Failed to update status")
    }
  }

  const handleExport = () => {
    const data = users.map(u => ({
        Name: u.name,
        Email: u.email,
        Role: u.role,
        Status: u.accessStatus
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, "Roles")
    XLSX.writeFile(wb, "roles_permissions.xlsx")
    toast.success("Exported successfully")
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Assign Roles & Permissions</h1>
          <p className="text-gray-600 mt-2">Manage user access levels and permissions across the system.</p>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-4 mb-6">
          <button onClick={handleExport} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
            Export Roles
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
           <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions Included</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => {
                    const roleInfo = ROLES_CONFIG[user.role as keyof typeof ROLES_CONFIG] || ROLES_CONFIG['Faculty']
                    return (
                    <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleInfo.color}`}>
                                {user.role}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <div className="text-xs text-gray-500">
                                {roleInfo.permissions.join(', ')}
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.accessStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {user.accessStatus === 'active' ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 flex items-center">
                            <select 
                                value={user.role}
                                onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                                className="text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-500"
                            >
                                {Object.keys(ROLES_CONFIG).map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                            <button 
                                onClick={() => handleStatusToggle(user.id, user.accessStatus || 'active')}
                                className={`text-xs px-2 py-1 rounded border ${user.accessStatus === 'active' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                            >
                                {user.accessStatus === 'active' ? 'Disable Account' : 'Enable Account'}
                            </button>
                        </td>
                    </tr>
                    )
                })}
                </tbody>
            </table>
           </div>
        </div>

        {/* Reference: Role Definitions */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-700 uppercase">Role Definitions Reference</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(ROLES_CONFIG).map(([role, config]) => (
                    <div key={role} className="border border-gray-200 rounded-lg p-4">
                        <h3 className={`font-bold mb-2 ${config.color.split(' ')[1]}`}>{role}</h3>
                        <div className="mb-2">
                            <p className="text-xs font-semibold text-gray-500">Permissions:</p>
                            <p className="text-xs text-gray-700">{config.permissions.join(', ')}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500">Modules:</p>
                            <p className="text-xs text-gray-700">{config.modules.join(', ')}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  )
}