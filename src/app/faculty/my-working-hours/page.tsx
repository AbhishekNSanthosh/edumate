'use client';

import React, { useState } from 'react'

interface WorkLog {
  date: string;
  teachingHours: number;
  nonTeachingHours: number;
  totalHours: number;
  overtime: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface OvertimeRecord {
  id: number;
  date: string;
  description: string;
  hours: number;
  status: 'pending' | 'approved' | 'rejected';
}

export default function page() {
  const [selectedMonth, setSelectedMonth] = useState('December 2025')
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily')

  // Sample data - in a real app, this would come from an API
  const currentDate = 'December 30, 2025'
  const dailyLogs: WorkLog[] = [
    { date: 'Dec 29, 2025', teachingHours: 4, nonTeachingHours: 2, totalHours: 6, overtime: 0.5, status: 'approved' },
    { date: 'Dec 30, 2025', teachingHours: 3, nonTeachingHours: 3, totalHours: 6, overtime: 0, status: 'pending' },
    { date: 'Dec 31, 2025', teachingHours: 0, nonTeachingHours: 0, totalHours: 0, overtime: 0, status: 'pending' },
  ]

  const monthlySummary = {
    month: 'December 2025',
    totalTeaching: 45,
    totalNonTeaching: 30,
    totalHours: 75,
    overtime: 5,
    averageDaily: 6.5,
  }

  const overtimeRecords: OvertimeRecord[] = [
    { id: 1, date: 'Dec 25, 2025', description: 'Extra class for Algorithms', hours: 2, status: 'approved' },
    { id: 2, date: 'Dec 28, 2025', description: 'Workshop session', hours: 1.5, status: 'pending' },
    { id: 3, date: 'Dec 30, 2025', description: 'Meeting with HOD', hours: 0.5, status: 'pending' },
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
    <div className="flex flex-wrap gap-4 mb-6">
      <div className="flex space-x-2">
        <button
          onClick={() => setViewMode('daily')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'daily' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Daily Log
        </button>
        <button
          onClick={() => setViewMode('monthly')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Monthly Summary
        </button>
      </div>
      <select
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
      >
        <option>December 2025</option>
        <option>November 2025</option>
        <option>October 2025</option>
      </select>
      <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
        Log Today's Hours
      </button>
      <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
        Export Report
      </button>
    </div>
  )

  const totalTeaching = dailyLogs.reduce((sum, log) => sum + log.teachingHours, 0)
  const totalNonTeaching = dailyLogs.reduce((sum, log) => sum + log.nonTeachingHours, 0)
  const totalOvertime = dailyLogs.reduce((sum, log) => sum + log.overtime, 0)
  const pendingApprovals = dailyLogs.filter(log => log.status === 'pending').length

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Working Hours</h1>
          <p className="text-gray-600 mt-2">Track your workload and attendance for {currentDate}.</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Daily/Monthly View */}
        {viewMode === 'daily' ? (
          <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Daily Working Hours Log</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teaching Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Non-Teaching Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overtime</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dailyLogs.map((log, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.teachingHours}h</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.nonTeachingHours}h</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.totalHours}h</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.overtime > 0 ? `${log.overtime}h` : '0h'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">Edit</button>
                        {log.status === 'pending' && <button className="text-green-600 hover:text-green-900">Submit for Approval</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md mb-8 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Workload Summary - {selectedMonth}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800">Total Teaching Hours</h3>
                <p className="text-2xl font-bold text-blue-600">{monthlySummary.totalTeaching}h</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-800">Total Non-Teaching Hours</h3>
                <p className="text-2xl font-bold text-green-600">{monthlySummary.totalNonTeaching}h</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-800">Total Hours</h3>
                <p className="text-2xl font-bold text-purple-600">{monthlySummary.totalHours}h</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-orange-800">Total Overtime</h3>
                <p className="text-2xl font-bold text-orange-600">{monthlySummary.overtime}h</p>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Average Daily Hours</h3>
              <p className="text-xl font-bold text-gray-900">{monthlySummary.averageDaily}h</p>
            </div>
          </div>
        )}

        {/* Overtime / Extra Class Records */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Overtime / Extra Class Records</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {overtimeRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{record.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.hours}h</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">Edit</button>
                      {record.status === 'pending' && <button className="text-green-600 hover:text-green-900">Submit</button>}
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
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Teaching Hours</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalTeaching}h</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Non-Teaching Hours</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalNonTeaching}h</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Overtime</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalOvertime}h</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pending Approvals</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{pendingApprovals}</p>
          </div>
        </div>
      </div>
    </div>
  )
}