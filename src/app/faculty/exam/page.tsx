'use client';

import React, { useState } from 'react'

interface ExamTimetable {
  id: number;
  examName: string;
  date: string;
  time: string;
  batch: string;
  room: string;
  status: 'upcoming' | 'ongoing' | 'completed';
}

interface InvigilationDuty {
  id: number;
  examName: string;
  date: string;
  time: string;
  room: string;
  status: 'assigned' | 'completed';
}

interface ValuationAssignment {
  id: number;
  examName: string;
  batch: string;
  totalPapers: number;
  assignedPapers: number;
  status: 'pending' | 'in_progress' | 'completed';
}

export default function page() {
  const [uploadingPaper, setUploadingPaper] = useState(false)

  // Sample data - in a real app, this would come from an API
  const examTimetable: ExamTimetable[] = [
    { id: 1, examName: 'Midterm - Data Structures', date: 'Jan 5, 2026', time: '10:00 AM - 12:00 PM', batch: 'CSE 2022-26', room: 'Hall A', status: 'upcoming' },
    { id: 2, examName: 'Final - Algorithms', date: 'Jan 10, 2026', time: '09:00 AM - 11:00 AM', batch: 'CSE 2023-27', room: 'Hall B', status: 'upcoming' },
    { id: 3, examName: 'Quiz - Physics', date: 'Dec 30, 2025', time: '02:00 PM - 03:00 PM', batch: 'PHYS 2021-25', room: 'Lab 101', status: 'completed' },
  ]

  const invigilationDuties: InvigilationDuty[] = [
    { id: 1, examName: 'Midterm - Data Structures', date: 'Jan 5, 2026', time: '10:00 AM - 12:00 PM', room: 'Hall A', status: 'assigned' },
    { id: 2, examName: 'Quiz - Physics', date: 'Dec 30, 2025', time: '02:00 PM - 03:00 PM', room: 'Lab 101', status: 'completed' },
  ]

  const valuationAssignments: ValuationAssignment[] = [
    { id: 1, examName: 'Final - Algorithms', batch: 'CSE 2023-27', totalPapers: 30, assignedPapers: 10, status: 'pending' },
    { id: 2, examName: 'Midterm - Data Structures', batch: 'CSE 2022-26', totalPapers: 25, assignedPapers: 8, status: 'in_progress' },
    { id: 3, examName: 'Quiz - Physics', batch: 'PHYS 2021-25', totalPapers: 20, assignedPapers: 20, status: 'completed' },
  ]

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
      setTimeout(() => setUploadingPaper(false), 2000)
    }
  }

  const QuickActions = () => (
    <div className="flex flex-wrap gap-4 mb-6">
      <label className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
        uploadingPaper ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'
      }`}>
        {uploadingPaper ? 'Uploading...' : 'Upload Question Paper'}
        <input type="file" accept=".pdf" onChange={handleUploadPaper} className="hidden" />
      </label>
      <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
        Mark Attendance
      </button>
      <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
        Download Timetable
      </button>
    </div>
  )

  const totalUpcoming = examTimetable.filter(e => e.status === 'upcoming').length
  const assignedDuties = invigilationDuties.filter(d => d.status === 'assigned').length
  const pendingValuations = valuationAssignments.filter(v => v.status === 'pending').length

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
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invigilation Duties */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Invigilation Duties</h2>
          </div>
          <div className="overflow-x-auto">
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
                      <button className="text-blue-600 hover:text-blue-900">View Duty</button>
                      {duty.status === 'assigned' && <button className="text-green-600 hover:text-green-900">Mark Complete</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Valuation Assignments */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Valuation Assignments</h2>
          </div>
          <div className="overflow-x-auto">
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
                        {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">View Papers</button>
                      {assignment.status === 'pending' && <button className="text-green-600 hover:text-green-900">Start Valuation</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Upcoming Exams</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalUpcoming}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Assigned Duties</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{assignedDuties}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pending Valuations</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{pendingValuations}</p>
          </div>
        </div>
      </div>
    </div>
  )
}