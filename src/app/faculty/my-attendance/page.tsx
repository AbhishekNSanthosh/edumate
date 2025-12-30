'use client';

import React, { useState } from 'react'

interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'leave' | 'holiday' | 'weekend';
  notes: string;
}

interface MonthlySummary {
  month: string;
  present: number;
  absent: number;
  leave: number;
  totalWorkingDays: number;
  attendancePercentage: number;
}

export default function page() {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily')
  const [selectedMonth, setSelectedMonth] = useState('December 2025')

  // Sample data - in a real app, this would come from an API
  const currentDate = 'December 30, 2025'
  const dailyRecords: AttendanceRecord[] = [
    { date: 'Dec 28, 2025', status: 'present', notes: 'Full day' },
    { date: 'Dec 29, 2025', status: 'present', notes: 'Half day - Meeting' },
    { date: 'Dec 30, 2025', status: 'leave', notes: 'Personal leave' },
    { date: 'Dec 31, 2025', status: 'weekend', notes: 'Saturday' },
    { date: 'Jan 1, 2026', status: 'holiday', notes: 'New Year' },
  ]

  const monthlySummaries: MonthlySummary[] = [
    {
      month: 'December 2025',
      present: 18,
      absent: 2,
      leave: 3,
      totalWorkingDays: 23,
      attendancePercentage: 92,
    },
    {
      month: 'November 2025',
      present: 20,
      absent: 1,
      leave: 2,
      totalWorkingDays: 23,
      attendancePercentage: 95,
    },
  ]

  const currentSummary = monthlySummaries.find(s => s.month === selectedMonth) || monthlySummaries[0]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'leave': return 'bg-blue-100 text-blue-800';
      case 'holiday': return 'bg-gray-100 text-gray-800';
      case 'weekend': return 'bg-purple-100 text-purple-800';
      case 'absent': return 'bg-red-100 text-red-800';
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
          Daily View
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
      {viewMode === 'monthly' && (
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        >
          {monthlySummaries.map(summary => (
            <option key={summary.month} value={summary.month}>{summary.month}</option>
          ))}
        </select>
      )}
      <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
        Download Report
      </button>
    </div>
  )

  const totalPresent = dailyRecords.filter(r => r.status === 'present').length
  const totalLeave = dailyRecords.filter(r => r.status === 'leave').length
  const totalAbsent = dailyRecords.filter(r => r.status === 'absent').length

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Attendance</h1>
          <p className="text-gray-600 mt-2">Your attendance records for {currentDate}.</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Daily/Monthly View */}
        {viewMode === 'daily' ? (
          <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Daily Attendance Status</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dailyRecords.map((record, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{record.notes}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">Edit</button>
                        <button className="text-green-600 hover:text-green-900">View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md mb-8 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Attendance Summary - {selectedMonth}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-800">Present Days</h3>
                <p className="text-2xl font-bold text-green-600">{currentSummary.present}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800">Leave Days</h3>
                <p className="text-2xl font-bold text-blue-600">{currentSummary.leave}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-red-800">Absent Days</h3>
                <p className="text-2xl font-bold text-red-600">{currentSummary.absent}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-800">Total Working Days</h3>
                <p className="text-2xl font-bold text-purple-600">{currentSummary.totalWorkingDays}</p>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Attendance Percentage (Leave-Adjusted)</h3>
              <p className="text-xl font-bold text-gray-900">{currentSummary.attendancePercentage}%</p>
            </div>
            <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              View Detailed History
            </button>
          </div>
        )}

        {/* Attendance History */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Attendance History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dailyRecords.slice(-5).map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{record.notes}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">View</button>
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
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Present</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalPresent}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Leave</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalLeave}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Absent</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalAbsent}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Current Month %</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{currentSummary.attendancePercentage}%</p>
          </div>
        </div>
      </div>
    </div>
  )
}