'use client';

import React, { useState } from 'react'

interface Slot {
  time: string;
  subject: string;
  batch: string;
  semester: string;
  room: string;
}

type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export default function page() {
  // Sample data - in a real app, this would come from an API
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily')
  const [selectedDay, setSelectedDay] = useState<Day>('Monday')

  const daysOfWeek: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const schedule = {
    daily: {
      Monday: [
        { time: '09:00 AM - 10:30 AM', subject: 'Data Structures (CS-301)', batch: 'CSE 2022-26', semester: '4th', room: 'Lab 101' },
        { time: '11:00 AM - 12:30 PM', subject: 'Algorithms (CS-302)', batch: 'CSE 2023-27', semester: '3rd', room: 'Room 205' },
        { time: '02:00 PM - 03:30 PM', subject: 'Web Development (CS-305)', batch: 'CSE 2022-26', semester: '4th', room: 'Lab 102' },
      ],
      Tuesday: [
        { time: '09:00 AM - 10:30 AM', subject: 'Data Structures (CS-301)', batch: 'CSE 2022-26', semester: '4th', room: 'Lab 101' },
        { time: '02:00 PM - 03:30 PM', subject: 'Machine Learning (CS-401)', batch: 'CSE 2021-25', semester: '5th', room: 'Lab 103' },
      ],
      // ... other days with similar structure
    } as Record<Day, Slot[]>,
    weekly: daysOfWeek.map(day => ({
      day,
      slots: [
        { time: '09:00 AM - 10:30 AM', subject: 'Data Structures (CS-301)', batch: 'CSE 2022-26', semester: '4th', room: 'Lab 101' },
        { time: '11:00 AM - 12:30 PM', subject: 'Algorithms (CS-302)', batch: 'CSE 2023-27', semester: '3rd', room: 'Room 205' },
        { time: '02:00 PM - 03:30 PM', subject: 'Web Development (CS-305)', batch: 'CSE 2022-26', semester: '4th', room: 'Lab 102' },
      ]
    })),
  }

  const currentSchedule = viewMode === 'daily' ? schedule.daily[selectedDay] || [] : schedule.weekly

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
          onClick={() => setViewMode('weekly')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'weekly' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Weekly View
        </button>
      </div>
      {viewMode === 'daily' && (
        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value as Day)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        >
          {daysOfWeek.map(day => (
            <option key={day} value={day}>{day}</option>
          ))}
        </select>
      )}
      <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
        Download PDF
      </button>
      <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
        Print Timetable
      </button>
    </div>
  )

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Faculty Timetable</h1>
          <p className="text-gray-600 mt-2">Your teaching schedule for the current semester.</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Schedule Display */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {viewMode === 'daily' ? `${selectedDay}'s Schedule` : 'Weekly Schedule'}
            </h2>
          </div>
          {viewMode === 'daily' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject (Code)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch & Semester</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room / Lab</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(currentSchedule as Slot[]).map((slot: Slot, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{slot.time}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{slot.subject}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{slot.batch}</div>
                        <div className="text-sm text-gray-500">{slot.semester}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{slot.room}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">Mark Attendance</button>
                        <button className="text-green-600 hover:text-green-900">View Students</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Slot</th>
                    {daysOfWeek.map(day => (
                      <th key={day} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[...Array(6)].map((_, timeIndex) => (
                    <tr key={timeIndex}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                        {['09:00 AM - 10:30 AM', '11:00 AM - 12:30 PM', '01:00 PM - 02:30 PM', '02:45 PM - 04:15 PM', '04:30 PM - 06:00 PM', '06:15 PM - 07:45 PM'][timeIndex]}
                      </td>
                      {daysOfWeek.map((day, dayIndex) => {
                        const slot = schedule.weekly[dayIndex].slots[timeIndex];
                        return (
                          <td key={day} className="px-4 py-4 text-center text-sm text-gray-700">
                            {slot ? (
                              <div className="space-y-1">
                                <div className="font-medium text-gray-900">{slot.subject}</div>
                                <div className="text-xs text-gray-500">{slot.batch} ({slot.semester})</div>
                                <div className="text-xs text-gray-500">{slot.room}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400">Free</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Classes This Week</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">12</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Assigned Subjects</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">5</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Rooms Allocated</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">8</p>
          </div>
        </div>
      </div>
    </div>
  )
}