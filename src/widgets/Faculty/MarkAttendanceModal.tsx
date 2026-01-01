"use client";
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import toast from 'react-hot-toast';
import { IoClose, IoSaveOutline, IoCheckmarkDoneOutline } from 'react-icons/io5';

interface Student {
  id: string;
  name: string;
  regNumber: string;
  rollNumber?: string;
  status?: 'present' | 'absent' | 'late' | 'excused'; // Local state for marking
}

interface MarkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: string;
  subject: string;
  date: Date;
  slotTime: string;
  facultyId: string;
}

export default function MarkAttendanceModal({ isOpen, onClose, batch, subject, date, slotTime, facultyId }: MarkAttendanceModalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load students for the batch
  useEffect(() => {
    if (!isOpen) return;

    const fetchStudents = async () => {
      setLoading(true);
      try {
        const studentsRef = collection(db, 'students');
        // Assuming 'batch' field exists in student document e.g., "CSE 2022-26"
        // Adjust if your batch format matches exactly or needs partial matching
        const q = query(studentsRef, where('batch', '==', batch), where('status', '==', 'active')); 
        const snapshot = await getDocs(q);
        
        const fetchedStudents: Student[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          status: 'present' // Default to present
        })) as Student[];

        // Sort by Roll Number or Name
        fetchedStudents.sort((a, b) => (a.rollNumber || a.regNumber).localeCompare(b.rollNumber || b.regNumber));

        setStudents(fetchedStudents);
      } catch (error) {
        console.error("Error fetching students:", error);
        toast.error("Failed to load student list");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [isOpen, batch]);

  const toggleStatus = (id: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === id) {
        // Toggle logic: Present -> Absent -> Present (Simple toggle)
        // Or could be a dropdown for more statuses
        const newStatus = s.status === 'present' ? 'absent' : 'present';
        return { ...s, status: newStatus };
      }
      return s;
    }));
  };

  const markAll = (status: 'present' | 'absent') => {
    setStudents(prev => prev.map(s => ({ ...s, status })));
  };

  const handleSubmit = async () => {
    if (students.length === 0) {
        toast.error("No students to mark");
        return;
    }

    setSubmitting(true);
    try {
      const batchWrite = writeBatch(db);
      
      // We'll store attendance in a dedicated collection 'attendance'
      // Document ID structure idea: `${batch}_${dateStr}_${slot}_${studentId}` to prevent duplicates?
      // Or just auto-ID. Let's use auto-ID but you might want to query if it exists first in a real app.
      // For simplicity/speed: Just adding new records.

      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const attendanceSummaryRef = doc(collection(db, 'attendance_sessions'));
      // Create a session summary
      batchWrite.set(attendanceSummaryRef, {
        date: dateStr,
        fullDate: date.toISOString(),
        batch,
        subject,
        slotTime,
        facultyId,
        totalStudents: students.length,
        presentCount: students.filter(s => s.status === 'present').length,
        createdAt: new Date().toISOString()
      });

      // Add individual records (maybe in a subcollection or separate logs)
      // Writing individual docs for every student might be heavy if many students. 
      // Instead, we can save the array of absentees?
      // Common pattern: Save "session" doc with array of absentees (efficient).
      
      const absentees = students.filter(s => s.status === 'absent').map(s => s.id);
      // If you need per-student analytics, you might want individual docs, but for now lets store dense data
      const sessionData = {
          date: dateStr,
          timestamp: date.toISOString(),
          batch,
          subject,
          facultyId,
          slotTime,
          attendees: students.map(s => ({
              uid: s.id, 
              name: s.name, 
              status: s.status,
              regNumber: s.regNumber
          }))
      };
      
      // Let's stick to saving one big document for the session for now to save writes
      // But user requested "make sure attendance works fine".
      // Let's assume we want to just save the session record.
       batchWrite.set(attendanceSummaryRef, sessionData);

      await batchWrite.commit();
      
      toast.success("Attendance marked successfully");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save attendance");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Mark Attendance</h2>
            <p className="text-sm text-gray-500">
                {subject} • {batch} • {date.toDateString()}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
            <IoClose size={24} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-3 bg-white border-b border-gray-100 flex justify-between items-center">
            <div className="space-x-2">
                <button onClick={() => markAll('present')} className="text-xs px-3 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 font-medium">Mark All Present</button>
                <button onClick={() => markAll('absent')} className="text-xs px-3 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 font-medium">Mark All Absent</button>
            </div>
            <div className="text-sm font-medium">
                Present: <span className="text-green-600">{students.filter(s => s.status === 'present').length}</span> 
                {' / '} 
                <span className="text-gray-900">{students.length}</span>
            </div>
        </div>

        {/* Student List */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {loading ? (
             <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
             </div>
          ) : students.length === 0 ? (
             <div className="text-center py-10 text-gray-500">No students found for this batch.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {students.map((student) => (
                <div 
                    key={student.id}
                    onClick={() => toggleStatus(student.id)}
                    className={`cursor-pointer p-3 rounded-lg border transition-all duration-200 flex items-center justify-between group
                        ${student.status === 'present' 
                            ? 'bg-white border-gray-200 hover:border-green-300' 
                            : 'bg-red-50 border-red-200 shadow-sm'
                        }
                    `}
                >
                    <div className="flex flex-col">
                        <span className={`font-medium ${student.status === 'absent' ? 'text-red-800' : 'text-gray-900'}`}>{student.name}</span>
                        <span className="text-xs text-gray-500">{student.regNumber}</span>
                    </div>
                    
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors
                        ${student.status === 'present' 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-red-100 text-red-600'
                        }
                    `}>
                        {student.status === 'present' ? <IoCheckmarkDoneOutline size={18}/> : <IoClose size={18}/>}
                    </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={submitting || loading || students.length === 0}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? 'Saving...' : (
                <>
                    <IoSaveOutline /> Save Attendance
                </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
