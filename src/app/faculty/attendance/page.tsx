"use client";
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import toast from 'react-hot-toast';

export default function StudentAttendancePage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);

  // Fetch Batches on mount
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const q = query(collection(db, 'batches')); // Assuming 'batches' collection exists
        const querySnapshot = await getDocs(q);
        const batchList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBatches(batchList);
      } catch (error) {
        console.error("Error fetching batches:", error);
        toast.error("Failed to load batches");
      }
    };
    fetchBatches();
  }, []);

  // Fetch Students when Batch changes
  useEffect(() => {
    if (!selectedBatch) {
        setStudents([]);
        return;
    }

    const fetchStudents = async () => {
      setLoading(true);
      try {
        // Find the batch name to query students
        const batch = batches.find(b => b.id === selectedBatch);
        if(!batch) return;

        // Query students where batch/class matches
        // Adjust 'classId' or 'batch' field based on your Student schema
        const q = query(collection(db, 'students'), where('batchId', '==', selectedBatch)); 
        const querySnapshot = await getDocs(q);
        const studentList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setStudents(studentList);
        
        // Initialize attendance data as 'Present' for all
        const initialAttendance: any = {};
        studentList.forEach((s: any) => {
            initialAttendance[s.id] = 'Present';
        });
        setAttendanceData(initialAttendance);

      } catch (error) {
        console.error("Error fetching students:", error);
        toast.error("Failed to load students");
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [selectedBatch, batches]);

  const handleAttendanceChange = (studentId: string, status: string) => {
    setAttendanceData(prev => ({
        ...prev,
        [studentId]: status
    }));
  };

  const handleSubmit = async () => {
    if (!selectedBatch || !attendanceDate) {
        toast.error("Please select batch and date");
        return;
    }

    setLoading(true);
    try {
        // Save attendance record for each student
        // Using a transaction or batch write would be better for atomicity, but simple loop for now
        // Structure: collection 'attendance' -> doc per student-date or subcollection
        
        const promises = students.map(student => {
            return addDoc(collection(db, 'attendance'), {
                studentId: student.id, // Firestore Doc ID
                studentUid: student.uid, // Student Auth UID
                studentName: student.name,
                batchId: selectedBatch,
                date: attendanceDate,
                status: attendanceData[student.id],
                createdAt: serverTimestamp(),
                markedBy: 'Faculty' // Could be dynamic user ID
            });
        });

        await Promise.all(promises);
        toast.success("Attendance marked successfully!");
        
        // Optional: Reset or redirect
    } catch (error) {
        console.error("Error saving attendance:", error);
        toast.error("Failed to save attendance");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mark Student Attendance</h1>

        {/* Controls */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6 flex flex-wrap gap-4 items-end">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Batch</label>
                <select 
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="">-- Select Batch --</option>
                    {batches.map(batch => (
                        <option key={batch.id} value={batch.id}>{batch.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input 
                    type="date" 
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
        </div>

        {/* Student List */}
        {selectedBatch && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Loading students...</div>
                ) : students.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">No students found in this batch.</div>
                ) : (
                    <>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No / ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {students.map(student => (
                                <tr key={student.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {student.uid}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {student.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex gap-4">
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    name={`attendance-${student.id}`} 
                                                    value="Present" 
                                                    checked={attendanceData[student.id] === 'Present'}
                                                    onChange={() => handleAttendanceChange(student.id, 'Present')}
                                                    className="text-green-600 focus:ring-green-500 h-4 w-4"
                                                />
                                                <span className="text-sm text-gray-700">Present</span>
                                            </label>
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    name={`attendance-${student.id}`} 
                                                    value="Absent" 
                                                    checked={attendanceData[student.id] === 'Absent'}
                                                    onChange={() => handleAttendanceChange(student.id, 'Absent')}
                                                    className="text-red-600 focus:ring-red-500 h-4 w-4"
                                                />
                                                <span className="text-sm text-gray-700">Absent</span>
                                            </label>
                                             <label className="flex items-center space-x-2 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    name={`attendance-${student.id}`} 
                                                    value="Late" 
                                                    checked={attendanceData[student.id] === 'Late'}
                                                    onChange={() => handleAttendanceChange(student.id, 'Late')}
                                                    className="text-yellow-600 focus:ring-yellow-500 h-4 w-4"
                                                />
                                                <span className="text-sm text-gray-700">Late</span>
                                            </label>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
                        <button 
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-medium"
                        >
                            {loading ? 'Saving...' : 'Submit Attendance'}
                        </button>
                    </div>
                    </>
                )}
            </div>
        )}
      </div>
    </div>
  )
}
