'use client';

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'

interface ExamTimetable {
  id: string;
  examName: string;
  date: string;
  time: string;
  batch: string;
  room: string;
  status: 'upcoming' | 'ongoing' | 'completed';
}

interface ExamDuty {
  id: string;
  facultyId: string;
  type: 'invigilation' | 'valuation';
  examName: string;
  date?: string;
  time?: string;
  room?: string; // Invigilation only
  batch?: string; // Valuation only
  totalPapers?: number; // Valuation only
  assignedPapers?: number; // Valuation only
  status: 'assigned' | 'completed' | 'pending' | 'in_progress';
}

export default function page() {
  const { user } = useAuth()
  const [examTimetable, setExamTimetable] = useState<ExamTimetable[]>([])
  const [invigilationDuties, setInvigilationDuties] = useState<ExamDuty[]>([])
  const [valuationAssignments, setValuationAssignments] = useState<ExamDuty[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingPaper, setUploadingPaper] = useState(false)

  // Fetch Exam Data
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // 1. Fetch Global Exam Timetable
    const qTimetable = query(collection(db, 'exam_schedule'));
    const unsubTimetable = onSnapshot(qTimetable, (snapshot) => {
        const exams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamTimetable));
        // Client-side sort if needed
        setExamTimetable(exams);
    });

    // 2. Fetch My Duties
    const qDuties = query(collection(db, 'faculty_exam_duties'), where('facultyId', '==', user.uid));
    const unsubDuties = onSnapshot(qDuties, (snapshot) => {
        const duties = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamDuty));
        setInvigilationDuties(duties.filter(d => d.type === 'invigilation'));
        setValuationAssignments(duties.filter(d => d.type === 'valuation'));
        setLoading(false);
    });

    return () => {
        unsubTimetable();
        unsubDuties();
    };
  }, [user]);

  const handleSeedExamData = async () => {
      if (!user) return;
      if (!confirm("Seed default exam data?")) return;

      try {
          // Seed Global Schedule
          const schedule = [
            { examName: 'Midterm - Data Structures', date: 'Jan 5, 2026', time: '10:00 AM - 12:00 PM', batch: 'CSE 2022-26', room: 'Hall A', status: 'upcoming' },
            { examName: 'Final - Algorithms', date: 'Jan 10, 2026', time: '09:00 AM - 11:00 AM', batch: 'CSE 2023-27', room: 'Hall B', status: 'upcoming' },
            { examName: 'Quiz - Physics', date: 'Dec 30, 2025', time: '02:00 PM - 03:00 PM', batch: 'PHYS 2021-25', room: 'Lab 101', status: 'completed' },
          ];

          for (const s of schedule) {
              await addDoc(collection(db, 'exam_schedule'), s);
          }

          // Seed My Duties
          const duties = [
             {
                 facultyId: user.uid, type: 'invigilation',
                 examName: 'Midterm - Data Structures', date: 'Jan 5, 2026', time: '10:00 AM - 12:00 PM', room: 'Hall A', status: 'assigned'
             },
             {
                 facultyId: user.uid, type: 'valuation',
                 examName: 'Final - Algorithms', batch: 'CSE 2023-27', totalPapers: 30, assignedPapers: 10, status: 'pending'
             }
          ];

          for (const d of duties) {
              await addDoc(collection(db, 'faculty_exam_duties'), d);
          }

          toast.success("Exam data seeded successfully");
      } catch (e) {
          console.error(e);
          toast.error("Failed to seed exam data");
      }
  }

  const handleUpdateStatus = async (dutyId: string, newStatus: string) => {
      try {
          await updateDoc(doc(db, 'faculty_exam_duties', dutyId), { status: newStatus });
          toast.success(`Status updated to ${newStatus}`);
      } catch (error) {
          console.error(error);
          toast.error("Failed to update status");
      }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
      case 'assigned':
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'ongoing':
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const handleUploadPaper = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadingPaper(true)
      // Simulate upload
      setTimeout(() => {
          setUploadingPaper(false);
          toast.success("Question paper uploaded successfully");
      }, 2000)
    }
  }

  const handleDownloadTimetable = () => {
      toast.success("Downloading exam timetable...");
  }

  const handleMarkAttendanceMock = () => {
      toast.success("Redirecting to exam attendance interface...");
  }

  const QuickActions = () => (
    <div className="flex flex-wrap gap-4 mb-6">
      <label className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-center ${
        uploadingPaper ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'
      }`}>
        {uploadingPaper ? 'Uploading...' : 'Upload Question Paper'}
        <input type="file" accept=".pdf" onChange={handleUploadPaper} className="hidden" disabled={uploadingPaper} />
      </label>
      <button 
        onClick={handleMarkAttendanceMock}
        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
        Mark Attendance
      </button>
      <button 
        onClick={handleDownloadTimetable}
        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
        Download Timetable
      </button>
      {process.env.NODE_ENV === 'development' && examTimetable.length === 0 && (
          <button 
            onClick={handleSeedExamData}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
            + Seed Exam Data
          </button>
      )}
    </div>
  )

  const totalUpcoming = examTimetable.filter(e => e.status === 'upcoming').length
  const assignedDutiesCount = invigilationDuties.filter(d => d.status === 'assigned').length
  const pendingValuationsCount = valuationAssignments.filter(v => v.status === 'pending' || v.status === 'in_progress').length

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Exam Responsibilities</h1>
          <p className="text-gray-600 mt-2">Manage your exam-related duties and schedules.</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Exam Timetable */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Exam Timetable</h2>
          </div>
          <div className="overflow-x-auto">
             {loading ? <div className="p-8 text-center text-gray-500">Loading schedule...</div> :
             examTimetable.length === 0 ? <div className="p-8 text-center text-gray-500">No exams scheduled.</div> : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {examTimetable.map((exam) => (
                  <tr key={exam.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exam.examName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exam.date}<br/>{exam.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exam.batch}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exam.room}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(exam.status)}`}>
                        {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>

        {/* Invigilation Duties */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Invigilation Duties</h2>
          </div>
          <div className="overflow-x-auto">
            {invigilationDuties.length === 0 ? <div className="p-8 text-center text-gray-500">No invigilation duties assigned.</div> : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invigilationDuties.map((duty) => (
                  <tr key={duty.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{duty.examName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{duty.date}<br/>{duty.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{duty.room}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(duty.status)}`}>
                        {duty.status.charAt(0).toUpperCase() + duty.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {duty.status === 'assigned' && (
                          <button 
                            onClick={() => handleUpdateStatus(duty.id, 'completed')}
                            className="text-green-600 hover:text-green-900">
                            Mark Complete
                          </button>
                      )}
                      {duty.status === 'completed' && <span className="text-gray-400">Done</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>

        {/* Valuation Assignments */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Valuation Assignments</h2>
          </div>
          <div className="overflow-x-auto">
            {valuationAssignments.length === 0 ? <div className="p-8 text-center text-gray-500">No valuation duties assigned.</div> : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total / Assigned</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {valuationAssignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{assignment.examName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assignment.batch}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assignment.assignedPapers}/{assignment.totalPapers}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                        {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1).replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {assignment.status === 'pending' && (
                          <button 
                            onClick={() => handleUpdateStatus(assignment.id, 'in_progress')}
                            className="text-blue-600 hover:text-blue-900">
                            Start Valuation
                          </button>
                      )}
                      {assignment.status === 'in_progress' && (
                          <button 
                            onClick={() => handleUpdateStatus(assignment.id, 'completed')}
                            className="text-green-600 hover:text-green-900">
                            Mark Complete
                          </button>
                      )}
                      {assignment.status === 'completed' && <span className="text-gray-400">Done</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Upcoming Exams</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalUpcoming}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Assigned Duties</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{assignedDutiesCount}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pending Valuations</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{pendingValuationsCount}</p>
            </div>
            </div>
        )}
      </div>
    </div>
  )
}