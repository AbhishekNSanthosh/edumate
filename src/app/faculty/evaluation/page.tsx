'use client';

import React, { useState } from 'react'

interface Assignment {
  id: number;
  student: string;
  regNumber: string;
  assignmentName: string;
  submittedDate: string;
  marks: number | null;
  maxMarks: number;
  status: 'pending' | 'evaluated' | 'late';
}

interface InternalMark {
  id: number;
  student: string;
  regNumber: string;
  subject: string;
  marks: number | null;
  maxMarks: number;
  status: 'entered' | 'pending';
}

interface ExamStatus {
  id: number;
  examName: string;
  batch: string;
  evaluatedStudents: number;
  totalStudents: number;
  status: 'in_progress' | 'completed' | 'pending';
}

interface StudentReport {
  id: number;
  student: string;
  regNumber: string;
  subject: string;
  overallGrade: string;
  cgpa: number;
  status: 'passed' | 'failed' | 'pending';
}

interface Deadline {
  id: number;
  evaluationType: string;
  dueDate: string;
  status: 'upcoming' | 'overdue' | 'completed';
}

export default function page() {
  const [selectedTab, setSelectedTab] = useState<'assignments' | 'internal' | 'exams' | 'reports' | 'grades' | 'deadlines'>('assignments')

  // Sample data - in a real app, this would come from an API
  const assignments: Assignment[] = [
    { id: 1, student: 'John Doe', regNumber: '2022CSE001', assignmentName: 'Project Report', submittedDate: 'Dec 25, 2025', marks: null, maxMarks: 20, status: 'pending' },
    { id: 2, student: 'Jane Smith', regNumber: '2023MATH001', assignmentName: 'Problem Set', submittedDate: 'Dec 28, 2025', marks: 18, maxMarks: 20, status: 'evaluated' },
    { id: 3, student: 'Mike Wilson', regNumber: '2021PHYS001', assignmentName: 'Lab Report', submittedDate: 'Dec 20, 2025', marks: null, maxMarks: 20, status: 'late' },
  ]

  const internalMarks: InternalMark[] = [
    { id: 1, student: 'John Doe', regNumber: '2022CSE001', subject: 'Data Structures', marks: null, maxMarks: 25, status: 'pending' },
    { id: 2, student: 'Jane Smith', regNumber: '2023MATH001', subject: 'Calculus II', marks: 22, maxMarks: 25, status: 'entered' },
    { id: 3, student: 'Mike Wilson', regNumber: '2021PHYS001', subject: 'Physics Lab', marks: null, maxMarks: 25, status: 'pending' },
  ]

  const examStatuses: ExamStatus[] = [
    { id: 1, examName: 'Midterm - Data Structures', batch: 'CSE 2022-26', evaluatedStudents: 20, totalStudents: 30, status: 'in_progress' },
    { id: 2, examName: 'Final - Algorithms', batch: 'CSE 2023-27', evaluatedStudents: 28, totalStudents: 28, status: 'completed' },
    { id: 3, examName: 'Quiz - Physics', batch: 'PHYS 2021-25', evaluatedStudents: 0, totalStudents: 25, status: 'pending' },
  ]

  const studentReports: StudentReport[] = [
    { id: 1, student: 'John Doe', regNumber: '2022CSE001', subject: 'Data Structures', overallGrade: 'A', cgpa: 3.8, status: 'passed' },
    { id: 2, student: 'Jane Smith', regNumber: '2023MATH001', subject: 'Calculus II', overallGrade: 'B+', cgpa: 3.5, status: 'passed' },
    { id: 3, student: 'Mike Wilson', regNumber: '2021PHYS001', subject: 'Physics', overallGrade: 'C', cgpa: 2.7, status: 'passed' },
  ]

  const deadlines: Deadline[] = [
    { id: 1, evaluationType: 'Assignment Evaluation', dueDate: 'Jan 5, 2026', status: 'upcoming' },
    { id: 2, evaluationType: 'Internal Marks Entry', dueDate: 'Jan 10, 2026', status: 'upcoming' },
    { id: 3, evaluationType: 'Exam Valuation', dueDate: 'Dec 25, 2025', status: 'overdue' },
  ]

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
      <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
        Submit All Grades
      </button>
      <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
        Export Reports
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marks (/20)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignments.map((assign) => (
                    <tr key={assign.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{assign.student}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assign.regNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{assign.assignmentName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assign.submittedDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={assign.marks || ''}
                          onChange={() => {}} // Handle change
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="0"
                          max={assign.maxMarks}
                        />
                        /{assign.maxMarks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assign.status)}`}>
                          {assign.status.charAt(0).toUpperCase() + assign.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">Evaluate</button>
                        <button className="text-green-600 hover:text-green-900">Save</button>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {internalMarks.map((mark) => (
                    <tr key={mark.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{mark.student}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{mark.regNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{mark.subject}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={mark.marks || ''}
                          onChange={() => {}} // Handle change
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="0"
                          max={mark.maxMarks}
                        />
                        /{mark.maxMarks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(mark.status)}`}>
                          {mark.status.charAt(0).toUpperCase() + mark.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-green-600 hover:text-green-900">Save</button>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">View Papers</button>
                        <button className="text-green-600 hover:text-green-900">Start Evaluation</button>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">View Report</button>
                        <button className="text-green-600 hover:text-green-900">Download</button>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deadlines.map((deadline) => (
                    <tr key={deadline.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{deadline.evaluationType}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{deadline.dueDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(deadline.status)}`}>
                          {deadline.status.charAt(0).toUpperCase() + deadline.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">View Details</button>
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