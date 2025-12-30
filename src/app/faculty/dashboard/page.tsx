"use client"
import React from 'react'

export default function page() {
  // Sample data - in a real app, this would come from an API
  // Today's date: December 30, 2025 (Tuesday)
  const today = 'Tuesday, December 30, 2025'
  const timetable = [
    { time: '09:00 AM - 10:30 AM', subject: 'Data Structures', batch: 'CSE 2022-26', room: 'Lab 101', status: 'upcoming' },
    { time: '11:00 AM - 12:30 PM', subject: 'Algorithms', batch: 'CSE 2023-27', room: 'Room 205', status: 'ongoing' },
    { time: '02:00 PM - 03:30 PM', subject: 'Web Development', batch: 'CSE 2022-26', room: 'Lab 102', status: 'upcoming' },
  ]

  const assigned = [
    { subject: 'Data Structures', batch: 'CSE 2022-26', credits: 4 },
    { subject: 'Algorithms', batch: 'CSE 2023-27', credits: 3 },
    { subject: 'Web Development', batch: 'CSE 2022-26', credits: 3 },
  ]

  const pendingEvaluations = {
    assignments: 25,
    exams: 12,
    total: 37,
  }

  const leaveStatus = {
    balance: 15,
    upcoming: 'Annual Leave: Jan 5-7, 2026',
    status: 'No current leave',
  }

  const announcements = [
    { title: 'Faculty Meeting Tomorrow', date: 'Dec 31, 2025', message: 'Meeting at 10 AM in Conference Room A.' },
    { title: 'New Grading Policy', date: 'Dec 28, 2025', message: 'Updated guidelines for assignments effective Jan 2026.' },
    { title: 'System Maintenance', date: 'Dec 25, 2025', message: 'Portal will be down for 2 hours on Jan 2.' },
  ]

  const quickActions = [
    { label: 'Mark Attendance', icon: '📝', path: '/faculty/attendance' },
    { label: 'View Students', icon: '👥', path: '/faculty/students' },
    { label: 'Grade Assignments', icon: '📊', path: '/faculty/evaluations' },
    { label: 'My Timetable', icon: '📅', path: '/faculty/timetable' },
    { label: 'Apply Leave', icon: '📄', path: '/faculty/leave' },
    { label: 'View Announcements', icon: '🔔', path: '/faculty/announcements' },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-yellow-100 text-yellow-800';
      case 'ongoing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Faculty Dashboard</h1>
          <p className="text-gray-600">Quick overview of your academic activities for {today}</p>
        </div>

        {/* Quick Access Shortcuts */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                onClick={() => window.location.href = action.path}
              >
                <span className="text-2xl mb-2">{action.icon}</span>
                <span className="text-sm font-medium text-blue-700 text-center">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Today’s Timetable */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Today's Timetable ({today})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timetable.map((slot, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{slot.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{slot.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{slot.batch}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{slot.room}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(slot.status)}`}>
                        {slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">Mark Attendance</button>
                      <button className="text-blue-600 hover:text-blue-900">View Students</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assigned Subjects and Batches */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Assigned Subjects & Batches</h2>
            <ul className="space-y-3">
              {assigned.map((assignment, index) => (
                <li key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                  <div>
                    <span className="font-medium text-gray-900">{assignment.subject}</span>
                    <span className="text-sm text-gray-500 ml-2">({assignment.batch})</span>
                  </div>
                  <span className="text-sm font-medium text-blue-600">{assignment.credits} Credits</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pending Evaluations */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Evaluations</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-md">
                <span className="text-sm text-gray-700">Assignments</span>
                <span className="text-lg font-bold text-yellow-600">{pendingEvaluations.assignments}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-md">
                <span className="text-sm text-gray-700">Exams</span>
                <span className="text-lg font-bold text-red-600">{pendingEvaluations.exams}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-md border-t-2 border-blue-200">
                <span className="text-sm font-medium text-gray-900">Total Pending</span>
                <span className="text-2xl font-bold text-blue-600">{pendingEvaluations.total}</span>
              </div>
              <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                View All Evaluations
              </button>
            </div>
          </div>
        </div>

        {/* Leave Status & Recent Announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Leave Status</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Leave Balance</span>
                <span className="text-lg font-bold text-green-600">{leaveStatus.balance} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Current Status</span>
                <span className={`text-sm font-medium ${leaveStatus.status === 'No current leave' ? 'text-green-600' : 'text-red-600'}`}>
                  {leaveStatus.status}
                </span>
              </div>
              {leaveStatus.upcoming && (
                <div className="p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">{leaveStatus.upcoming}</p>
                </div>
              )}
              <button className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                Apply for Leave
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Announcements</h2>
            <ul className="space-y-3">
              {announcements.slice(0, 3).map((announcement, index) => (
                <li key={index} className="p-3 bg-gray-50 rounded-md">
                  <div className="font-medium text-gray-900">{announcement.title}</div>
                  <div className="text-xs text-gray-500">{announcement.date}</div>
                  <p className="text-sm text-gray-700 mt-1">{announcement.message}</p>
                </li>
              ))}
            </ul>
            <button className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              View All Announcements
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Today's Classes</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{timetable.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Assigned Subjects</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{assigned.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pending Evaluations</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{pendingEvaluations.total}</p>
          </div>
        </div>
      </div>
    </div>
  )
}