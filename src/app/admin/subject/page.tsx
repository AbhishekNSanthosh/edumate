"use client"
import React, { useState, useEffect } from 'react'
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import Link from 'next/link'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

export default function SubjectPage() {
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "subjects"), (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setSubjects(list)
        setLoading(false)
    }, (error) => {
        console.error(error)
        toast.error("Failed to load subjects")
        setLoading(false)
    })
    return () => unsub()
  }, [])

  const handleDelete = async (id: string) => {
    if(!confirm("Are you sure you want to delete this subject?")) return;
    try {
        await deleteDoc(doc(db, "subjects", id))
        toast.success("Subject deleted")
    } catch (error) {
        toast.error("Failed to delete")
    }
  }
  
  const handleExport = () => {
    if (subjects.length === 0) {
        toast.error("No data to export");
        return;
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(subjects.map(s => ({
        Name: s.name,
        Code: s.code,
        Department: s.department,
        Semester: s.semester,
        Credits: s.credits,
        Type: s.type,
        Status: s.status
    })));
    XLSX.utils.book_append_sheet(wb, ws, "Subjects");
    XLSX.writeFile(wb, "subjects_data.xlsx");
    toast.success("Export successful!");
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Core': return 'bg-blue-100 text-blue-800';
      case 'Elective': return 'bg-green-100 text-green-800';
      case 'Lab': return 'bg-purple-100 text-purple-800';
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
          <h1 className="text-3xl font-bold text-gray-900">Manage Subjects</h1>
          <p className="text-gray-600 mt-2">Curriculum and subjects offered within the institution.</p>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-4 mb-6">
            <Link href="/admin/subject/add">
                <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                    Add New Subject
                </button>
            </Link>
            <button 
                onClick={handleExport}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
                Export Data
            </button>
        </div>

        {/* Subjects Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
         {subjects.length === 0 ? (
             <div className="p-8 text-center text-gray-500">
                No subjects found. Add one to get started.
             </div>
          ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name & Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department / Semester</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{subject.name}</div>
                    <div className="text-sm text-gray-500">{subject.code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{subject.department}</div>
                    <div className="text-sm text-gray-500">{subject.semester}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{subject.credits}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(subject.type || 'Core')}`}>
                      {subject.type || 'Core'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(subject.status || 'active')}`}>
                      {(subject.status || 'active').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onClick={() => handleDelete(subject.id)} className="text-red-600 hover:text-red-900">Delete</button>
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
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Subjects</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{subjects.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Active Subjects</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{subjects.filter(s => s.status === 'active').length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Credits</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {subjects.reduce((sum, s) => sum + (Number(s.credits) || 0), 0)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Core Subjects</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {subjects.filter(s => s.type === 'Core').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}