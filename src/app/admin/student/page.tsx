"use client"
import React, { useEffect, useState } from 'react'
import { collection, deleteDoc, doc, updateDoc, writeBatch, getDocs, query, orderBy } from 'firebase/firestore'
import * as XLSX from 'xlsx'
import { db } from '../../../../src/config/firebaseConfig'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function page() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
        console.log("Attempting to fetch students...");
        // const q = query(collection(db, "students"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(collection(db, "students"));
        
        console.log("Data fetched:", querySnapshot.size);
        const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStudents(list);
    } catch (err: any) {
        console.error("Fetch error:", err);
        setError(err.message);
        toast.error("Failed to load data: " + err.message);
        
        if (err.code === 'permission-denied') {
            toast.error("Check your Firestore Security Rules!");
        } else if (err.code === 'unavailable') {
            toast.error("Network unavailable or Firestore offline");
        }
    } finally {
        setLoading(false);
    }
  }

  useEffect(() => {
    // Timeout detection
    const timeoutId = setTimeout(() => {
        if(loading) {
            toast('Loading is slower than usual...', {
                icon: '⏳',
            });
        }
    }, 5000);

    fetchStudents().finally(() => clearTimeout(timeoutId));
  }, [])

  const handleDelete = async (id: string) => {
    if(!confirm("Are you sure you want to delete this student?")) return;
    try {
      await deleteDoc(doc(db, "students", id))
      toast.success("Student deleted successfully")
    } catch (error) {
      console.error(error)
      toast.error("Failed to delete student")
    }
  }

  const toggleStatus = async (id: string, currentStatus: string) => {
      const newStatus = currentStatus === 'active' ? 'withdrawn' : 'active';
      try {
          await updateDoc(doc(db, "students", id), { status: newStatus });
          toast.success(`Student status updated to ${newStatus}`);
      } catch (error) {
          console.error(error);
          toast.error("Failed to update status");
      }
  }

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }


  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            
            if(data.length === 0) {
                toast.error("File is empty");
                return;
            }

            // Batch write
            const batch = writeBatch(db);
            const studentRef = collection(db, "students");
            
            let count = 0;
            data.forEach((student: any) => {
                const newDocRef = doc(studentRef); // Auto-ID
                batch.set(newDocRef, {
                    name: student.Name || student.name,
                    regNumber: student.RegNumber || student.regNumber || student['Register Number'],
                    email: student.Email || student.email,
                    department: student.Department || student.department,
                    status: 'active',
                    attendance: '0%',
                    createdAt: new Date().toISOString()
                });
                count++;
            });

            await batch.commit();
            toast.success(`Successfully added ${count} students`);
            
        } catch (error: any) {
            console.error("Bulk upload error:", error);
            toast.error("Failed to process file: " + error.message);
        }
    };
    reader.readAsBinaryString(file);
  }

  const QuickActions = () => (
    <div className="flex space-x-4 mb-6">
      <Link href="/admin/student/add">
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            Add New Student
        </button>
      </Link>
      
      <div className="relative">
          <input 
              type="file" 
              accept=".csv, .xlsx, .xls"
              onChange={handleBulkUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Upload CSV/Excel
          </button>
      </div>

      <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
        Export Data
      </button>
    </div>
  )

  const totalActive = students.filter(s => s.status === 'active').length
  const totalAttendanceAvg = students.length > 0 
    ? students.reduce((sum, s) => sum + (parseFloat(s.attendance) || 0), 0) / students.length 
    : 0

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500">Loading student records...</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="p-6 bg-white rounded-lg shadow-md text-center max-w-md">
            <h3 className="text-red-500 text-lg font-bold mb-2">Error Loading Data</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
                onClick={fetchStudents}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Retry Connection
            </button>
        </div>
    </div>
  )

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Students</h1>
          <p className="text-gray-600 mt-2">Records and academic profiles for enrolled students.</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Students Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {students.length === 0 ? (
            <div className="p-12 text-center">
                <p className="text-xl text-gray-500 mb-4">No students found</p>
                <Link href="/admin/student/add">
                    <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        Add Your First Student
                    </button>
                </Link>
            </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reg No & Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Personal Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department / Batch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{student.regNumber}</div>
                    <div className="text-sm text-gray-500">{student.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{student.email}</div>
                    <div className="text-sm text-gray-500">{student.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{student.department}</div>
                    <div className="text-sm text-gray-500">{student.batch}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-blue-600">{student.attendance || "0%"}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(student.status || 'active')}`}>
                      {(student.status || 'active').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button 
                        onClick={() => toggleStatus(student.id, student.status || 'active')}
                        className={`text-${(student.status || 'active') === 'active' ? 'red' : 'green'}-600 hover:underline`}
                    >
                      {(student.status || 'active') === 'active' ? 'Withdraw' : 'Re-enroll'}
                    </button>
                    <button 
                        onClick={() => handleDelete(student.id)}
                        className="text-red-600 hover:text-red-900"
                    >
                        Delete
                    </button>
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
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Students</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{students.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Active Students</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalActive}</p>
          </div>
           <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Avg Attendance</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalAttendanceAvg.toFixed(1)}%</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Departments</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {new Set(students.map(s => s.department)).size}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}