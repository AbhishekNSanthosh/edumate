"use client";
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import toast from 'react-hot-toast';
import { IoClose, IoSaveOutline, IoCheckmarkDoneOutline } from 'react-icons/io5';
import { FiSearch } from 'react-icons/fi';

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
  batch: string;         // display name
  batchId?: string;      // raw document ID (for fallbacks)
  department?: string;   // batch.department
  academicYear?: string; // batch.academicYear
  subject: string;
  date: Date;
  slotTime: string;
  facultyId: string;
}

export default function MarkAttendanceModal({ 
  isOpen, onClose, batch, batchId, department, academicYear, 
  subject, date, slotTime, facultyId 
}: MarkAttendanceModalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [isTutor, setIsTutor] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null);
  const [existingAttendees, setExistingAttendees] = useState<Student[]>([]);

  // Check if attendance is already marked
  useEffect(() => {
    if (!isOpen) return;
    const checkExisting = async () => {
      try {
        const dateStr = date.toISOString().split('T')[0];
        const q = query(
          collection(db, 'attendance_sessions'),
          where('batch', '==', batch),
          where('subject', '==', subject),
          where('date', '==', dateStr),
          where('slotTime', '==', slotTime)
        );
        const snap = await getDocs(q);
        
        if (!snap.empty) {
           const sessionDoc = snap.docs[0];
           setAlreadyMarked(true);
           setExistingSessionId(sessionDoc.id);
           const att: any[] = sessionDoc.data().attendees || [];
           setExistingAttendees(att.map(a => ({
               id: a.uid || a.id,
               name: a.name,
               regNumber: a.regNumber || "",
               rollNumber: a.rollNumber || "",
               status: a.status
           })));
        }

        // Verify if user is tutor
        let tutorOfThisBatch = false;
        try {
           const facQ = query(collection(db, 'faculty'), where('authUid', '==', facultyId));
           const facSnap = await getDocs(facQ);
           const fDocKey = facSnap.empty ? "" : facSnap.docs[0].id;
           const fDocName = facSnap.empty ? "" : facSnap.docs[0].data().name;

           const batchCollectionQ = query(collection(db, 'batches'), where('name', '==', batch));
           const batchSnap = await getDocs(batchCollectionQ);
           if (!batchSnap.empty) {
               const bData = batchSnap.docs[0].data();
               if (
                  bData.tutorId === facultyId ||
                  bData.tutorId === fDocKey ||
                  bData.tutor === fDocName ||
                  (Array.isArray(bData.tutors) && bData.tutors.some((t:any) => t.id === fDocKey || t.id === facultyId || t.name === fDocName))
               ) {
                  tutorOfThisBatch = true;
               }
           }
        } catch (e) {
           console.error("Tutor resolution error", e);
        }
        setIsTutor(tutorOfThisBatch);

      } catch (err) {
        console.error("Error checking existing attendance", err);
      }
    };
    checkExisting();
  }, [isOpen, batch, subject, date, slotTime, facultyId]);

  // Load students for the batch
  useEffect(() => {
    if (!isOpen || alreadyMarked || editMode) return;

    const fetchStudents = async () => {
      setLoading(true);
      try {
        const normalizeDept = (d: string) =>
          d.toLowerCase()
           .replace(/\s*&amp;\s*/g, " and ")
           .replace(/\s*&\s*/g, " and ")
           .replace(/\s+/g, " ")
           .trim();

        const normTarget = department ? normalizeDept(department) : "";
        const deptMatch = (s: any) =>
          !s.department || normalizeDept(s.department) === normTarget;

        let list: any[] = [];

        // Primary: batch == academicYear
        if (academicYear) {
          const snap = await getDocs(
            query(collection(db, "students"), where("batch", "==", academicYear))
          );
          list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(deptMatch);
        }

        // Fallback A: batch == batchName
        if (list.length === 0) {
          const snapA = await getDocs(
            query(collection(db, "students"), where("batch", "==", batch))
          );
          list = snapA.docs.map(d => ({ id: d.id, ...d.data() })).filter(deptMatch);
        }

        // Fallback B: batchId == batch doc id
        if (list.length === 0 && batchId) {
          const snapB = await getDocs(
            query(collection(db, "students"), where("batchId", "==", batchId))
          );
          list = snapB.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        // Fallback C: full scan (dept match only)
        if (list.length === 0 && department) {
          const all = await getDocs(collection(db, "students"));
          list = all.docs.map(d => ({ id: d.id, ...d.data() })).filter(deptMatch);
        }

        // Add 'present' status and map to Student interface
        const fetchedStudents: Student[] = list.map(studentData => ({
          id: studentData.id || studentData.uid,
          name: studentData.name,
          regNumber: studentData.regNumber,
          rollNumber: studentData.rollNumber,
          status: 'present'
        }));

        fetchedStudents.sort((a, b) => 
          String(a.rollNumber || a.regNumber || "").localeCompare(String(b.rollNumber || b.regNumber || ""))
        );

        setStudents(fetchedStudents);
      } catch (error) {
        console.error("Error fetching students:", error);
        toast.error("Failed to load student list");
      } finally {
        setLoading(false);
      }
    };

    if (!alreadyMarked && !editMode) {
      fetchStudents();
    }
  }, [isOpen, batch, batchId, department, academicYear, alreadyMarked, editMode]);

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    student.regNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (student.rollNumber && student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
    if (searchQuery.trim() !== '') {
      // Create a Set of visible student IDs in O(n)
      const visibleIds = new Set(filteredStudents.map(s => s.id));
      setStudents(prev => prev.map(s => visibleIds.has(s.id) ? { ...s, status } : s));
    } else {
      setStudents(prev => prev.map(s => ({ ...s, status })));
    }
  };

  const handleSubmit = async () => {
    if (students.length === 0) {
        toast.error("No students to mark");
        return;
    }

    setSubmitting(true);
    try {
      const batchWrite = writeBatch(db);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const attendanceSummaryRef = editMode && existingSessionId
         ? doc(db, 'attendance_sessions', existingSessionId)
         : doc(collection(db, 'attendance_sessions'));
      
      // Save session data
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
      
      // If we are editing, we are updating the existing doc
      if (editMode && existingSessionId) {
          batchWrite.update(attendanceSummaryRef, sessionData);
      } else {
          batchWrite.set(attendanceSummaryRef, sessionData);
      }

      // If in editMode, logically delete all old individual attendance records to prevent duplicates
      if (editMode) {
         const oldR = await getDocs(query(
            collection(db, 'attendance'),
            where('date', '==', dateStr),
            where('subjectName', '==', subject),
            where('period', '==', slotTime),
            where('batchName', '==', batch)
         ));
         oldR.forEach(d => batchWrite.delete(d.ref));
      }

      // Save individual student attendance records for the calendar view
      students.forEach(student => {
        const studentRecordRef = doc(collection(db, 'attendance'));
        
        // Capitalize status ("Present", "Absent" etc) to match calendar UI requirements
        const capitalizedStatus = 
          student.status === 'present' ? 'Present' : 
          student.status === 'absent' ? 'Absent' : 
          student.status === 'late' ? 'Late' : 
          student.status === 'excused' ? 'DutyLeave' : 'Absent';

        batchWrite.set(studentRecordRef, {
          studentId: student.id,
          studentName: student.name,
          date: dateStr,
          subjectName: subject,
          subjectId: subject, // Usually name and ID are somewhat equated in this simple UI
          period: slotTime,
          status: capitalizedStatus,
          batchName: batch,
          facultyId: facultyId,
          createdAt: new Date().toISOString()
        });
      });

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
      <div className="bg-white rounded-sm shadow-none border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
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

        {/* Toolbar & Status Area */}
        {alreadyMarked && !editMode ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-gray-50">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <IoCheckmarkDoneOutline size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Attendance Already Marked!</h3>
              <p className="text-gray-500 text-center max-w-md mb-6 leading-relaxed">
                Attendance for this specific batch, subject, and time slot has already been submitted.
                <br />
                {!isTutor && (
                   <span className="text-red-500 font-medium block mt-2">
                     Note: Only the assigned Tutor of this batch can modify attendance once it has been marked.
                   </span>
                )}
              </p>
              {isTutor && (
                 <button
                   onClick={() => {
                      setEditMode(true);
                      setStudents(existingAttendees);
                   }}
                   className="px-6 py-2 bg-blue-600 text-white font-medium rounded-sm hover:bg-blue-700 transition shadow-sm"
                 >
                   Edit Attendance (Tutor Access)
                 </button>
              )}
            </div>
        ) : (
          <>
            <div className="p-4 bg-white border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <button onClick={() => markAll('present')} className="text-xs px-4 py-2 bg-green-50 text-green-700 rounded-sm hover:bg-green-100 font-medium border border-green-200 transition-colors whitespace-nowrap">
                      Mark All Present
                    </button>
                    <button onClick={() => markAll('absent')} className="text-xs px-4 py-2 bg-red-50 text-red-700 rounded-sm hover:bg-red-100 font-medium border border-red-200 transition-colors whitespace-nowrap">
                      Mark All Absent
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                  {/* Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search name, reg number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium placeholder-gray-400"
                    />
                  </div>

                  <div className="text-sm font-medium shrink-0 bg-blue-50 px-3 py-1.5 rounded-sm border border-blue-100 text-blue-800">
                      Present: <span className="text-green-600 font-bold ml-1">{students.filter(s => s.status === 'present').length}</span> 
                      <span className="text-blue-300 mx-1.5">/</span> 
                      <span className="font-bold">{students.length}</span>
                  </div>
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
              ) : filteredStudents.length === 0 ? (
                 <div className="text-center py-10 text-gray-500">No students match your search filter.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredStudents.map((student) => (
                    <div 
                        key={student.id}
                        onClick={() => toggleStatus(student.id)}
                        className={`cursor-pointer p-3 rounded-lg border transition-all duration-200 flex items-center justify-between group select-none
                            ${student.status === 'present' 
                                ? 'bg-white border-gray-200 hover:border-green-300' 
                                : 'bg-red-50 border-red-200 shadow-sm'
                            }
                        `}
                    >
                        <div className="flex flex-col">
                            <span className={`font-medium ${student.status === 'absent' ? 'text-red-800' : 'text-gray-900'}`}>{student.name}</span>
                            <span className="text-xs text-gray-500 font-medium">
                              {student.regNumber}
                              {student.rollNumber ? ` • Roll ${student.rollNumber}` : ''}
                            </span>
                        </div>
                        
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors
                            ${student.status === 'present' 
                                ? 'bg-green-100 text-green-600 group-hover:bg-green-200' 
                                : 'bg-red-100 text-red-600 group-hover:bg-red-200'
                            }
                        `}>
                            {student.status === 'present' ? <IoCheckmarkDoneOutline size={18}/> : <IoClose size={18}/>}
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition"
          >
            {alreadyMarked ? "Close" : "Cancel"}
          </button>
          {!alreadyMarked && (
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
          )}
        </div>

      </div>
    </div>
  );
}
