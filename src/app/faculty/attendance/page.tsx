"use client";
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, getDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import toast from 'react-hot-toast';

interface AttendanceAlert {
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  subjectName: string;
  percentage: number;
  threshold: number;
  canSkip: number;
  type: "warning" | "info";
}

// ── Attendance threshold alert system ──
const ATTENDANCE_THRESHOLDS = [
  { percent: 75, type: "warning" as const, message: (name: string, subj: string, pct: number, canSkip: number) =>
    `${name}, your attendance in ${subj} is now ${pct}%. You can only skip ${canSkip} more class${canSkip !== 1 ? "es" : ""} before falling below 75%.` },
  { percent: 80, type: "info" as const, message: (name: string, subj: string, pct: number) =>
    `${name}, your attendance in ${subj} has reached ${pct}%. Keep it up!` },
  { percent: 90, type: "info" as const, message: (name: string, subj: string, pct: number) =>
    `${name}, excellent! Your attendance in ${subj} is now ${pct}%.` },
];

async function checkAttendanceThresholds(
  studentId: string,
  studentName: string,
  subjectId: string,
  subjectName: string,
): Promise<AttendanceAlert[]> {
  const alerts: AttendanceAlert[] = [];
  try {
    // Fetch all attendance records for this student + subject
    const q = query(
      collection(db, "attendance"),
      where("studentId", "==", studentId),
      where("subjectId", "==", subjectId),
    );
    const snap = await getDocs(q);
    const records = snap.docs.map((d) => d.data());

    const total = records.length;
    if (total === 0) return alerts;

    const attended = records.filter((r) => r.status === "present").length;
    const percentage = Math.round((attended / total) * 100);

    // Calculate how many more classes can be skipped while maintaining 75%
    const canSkip = Math.max(0, Math.floor((attended - 0.75 * total) / 0.75));

    // Fetch student email and phone for email/SMS alerts
    let studentEmail = "";
    let studentPhone = "";
    try {
      const studentDoc = await getDoc(doc(db, "students", studentId));
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        studentEmail = data.email || "";
        studentPhone = data.phone || data.mobile || "";
      }
    } catch { /* ignore - email/SMS just won't send */ }

    // Check which thresholds are crossed
    for (const threshold of ATTENDANCE_THRESHOLDS) {
      const shouldNotify =
        (threshold.percent === 75 && percentage >= 75 && percentage <= 78) ||
        (threshold.percent !== 75 && percentage >= threshold.percent && percentage <= threshold.percent + 3);

      if (!shouldNotify) continue;

      // Check if we already sent this notification recently (within last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const existingQ = query(
        collection(db, "notifications"),
        where("targetUid", "==", studentId),
        where("thresholdKey", "==", `${subjectId}_${threshold.percent}`),
      );
      const existing = await getDocs(existingQ);
      const recentExists = existing.docs.some((d) => {
        const created = d.data().createdAt;
        if (!created) return false;
        const createdDate = typeof created === "string" ? new Date(created) : created.toDate?.() || new Date(0);
        return createdDate > weekAgo;
      });

      if (recentExists) continue;

      // Create in-app notification (Firestore)
      const title =
        threshold.percent === 75
          ? `Attendance Warning - ${subjectName}`
          : `Attendance Milestone - ${subjectName}`;

      const message =
        threshold.percent === 75
          ? threshold.message(studentName, subjectName, percentage, canSkip)
          : threshold.message(studentName, subjectName, percentage, 0);

      await addDoc(collection(db, "notifications"), {
        title,
        message,
        createdAt: new Date().toISOString(),
        read: false,
        type: threshold.type,
        audience: ["student"],
        targetUid: studentId,
        thresholdKey: `${subjectId}_${threshold.percent}`,
      });

      // Collect alert for email/SMS
      alerts.push({
        studentName,
        studentEmail,
        studentPhone,
        subjectName,
        percentage,
        threshold: threshold.percent,
        canSkip,
        type: threshold.type,
      });
    }
  } catch (err) {
    console.error("Attendance threshold check failed:", err);
  }
  return alerts;
}

export default function StudentAttendancePage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<any[]>([]);
  
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);

  // Fetch Batches and All Subjects on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Batches
        const batchSnapshot = await getDocs(collection(db, 'batches'));
        const batchList = batchSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBatches(batchList);

        // Fetch Subjects
        const subjectSnapshot = await getDocs(collection(db, 'subjects'));
        const subjectList = subjectSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSubjects(subjectList);

      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load initial data");
      }
    };
    fetchData();
  }, []);

  // Filter Subjects when Batch changes
  useEffect(() => {
    if (!selectedBatch) {
        setFilteredSubjects([]);
        return;
    }
    const currentBatch = batches.find(b => b.id === selectedBatch);
    if (!currentBatch) return;

    // Filter subjects matching Batch Department & Semester
    // Fallback to just Department if Semester not strictly matched, or show all if loose
    const relevantSubjects = subjects.filter(sub => 
        (sub.department === currentBatch.department) && 
        (sub.semester === currentBatch.semester)
    );
    
    // If no strict match found (e.g. data inconsistency), show all dept subjects or just all
    if (relevantSubjects.length > 0) {
        setFilteredSubjects(relevantSubjects);
    } else {
        // Fallback: Show all subjects from that department
        const deptSubjects = subjects.filter(sub => sub.department === currentBatch.department);
        setFilteredSubjects(deptSubjects.length > 0 ? deptSubjects : subjects);
    }
    
    // Reset selections
    setSelectedSubject('');
  }, [selectedBatch, batches, subjects]);


  // Fetch Students when Batch changes
  useEffect(() => {
    if (!selectedBatch) {
        setStudents([]);
        return;
    }

    const fetchStudents = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'students'), where('batchId', '==', selectedBatch)); 
        const querySnapshot = await getDocs(q);
        const studentList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setStudents(studentList);
        
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
  }, [selectedBatch]);

  const handleAttendanceChange = (studentId: string, status: string) => {
    setAttendanceData(prev => ({
        ...prev,
        [studentId]: status
    }));
  };

  const handleSubmit = async () => {
    if (!selectedBatch || !selectedSubject || !selectedPeriod || !attendanceDate) {
        toast.error("Please fill all fields: Batch, Subject, Period, Date");
        return;
    }

    setLoading(true);
    try {
        const subject = subjects.find(s => s.id === selectedSubject);

        // Save attendance record for each student
        const promises = students.map(student => {
            return addDoc(collection(db, 'attendance'), {
                studentId: student.id,
                studentUid: student.uid,
                studentName: student.name,
                batchId: selectedBatch,
                subjectId: selectedSubject,
                subjectName: subject?.name || 'Unknown Subject',
                period: selectedPeriod,
                date: attendanceDate,
                status: attendanceData[student.id],
                createdAt: serverTimestamp(),
                markedBy: 'Faculty' 
            });
        });

        await Promise.all(promises);
        toast.success(`Attendance marked for Period ${selectedPeriod}!`);

        // Check attendance thresholds and send notifications (background)
        (async () => {
          try {
            const thresholdResults = await Promise.all(
              students.map((student) =>
                checkAttendanceThresholds(
                  student.id,
                  student.name,
                  selectedSubject,
                  subject?.name || "Unknown Subject",
                )
              )
            );

            // Collect all alerts from all students
            const allAlerts = thresholdResults.flat();
            if (allAlerts.length === 0) return;

            // Send email + SMS via API route
            fetch("/api/attendance-alerts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ alerts: allAlerts }),
            }).catch((err) => console.error("Alert API error:", err));
          } catch (err) {
            console.error("Threshold check error:", err);
          }
        })();
        
    } catch (error) {
        console.error("Error saving attendance:", error);
        toast.error("Failed to save attendance");
    } finally {
        setLoading(false);
    }
  };

  const periods = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">Mark Student Attendance</h1>

        {/* Controls */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 items-end">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Batch</label>
                <select 
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="w-full min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="">-- Select Batch --</option>
                    {batches.map(batch => (
                        <option key={batch.id} value={batch.id}>{batch.name}</option>
                    ))}
                </select>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Subject</label>
                <select 
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    disabled={!selectedBatch}
                    className="w-full min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                    <option value="">-- Select Subject --</option>
                    {filteredSubjects.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                <select 
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full min-w-[150px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="">-- Period --</option>
                    {periods.map(p => (
                        <option key={p} value={p}>Period {p}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input 
                    type="date" 
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="w-full min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
        </div>

        {/* Student List */}
        {selectedBatch && selectedSubject && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden animate-in fade-in duration-500">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Loading students...</div>
                ) : students.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">No students found in this batch.</div>
                ) : (
                    <>
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-700">Student List</h3>
                        <span className="text-sm text-gray-500">Total Students: {students.length}</span>
                    </div>
                    <div className="overflow-x-auto">
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
                                            <label className="flex items-center space-x-2 cursor-pointer group">
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${attendanceData[student.id] === 'Present' ? 'border-green-600 bg-green-600' : 'border-gray-400'}`}>
                                                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                                </div>
                                                <input 
                                                    type="radio" 
                                                    name={`attendance-${student.id}`} 
                                                    value="Present" 
                                                    checked={attendanceData[student.id] === 'Present'}
                                                    onChange={() => handleAttendanceChange(student.id, 'Present')}
                                                    className="hidden"
                                                />
                                                <span className={`text-sm group-hover:text-gray-900 ${attendanceData[student.id] === 'Present' ? 'text-green-700 font-medium' : 'text-gray-500'}`}>Present</span>
                                            </label>

                                            <label className="flex items-center space-x-2 cursor-pointer group">
                                                 <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${attendanceData[student.id] === 'Absent' ? 'border-red-600 bg-red-600' : 'border-gray-400'}`}>
                                                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                                </div>
                                                <input 
                                                    type="radio" 
                                                    name={`attendance-${student.id}`} 
                                                    value="Absent" 
                                                    checked={attendanceData[student.id] === 'Absent'}
                                                    onChange={() => handleAttendanceChange(student.id, 'Absent')}
                                                    className="hidden"
                                                />
                                                <span className={`text-sm group-hover:text-gray-900 ${attendanceData[student.id] === 'Absent' ? 'text-red-700 font-medium' : 'text-gray-500'}`}>Absent</span>
                                            </label>

                                             <label className="flex items-center space-x-2 cursor-pointer group">
                                                 <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${attendanceData[student.id] === 'Late' ? 'border-yellow-500 bg-yellow-500' : 'border-gray-400'}`}>
                                                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                                </div>
                                                <input 
                                                    type="radio" 
                                                    name={`attendance-${student.id}`} 
                                                    value="Late" 
                                                    checked={attendanceData[student.id] === 'Late'}
                                                    onChange={() => handleAttendanceChange(student.id, 'Late')}
                                                    className="hidden"
                                                />
                                                <span className={`text-sm group-hover:text-gray-900 ${attendanceData[student.id] === 'Late' ? 'text-yellow-700 font-medium' : 'text-gray-500'}`}>Late</span>
                                            </label>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                    <div className="p-4 md:p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
                        <button 
                            onClick={handleSubmit}
                            disabled={loading || !selectedPeriod}
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
