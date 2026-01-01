'use client';

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import MarkAttendanceModal from '../../../widgets/Faculty/MarkAttendanceModal';

interface Slot {
  time: string;
  subject: string;
  batch: string;
  semester: string;
  room: string;
}

type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export default function page() {
  const { user } = useAuth();
  
  // State
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const daysOfWeek: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Identify the day of the week from the selected date
  const getDayFromDate = (dateStr: string): Day => {
      const date = new Date(dateStr);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      return (daysOfWeek.includes(dayName as Day) ? dayName : 'Monday') as Day; // Fallback to Monday if Sunday or error
  }

  const currentDayName = getDayFromDate(selectedDate);
  
  // Determine if Date is in Future
  const isFutureDate = (dateStr: string) => {
      const selected = new Date(dateStr);
      const today = new Date();
      selected.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      return selected > today;
  }
  
  const canMarkAttendance = !isFutureDate(selectedDate);

  // --- Static Schedule Data (Replace with API call in future) ---
  const schedule = {
    daily: {
      Monday: [
        { time: '09:00 AM - 10:30 AM', subject: 'Data Structures (CS-301)', batch: 'CSE 2022-26', semester: '4th', room: 'Lab 101' },
        { time: '11:00 AM - 12:30 PM', subject: 'Algorithms (CS-302)', batch: 'CSE 2023-27', semester: '3rd', room: 'Room 205' },
        { time: '02:00 PM - 03:30 PM', subject: 'Web Development (CS-305)', batch: 'CSE 2022-26', semester: '4th', room: 'Lab 102' },
      ],
      Tuesday: [
        { time: '09:00 AM - 10:30 AM', subject: 'OS (CS-304)', batch: 'CSE 2022-26', semester: '4th', room: 'Lab 101' },
      ],
      Wednesday: [],
      Thursday: [
          { time: '09:00 AM - 10:00 AM', subject: 'Network Security', batch: 'CSE 2021-25', semester: '6th', room: 'Hall A' }
      ],
      Friday: [
           { time: '02:00 PM - 04:00 PM', subject: 'Project Lab', batch: 'CSE 2021-25', semester: '8th', room: 'Lab 202' }
      ],
      Saturday: []
    } as Record<Day, Slot[]>,
    weekly: daysOfWeek.map(day => ({
      day,
      slots: [
        { time: '09:00 - 10:30', subject: 'Data Structures', batch: 'CSE 2022', semester: '4th', room: '101' },
        // ... just placeholder structure matching daily for simplicity in this demo
      ]
    })),
  }

  const currentSchedule = viewMode === 'daily' ? schedule.daily[currentDayName] || [] : schedule.weekly

  const handleMarkAttendanceClick = (slot: Slot) => {
      if (!canMarkAttendance) {
          alert("Cannot mark attendance for future dates.");
          return;
      }
      setSelectedSlot(slot);
      setIsModalOpen(true);
  }

  // Quick Action Toolbar
  const Toolbar = () => (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between border border-gray-100">
      <div className="flex items-center gap-4">
        {/* Date Picker */}
        <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 uppercase">Select Date</label>
            <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1 px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
        </div>
        
        {/* Day Indicator */}
        <div className="flex flex-col">
             <label className="text-xs font-semibold text-gray-500 uppercase">Day</label>
             <span className="mt-1 font-medium text-gray-900">{currentDayName}</span>
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => setViewMode('daily')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Daily View
        </button>
        {/* Disabled Weekly for now as we focus on attendance marking per day */}
        <button
          onClick={() => alert("Weekly view is read-only for overview.")}
        //   onClick={() => setViewMode('weekly')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors opacity-50 cursor-not-allowed bg-gray-100 text-gray-600`}
        >
          Weekly View
        </button>
      </div>
    </div>
  )

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Faculty Timetable</h1>
          <p className="text-gray-600 mt-1">Manage your teaching schedule and student attendance.</p>
        </div>

        {/* Toolbar */}
        <Toolbar />

        {/* Schedule Display */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">
               Schedule for {new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
            </h2>
             {!canMarkAttendance && (
                 <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">
                     Future Date - Read Only
                 </span>
             )}
          </div>
          
          {viewMode === 'daily' ? (
             currentSchedule.length > 0 ? (
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Time Slot</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Attendance</th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                    {(currentSchedule as Slot[]).map((slot: Slot, index: number) => (
                        <tr key={index} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{slot.time}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">{slot.subject}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-medium">{slot.batch}</div>
                            <div className="text-xs text-gray-500">{slot.semester} Semester</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 flex items-center gap-2">
                             <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                             {slot.room}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button 
                                onClick={() => handleMarkAttendanceClick(slot)}
                                disabled={!canMarkAttendance}
                                className={`px-4 py-2 rounded-lg text-sm transition-all shadow-sm
                                    ${canMarkAttendance 
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200' 
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }
                                `}
                            >
                                {canMarkAttendance ? 'Mark Attendance' : 'N/A'}
                            </button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
             ) : (
                 <div className="p-12 text-center">
                     <div className="mb-4 text-6xl opacity-20">📅</div>
                     <h3 className="text-lg font-medium text-gray-900">No classes scheduled</h3>
                     <p className="text-gray-500">Enjoy your free day!</p>
                 </div>
             )
          ) : (
            <div className="p-8 text-center text-gray-500">Weekly view coming soon (Use Daily view to mark attendance)</div>
          )}
        </div>
      </div>

      {/* Attendance Modal */}
      {isModalOpen && selectedSlot && user && (
          <MarkAttendanceModal 
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              batch={selectedSlot.batch}
              subject={selectedSlot.subject}
              date={new Date(selectedDate)}
              slotTime={selectedSlot.time}
              facultyId={user.uid}
          />
      )}

    </div>
  )
}