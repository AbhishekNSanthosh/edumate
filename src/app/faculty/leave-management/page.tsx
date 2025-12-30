'use client';

import React, { useState } from 'react'

interface LeaveType {
  id: number;
  name: string;
  code: string;
  balance: number;
  description: string;
}

interface LeaveApplication {
  id: number;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedDate: string;
  approvedBy: string;
}

export default function page() {
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [selectedType, setSelectedType] = useState('CL')

  // Sample data - in a real app, this would come from an API
  const leaveTypes: LeaveType[] = [
    { id: 1, name: 'Casual Leave', code: 'CL', balance: 12, description: 'Personal reasons, max 3 consecutive days' },
    { id: 2, name: 'Sick Leave', code: 'SL', balance: 10, description: 'Medical reasons with certificate' },
    { id: 3, name: 'On Duty', code: 'OD', balance: 5, description: 'Official duty outside campus' },
    { id: 4, name: 'Earned Leave', code: 'EL', balance: 20, description: 'Accumulated leave' },
  ]

  const leaveHistory: LeaveApplication[] = [
    {
      id: 1,
      type: 'CL',
      fromDate: 'Dec 20, 2025',
      toDate: 'Dec 21, 2025',
      days: 2,
      reason: 'Family event',
      status: 'approved',
      appliedDate: 'Dec 15, 2025',
      approvedBy: 'Dr. Alice Johnson',
    },
    {
      id: 2,
      type: 'SL',
      fromDate: 'Nov 10, 2025',
      toDate: 'Nov 12, 2025',
      days: 3,
      reason: 'Illness',
      status: 'approved',
      appliedDate: 'Nov 5, 2025',
      approvedBy: 'Prof. Bob Smith',
    },
    {
      id: 3,
      type: 'OD',
      fromDate: 'Dec 28, 2025',
      toDate: 'Dec 28, 2025',
      days: 1,
      reason: 'Conference attendance',
      status: 'pending',
      appliedDate: 'Dec 25, 2025',
      approvedBy: '',
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

  const QuickActions = () => (
    <div className="flex space-x-4 mb-6">
      <button
        onClick={() => setShowApplyForm(!showApplyForm)}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        {showApplyForm ? 'Cancel' : 'Apply for Leave'}
      </button>
      <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
        Download Leave Policy
      </button>
      <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
        View Calendar
      </button>
    </div>
  )

  const totalBalance = leaveTypes.reduce((sum, type) => sum + type.balance, 0)
  const pendingApplications = leaveHistory.filter(l => l.status === 'pending').length
  const approvedLeaves = leaveHistory.filter(l => l.status === 'approved').length

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault()
    // Simulate submission
    setShowApplyForm(false)
  }

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600 mt-2">Apply for leave and track your applications.</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Leave Balance */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Leave Balance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance (days)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaveTypes.map((type) => (
                  <tr key={type.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{type.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{type.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{type.balance}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{type.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Apply for Leave Form */}
        {showApplyForm && (
          <div className="bg-white rounded-lg shadow-md mb-8 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Apply for Leave</h2>
            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    {leaveTypes.map(type => (
                      <option key={type.id} value={type.code}>{type.name} ({type.balance} days left)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Auto-calculated"
                    disabled
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter reason for leave"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Submit Application
              </button>
            </form>
          </div>
        )}

        {/* Leave History */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Leave History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From - To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaveHistory.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{leave.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{leave.fromDate} - {leave.toDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{leave.days}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{leave.reason}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(leave.status)}`}>
                        {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{leave.appliedDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{leave.approvedBy || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">View</button>
                      {leave.status === 'pending' && <button className="text-yellow-600 hover:text-yellow-900">Cancel</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Leave Balance</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalBalance} days</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pending Applications</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{pendingApplications}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Approved Leaves</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{approvedLeaves}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Applications</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{leaveHistory.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}