'use client';

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'

interface Assignment {
  id: string;
  student: string;
  regNumber: string;
  assignmentName: string;
  submittedDate: string;
  marks: number | null;
  maxMarks: number;
  status: 'pending' | 'evaluated' | 'late';
  facultyId: string;
}

interface InternalMark {
  id: string;
  student: string;
  regNumber: string;
  subject: string;
  marks: number | null;
  maxMarks: number;
  status: 'entered' | 'pending';
  facultyId: string;
}

interface ExamStatus {
  id: string;
  examName: string;
  batch: string;
  evaluatedStudents: number;
  totalStudents: number;
  status: 'in_progress' | 'completed' | 'pending';
  facultyId: string;
}

interface StudentReport {
  id: string;
  student: string;
  regNumber: string;
  subject: string;
  overallGrade: string;
  cgpa: number;
  status: 'passed' | 'failed' | 'pending';
  facultyId: string;
}

interface Deadline {
  id: string;
  evaluationType: string;
  dueDate: string;
  status: 'upcoming' | 'overdue' | 'completed';
  facultyId: string;
}

export default function page() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'assignments' | 'internal' | 'exams' | 'reports' | 'grades' | 'deadlines'>('assignments')

  // Data States
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [internalMarks, setInternalMarks] = useState<InternalMark[]>([])
  const [examStatuses, setExamStatuses] = useState<ExamStatus[]>([])
  const [studentReports, setStudentReports] = useState<StudentReport[]>([])
  const [deadlines, setDeadlines] = useState<Deadline[]>([])

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // Fetch all collections in parallel (simplified for this view)
    const unsubAssignments = onSnapshot(query(collection(db, 'evaluation_assignments'), where('facultyId', '==', user.uid)), (snap) => {
        setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment)));
    });

    const unsubInternals = onSnapshot(query(collection(db, 'evaluation_internals'), where('facultyId', '==', user.uid)), (snap) => {
        setInternalMarks(snap.docs.map(d => ({ id: d.id, ...d.data() } as InternalMark)));
    });

    const unsubExams = onSnapshot(query(collection(db, 'evaluation_exams'), where('facultyId', '==', user.uid)), (snap) => {
        setExamStatuses(snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamStatus)));
    });

    const unsubReports = onSnapshot(query(collection(db, 'evaluation_reports'), where('facultyId', '==', user.uid)), (snap) => {
        setStudentReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentReport)));
    });

    const unsubDeadlines = onSnapshot(query(collection(db, 'evaluation_deadlines'), where('facultyId', '==', user.uid)), (snap) => {
        setDeadlines(snap.docs.map(d => ({ id: d.id, ...d.data() } as Deadline)));
        setLoading(false);
    });

    return () => {
        unsubAssignments();
        unsubInternals();
        unsubExams();
        unsubReports();
        unsubDeadlines();
    }
  }, [user]);

  const updateMark = async (collectionName: string, id: string, marks: number, maxMarks: number, type: 'assignment' | 'internal') => {
      try {
          if (marks > maxMarks) {
              toast.error(`Marks cannot exceed ${maxMarks}`);
              return;
          }
          await updateDoc(doc(db, collectionName, id), {
              marks: marks,
              status: type === 'assignment' ? 'evaluated' : 'entered'
          });
          toast.success("Marks updated");
      } catch (error) {
          console.error(error);
          toast.error("Failed to update marks");
      }
  }

  const seedData = async () => {
      if (!user) return;
      if (!confirm("This will add sample data to your evaluation dashboard. Continue?")) return;
      
      try {
          // Seed Assignments
          await addDoc(collection(db, 'evaluation_assignments'), {
              facultyId: user.uid,
              student: 'Alice Johnson', regNumber: '2023CSE001', assignmentName: 'React Project', submittedDate: '2025-12-20', marks: null, maxMarks: 20, status: 'pending'
          });
          await addDoc(collection(db, 'evaluation_assignments'), {
              facultyId: user.uid,
              student: 'Bob Smith', regNumber: '2023CSE002', assignmentName: 'React Project', submittedDate: '2025-12-21', marks: 18, maxMarks: 20, status: 'evaluated'
          });

          // Seed Internals
          await addDoc(collection(db, 'evaluation_internals'), {
              facultyId: user.uid,
              student: 'Alice Johnson', regNumber: '2023CSE001', subject: 'Web Development', marks: null, maxMarks: 25, status: 'pending'
          });
          
          toast.success("Sample data added!");
      } catch (error) {
          console.error(error);
          toast.error("Failed to seed data");
      }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'evaluated':
      case 'entered':
      case 'completed':
      case 'passed':
      case 'upcoming': return 'bg-green-100 text-green-800';
      case 'pending':
      case 'in_progress':
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const tabs = [
    { key: 'assignments', label: 'Assignments' },
    { key: 'internal', label: 'Internal Marks' },
    { key: 'exams', label: 'Exam Status' },
    { key: 'reports', label: 'Student Reports' },
    { key: 'grades', label: 'Grade Submission' },
    { key: 'deadlines', label: 'Deadlines' },
  ] as const

  const QuickActions = () => (
    <div className="flex flex-wrap gap-4 mb-6">
      <div className="flex space-x-1 border-b">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              selectedTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <button onClick={seedData} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
         + Seed Test Data
      </button>
      <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
        Submit All Grades
      </button>
    </div>
  )

  const totalPending = assignments.filter(a => a.status === 'pending').length + internalMarks.filter(m => m.status === 'pending').length
  const totalEvaluated = assignments.filter(a => a.status === 'evaluated').length + internalMarks.filter(m => m.status === 'entered').length
  const overdueDeadlines = deadlines.filter(d => d.status === 'overdue').length

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Evaluation Management</h1>
          <p className="text-gray-600 mt-2">Manage academic assessments and student performance.</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Content based on tab */}
        {selectedTab === 'assignments' ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Assignment Evaluation</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reg No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignments.length === 0 && <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">No assignments found. Use 'Seed Test Data' to add sample.</td></tr>}
                  {assignments.map((assign) => (
                    <tr key={assign.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{assign.student}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assign.regNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{assign.assignmentName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assign.submittedDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          defaultValue={assign.marks || ''}
                          onBlur={(e) => updateMark('evaluation_assignments', assign.id, parseFloat(e.target.value), assign.maxMarks, 'assignment')}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="0"
                          max={assign.maxMarks}
                        />
                        <span className="text-sm text-gray-500 ml-1">/{assign.maxMarks}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assign.status)}`}>
                          {assign.status.charAt(0).toUpperCase() + assign.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : selectedTab === 'internal' ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Internal Marks Entry</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reg No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marks (/25)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {internalMarks.length === 0 && <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No internal marks pending.</td></tr>}
                  {internalMarks.map((mark) => (
                    <tr key={mark.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{mark.student}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mark.regNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{mark.subject}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          defaultValue={mark.marks || ''}
                          onBlur={(e) => updateMark('evaluation_internals', mark.id, parseFloat(e.target.value), mark.maxMarks, 'internal')}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="0"
                          max={mark.maxMarks}
                        />
                        <span className="text-sm text-gray-500 ml-1">/{mark.maxMarks}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(mark.status)}`}>
                          {mark.status.charAt(0).toUpperCase() + mark.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : selectedTab === 'exams' ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Exam Valuation Status</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evaluated / Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {examStatuses.length === 0 && <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No exams active.</td></tr>}
                  {examStatuses.map((exam) => (
                    <tr key={exam.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exam.examName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exam.batch}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exam.evaluatedStudents}/{exam.totalStudents}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(exam.status)}`}>
                          {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : selectedTab === 'reports' ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Student Performance Reports</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reg No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CGPA</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {studentReports.length === 0 && <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No reports available.</td></tr>}
                  {studentReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{report.student}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{report.regNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{report.subject}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{report.overallGrade}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{report.cgpa}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : selectedTab === 'grades' ? (
          <div className="bg-white rounded-lg shadow-md mb-8 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Grade Submission Controls</h2>
            <p className="text-gray-600 mb-4">All grades are up to date. No pending submissions.</p>
            <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              Submit Grades for Semester
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Evaluation Deadlines</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evaluation Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deadlines.length === 0 && <tr><td colSpan={3} className="px-6 py-4 text-center text-gray-500">No deadlines.</td></tr>}
                  {deadlines.map((deadline) => (
                    <tr key={deadline.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{deadline.evaluationType}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{deadline.dueDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(deadline.status)}`}>
                          {deadline.status.charAt(0).toUpperCase() + deadline.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pending Evaluations</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalPending}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Evaluated Items</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalEvaluated}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Overdue Deadlines</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{overdueDeadlines}</p>
          </div>
        </div>
      </div>
    </div>
  )
}