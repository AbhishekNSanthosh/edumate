'use client';

import React, { useState } from 'react'

interface LeaveApplication {
  id: number;
  student: string;
  regNumber: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedDate: string;
}

interface LeaveHistory {
  id: number;
  student: string;
  regNumber: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: 'approved' | 'rejected';
  approvedDate: string;
  approvedBy: string;
}

export default function page() {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending')

  // Sample data - in a real app, this would come from an API
  const pendingApplications: LeaveApplication[] = [
    {
      id: 1,
      student: 'John Doe',
      regNumber: '2022CSE001',
      type: 'Casual Leave',
      fromDate: 'Jan 5, 2026',
      toDate: 'Jan 6, 2026',
      days: 2,
      reason: 'Family event',
      status: 'pending',
      appliedDate: 'Dec 30, 2025',
    },
    {
      id: 2,
      student: 'Jane Smith',
      regNumber: '2023MATH001',
      type: 'Sick Leave',
      fromDate: 'Jan 8, 2026',
      toDate: 'Jan 8, 2026',
      days: 1,
      reason: 'Illness',
      status: 'pending',
      appliedDate: 'Dec 30, 2025',
    },
    {
      id: 3,
      student: 'Mike Wilson',
      regNumber: '2021PHYS001',
      type: 'On Duty',
      fromDate: 'Jan 10, 2026',
      toDate: 'Jan 10, 2026',
      days: 1,
      reason: 'Conference attendance',
      status: 'pending',
      appliedDate: 'Dec 29, 2025',
    },
  ]

  const leaveHistories: LeaveHistory[] = [
    {
      id: 1,
      student: 'John Doe',
      regNumber: '2022CSE001',
      type: 'Casual Leave',
      fromDate: 'Dec 20, 2025',
      toDate: 'Dec 21, 2025',
      days: 2,
      reason: 'Family event',
      status: 'approved',
      approvedDate: 'Dec 18, 2025',
      approvedBy: 'Dr. Alice Johnson',
    },
    {
      id: 2,
      student: 'Jane Smith',
      regNumber: '2023MATH001',
      type: 'Sick Leave',
      fromDate: 'Nov 10, 2025',
      toDate: 'Nov 12, 2025',
      days: 3,
      reason: 'Illness',
      status: 'approved',
      approvedDate: 'Nov 8, 2025',
      approvedBy: 'Prof. Bob Smith',
    },
    {
      id: 3,
      student: 'Mike Wilson',
      regNumber: '2021PHYS001',
      type: 'On Duty',
      fromDate: 'Oct 15, 2025',
      toDate: 'Oct 15, 2025',
      days: 1,
      reason: 'Workshop',
      status: 'rejected',
      approvedDate: 'Oct 14, 2025',
      approvedBy: 'Dr. Carol Davis',
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const handleApprove = (id: number) => {
    // Simulate approval
    console.log('Approved:', id)
  }

  const handleReject = (id: number) => {
    // Simulate rejection
    console.log('Rejected:', id)
  }

  const handleNotify = (student: string) => {
    // Simulate notification
    console.log('Notified:', student)
  }

  const QuickActions = () => (
    <div className="flex space-x-4 mb-6">
      <button
        onClick={() => setViewMode('pending')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          viewMode === 'pending' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Pending Applications
      </button>
      <button
        onClick={() => setViewMode('history')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          viewMode === 'history' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Leave History
      </button>
      <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
        Export Records
      </button>
    </div>
  )

  const pendingCount = pendingApplications.length
  const approvedCount = leaveHistories.filter(h => h.status === 'approved').length
  const rejectedCount = leaveHistories.filter(h => h.status === 'rejected').length

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Student Leave Management</h1>
          <p className="text-gray-600 mt-2">Approve and track student leave requests.</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Content based on view mode */}
        {viewMode === 'pending' ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Pending Leave Applications ({pendingCount})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reg No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From - To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{app.student}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.regNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.fromDate} - {app.toDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{app.days}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{app.reason}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.appliedDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleApprove(app.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(app.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleNotify(app.student)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Notify
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Leave History</h2>
              <div className="flex space-x-4 mb-4">
                <input
                  type="text"
                  placeholder="Search by student name or reg number"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) => setSelectedStudent(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reg No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From - To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaveHistories
                    .filter(history => !selectedStudent || history.student.toLowerCase().includes(selectedStudent.toLowerCase()) || history.regNumber.toLowerCase().includes(selectedStudent.toLowerCase()))
                    .map((history) => (
                      <tr key={history.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{history.student}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{history.regNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{history.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{history.fromDate} - {history.toDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{history.days}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{history.reason}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(history.status)}`}>
                            {history.status.charAt(0).toUpperCase() + history.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{history.approvedDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{history.approvedBy}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">View Details</button>
                          <button
                            onClick={() => handleNotify(history.student)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Notify
                          </button>
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
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pending Requests</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{pendingCount}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Approved Leaves</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{approvedCount}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Rejected Leaves</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{rejectedCount}</p>
          </div>
        </div>
      </div>
    </div>
  )
}