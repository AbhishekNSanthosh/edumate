"use client"
import React, { useState, useEffect } from 'react'
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import Link from 'next/link'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

export default function FacultyPage() {
  const [faculties, setFaculties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "faculty"), (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setFaculties(list)
        setLoading(false)
    }, (error) => {
        console.error(error)
        toast.error("Failed to load faculty")
        setLoading(false)
    })
    return () => unsub()
  }, [])

  const handleDelete = async (id: string) => {
    if(!confirm("Are you sure you want to delete this faculty member?")) return;
    try {
        await deleteDoc(doc(db, "faculty", id))
        toast.success("Faculty deleted")
    } catch (error) {
        toast.error("Failed to delete")
    }
  }

  const handleExport = () => {
     if (faculties.length === 0) {
         toast.error("No data to export");
         return;
     }
     const wb = XLSX.utils.book_new();
     const ws = XLSX.utils.json_to_sheet(faculties.map(f => ({
         UID: f.uid,
         Name: f.name,
         Email: f.email,
         Phone: f.phone,
         Department: f.department,
         Designation: f.designation,
         Role: f.role,
         Status: f.accessStatus
     })));
     XLSX.utils.book_append_sheet(wb, ws, "Faculty");
     XLSX.writeFile(wb, "faculty_data.xlsx");
     toast.success("Export successful!");
   }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Faculty': return 'bg-blue-100 text-blue-800';
      case 'Tutor': return 'bg-green-100 text-green-800';
      case 'Coordinator': return 'bg-purple-100 text-purple-800';
      case 'HOD': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Faculty</h1>
          <p className="text-gray-600 mt-2">Accounts and academic responsibilities for faculty members.</p>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-4 mb-6">
            <Link href="/admin/faculty/add">
                <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                    Add New Faculty
                </button>
            </Link>
            <button 
                onClick={handleExport}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
                Export Data
            </button>
        </div>

        {/* Faculty Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
         {faculties.length === 0 ? (
             <div className="p-8 text-center text-gray-500">
                No faculty found. Add one to get started.
             </div>
          ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID & Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department / Designation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Access Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {faculties.map((faculty) => (
                <tr key={faculty.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{faculty.uid}</div>
                    <div className="text-sm text-gray-500">{faculty.name}</div>
                    <div className="text-xs text-gray-400">{faculty.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{faculty.department}</div>
                    <div className="text-sm text-gray-500">{faculty.designation}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{faculty.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(faculty.accessStatus || 'active')}`}>
                      {(faculty.accessStatus || 'active').charAt(0).toUpperCase() + (faculty.accessStatus || 'active').slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(faculty.role || 'Faculty')}`}>
                      {faculty.role || 'Faculty'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onClick={() => handleDelete(faculty.id)} className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Faculty</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{faculties.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Active Faculty</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{faculties.filter(f => f.accessStatus === 'active').length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Faculty Roles</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {faculties.filter(f => f.role === 'Faculty').length} Faculty
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Departments Covered</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {new Set(faculties.map(f => f.department)).size}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}