"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from "../../../context/AuthContext";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";

interface AttendanceRecord {
  id: string;
  subject: string;
  totalClasses: number;
  attendedClasses: number;
  lastUpdated: any;
}

type FilterMode = 'overview' | 'daywise' | 'hourwise' | 'fromdate' | 'range';

const FILTER_TABS: { id: FilterMode; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'daywise', label: 'Day Wise' },
  { id: 'hourwise', label: 'Hour Wise' },
  { id: 'fromdate', label: 'From Date' },
  { id: 'range', label: 'Date Range' },
];

export default function AttendancePage() {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>('overview');
  const [selectedDay, setSelectedDay] = useState('');
  const [fromHour, setFromHour] = useState('08:00');
  const [toHour, setToHour] = useState('17:00');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "attendance"), where("studentId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      setAttendanceData(data);
      setLoading(false);
    }, (error) => {
      console.error("Attendance fetch error:", error);
      toast.error("Failed to load attendance");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const filteredData = (() => {
    if (!attendanceData.length) return attendanceData;
    switch (filterMode) {
      case 'fromdate': {
        if (!fromDate) return attendanceData;
        const from = new Date(fromDate).getTime();
        return attendanceData.filter(r => {
          const updated = r.lastUpdated?.seconds ? r.lastUpdated.seconds * 1000 : null;
          return updated ? updated >= from : true;
        });
      }
      case 'range': {
        if (!fromDate && !toDate) return attendanceData;
        return attendanceData.filter(r => {
          const updated = r.lastUpdated?.seconds ? r.lastUpdated.seconds * 1000 : null;
          if (!updated) return true;
          const from = fromDate ? new Date(fromDate).getTime() : 0;
          const to = toDate ? new Date(toDate).setHours(23, 59, 59) : Infinity;
          return updated >= from && updated <= to;
        });
      }
      default:
        return attendanceData;
    }
  })();

  const totalClasses = filteredData.reduce((acc, curr) => acc + curr.totalClasses, 0);
  const totalAttended = filteredData.reduce((acc, curr) => acc + curr.attendedClasses, 0);
  const overallPercentage = totalClasses > 0 ? ((totalAttended / totalClasses) * 100).toFixed(1) : "0.0";
  const overallPercentVal = parseFloat(overallPercentage);
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallPercentVal / 100) * circumference;

  const getStatus = (percent: number) => {
    if (percent >= 75) return { label: 'Good', color: 'bg-green-100 text-green-800' };
    if (percent >= 60) return { label: 'Warning', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Critical', color: 'bg-red-100 text-red-800' };
  };

  const seedAttendanceData = async () => {
    if (!user) return;
    if (!confirm("This will add sample attendance records. Continue?")) return;
    try {
      const subjects = [
        { subject: "Mathematics", total: 45, attended: 40 },
        { subject: "Physics", total: 42, attended: 35 },
        { subject: "Chemistry", total: 40, attended: 28 },
        { subject: "Computer Science", total: 38, attended: 36 },
        { subject: "English Literature", total: 30, attended: 22 },
        { subject: "Biology", total: 35, attended: 20 },
      ];
      for (const sub of subjects) {
        await addDoc(collection(db, "attendance"), {
          studentId: user.uid, subject: sub.subject,
          totalClasses: sub.total, attendedClasses: sub.attended,
          lastUpdated: serverTimestamp()
        });
      }
      toast.success("Sample attendance data added!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to seed data");
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-6"></div>
        <div className="h-12 bg-white rounded-lg border border-gray-100 mb-6"></div>
        <div className="h-64 bg-white rounded-lg border border-gray-100 mb-6"></div>
        <div className="h-64 bg-white rounded-lg border border-gray-100"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Overview</h1>
        {process.env.NODE_ENV === 'development' && attendanceData.length === 0 && (
          <button onClick={seedAttendanceData} className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200 transition">
            + Seed Data
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 p-1.5 mb-6 flex gap-1 overflow-x-auto">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterMode(tab.id)}
            className={`flex-1 min-w-fit px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              filterMode === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Day Wise */}
      {filterMode === 'daywise' && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Select a Date</p>
          <input type="date" value={selectedDay} onChange={e => setSelectedDay(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          {selectedDay && (
            <p className="mt-3 text-sm text-gray-500">
              Viewing attendance for <strong>{new Date(selectedDay).toLocaleDateString('en-IN', { dateStyle: 'long' })}</strong>
            </p>
          )}
        </div>
      )}

      {/* Hour Wise */}
      {filterMode === 'hourwise' && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Select Hour Range</p>
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input type="time" value={fromHour} onChange={e => setFromHour(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input type="time" value={toHour} onChange={e => setToHour(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-500">Showing classes between <strong>{fromHour}</strong> and <strong>{toHour}</strong></p>
        </div>
      )}

      {/* From Date */}
      {filterMode === 'fromdate' && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Show attendance from</p>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          {fromDate && (
            <p className="mt-3 text-sm text-gray-500">
              Showing records from <strong>{new Date(fromDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}</strong> onwards
            </p>
          )}
        </div>
      )}

      {/* Date Range */}
      {filterMode === 'range' && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Select Date Range</p>
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                max={toDate || new Date().toISOString().split('T')[0]}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
            <span className="text-gray-400 pb-2">to</span>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                min={fromDate} max={new Date().toISOString().split('T')[0]}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
          </div>
          {(fromDate || toDate) && (
            <p className="mt-3 text-sm text-gray-500">
              Showing records
              {fromDate && <> from <strong>{new Date(fromDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</strong></>}
              {toDate && <> to <strong>{new Date(toDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</strong></>}
            </p>
          )}
        </div>
      )}

      {filteredData.length === 0 ? (
        <div className="bg-white p-10 rounded-lg text-center">
          <p className="text-gray-500">{attendanceData.length === 0 ? 'No attendance records found.' : 'No records match the selected filter.'}</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-100 p-6 mb-6">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="text-center md:text-left mb-4 md:mb-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Overall Attendance</h2>
                <p className={`text-3xl font-bold ${overallPercentVal < 75 ? 'text-red-500' : 'text-blue-600'}`}>{overallPercentage}%</p>
                <p className="text-sm text-gray-500 mt-1">Total {totalAttended}/{totalClasses} classes attended</p>
              </div>
              <div className="relative">
                <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
                  <circle cx="60" cy="60" r={radius} fill="none" stroke="#DBEAFE" strokeWidth="10" />
                  <circle cx="60" cy="60" r={radius} fill="none" stroke={overallPercentVal < 75 ? '#EF4444' : '#3B82F6'}
                    strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">Avg</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center md:justify-start mt-4 space-x-4">
              <div className="flex items-center space-x-1">
                <div className={`w-3 h-3 rounded-full ${overallPercentVal < 75 ? 'bg-red-500' : 'bg-blue-600'}`}></div>
                <span className="text-sm text-gray-600">Present</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-100 rounded-full"></div>
                <span className="text-sm text-gray-600">Absent</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4 text-center md:text-left">
              {overallPercentVal >= 75 ? "Great job! Your attendance is above the requirement. Keep it up!" : "Your attendance is below the 75% requirement. Please focus on attending more classes."}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Subject-wise Attendance</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Subject</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-700">Total Classes</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-700">Attended</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-700">Percentage</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((record) => {
                    const percent = (record.attendedClasses / record.totalClasses) * 100;
                    const status = getStatus(percent);
                    return (
                      <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="py-3 px-4 font-medium text-gray-900">{record.subject}</td>
                        <td className="text-center py-3 px-2">{record.totalClasses}</td>
                        <td className="text-center py-3 px-2">{record.attendedClasses}</td>
                        <td className="text-center py-3 px-2 font-medium">{percent.toFixed(1)}%</td>
                        <td className="text-center py-3 px-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>{status.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance Alerts</h2>
            {filteredData.filter(r => (r.attendedClasses / r.totalClasses * 100) < 75).length === 0 ? (
              <div className="flex items-center text-green-600 bg-green-50 p-4 rounded-lg">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="font-medium">All clear! No low attendance alerts.</span>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredData.filter(r => (r.attendedClasses / r.totalClasses * 100) < 75).map(record => {
                  const percent = (record.attendedClasses / record.totalClasses) * 100;
                  const isCritical = percent < 65;
                  return (
                    <div key={record.id} className={`border-l-4 ${isCritical ? 'border-red-400 bg-red-50' : 'border-yellow-400 bg-yellow-50'} p-4 rounded-r-lg`}>
                      <div className="flex">
                        <svg className={`h-5 w-5 flex-shrink-0 ${isCritical ? 'text-red-400' : 'text-yellow-400'}`} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className={`ml-3 text-sm font-medium ${isCritical ? 'text-red-800' : 'text-yellow-800'}`}>
                          {isCritical ? 'Critical Alert' : 'Warning'} in {record.subject}: {percent.toFixed(1)}% (Below 75%). Please take action.
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
