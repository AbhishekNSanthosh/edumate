"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from "../../../context/AuthContext";
import { collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";

interface AttendanceRecord {
  id: string;
  subject: string;
  totalClasses: number;
  attendedClasses: number;
  lastUpdated: any;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "attendance"), where("studentId", "==", user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as AttendanceRecord));
        setAttendanceData(data);
        setLoading(false);
    }, (error) => {
        console.error("Attendance fetch error:", error);
        toast.error("Failed to load attendance");
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Overall Calculation
  const totalClasses = attendanceData.reduce((acc, curr) => acc + curr.totalClasses, 0);
  const totalAttended = attendanceData.reduce((acc, curr) => acc + curr.attendedClasses, 0);
  const overallPercentage = totalClasses > 0 ? ((totalAttended / totalClasses) * 100).toFixed(1) : "0.0";
  const overallPercentVal = parseFloat(overallPercentage);

  // Chart Calculations
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
                  studentId: user.uid,
                  subject: sub.subject,
                  totalClasses: sub.total,
                  attendedClasses: sub.attended,
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
          <div className="flex justify-center items-center min-h-screen mt-[80px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
      );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen mt-[80px] mb-[60px]">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Attendance Overview</h1>
          {process.env.NODE_ENV === 'development' && attendanceData.length === 0 && (
              <button 
                onClick={seedAttendanceData}
                className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200 transition"
              >
                  + Seed Data
              </button>
          )}
      </div>

      {attendanceData.length === 0 ? (
          <div className="bg-white p-10 rounded-lg shadow-sm text-center">
              <p className="text-gray-500">No attendance records found.</p>
          </div>
      ) : (
        <>
            {/* Overall Attendance Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="text-center md:text-left mb-4 md:mb-0">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Overall Attendance</h2>
                    <p className={`text-3xl font-bold ${overallPercentVal < 75 ? 'text-red-500' : 'text-blue-600'}`}>
                        {overallPercentage}%
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                        Total {totalAttended}/{totalClasses} classes attended
                    </p>
                </div>
                <div className="relative">
                    {/* Donut Chart SVG */}
                    <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
                    <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="none"
                        stroke="#DBEAFE"
                        strokeWidth="10"
                    />
                    <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="none"
                        stroke={overallPercentVal < 75 ? '#EF4444' : '#3B82F6'}
                        strokeWidth="10"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
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
                    {overallPercentVal >= 75 
                        ? "Great job! Your attendance is above the requirement. Keep it up!" 
                        : "Your attendance is below the 75% requirement. Please focus on attending more classes."
                    }
                </p>
            </div>

            {/* Subject-wise Attendance */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Subject-wise Attendance</h2>
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Subject</th>
                        <th className="text-center py-3 px-2 font-semibold text-gray-700">Total Classes</th>
                        <th className="text-center py-3 px-2 font-semibold text-gray-700">Attended</th>
                        <th className="text-center py-3 px-2 font-semibold text-gray-700">Percentage</th>
                        <th className="text-center py-3 px-2 font-semibold text-gray-700">Status</th>
                    </tr>
                    </thead>
                    <tbody>
                        {attendanceData.map((record) => {
                            const percent = (record.attendedClasses / record.totalClasses) * 100;
                            const status = getStatus(percent);
                            return (
                                <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                    <td className="py-3 px-4 font-medium text-gray-900">{record.subject}</td>
                                    <td className="text-center py-3 px-2">{record.totalClasses}</td>
                                    <td className="text-center py-3 px-2">{record.attendedClasses}</td>
                                    <td className="text-center py-3 px-2 font-medium">{percent.toFixed(1)}%</td>
                                    <td className="text-center py-3 px-2">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                                            {status.label}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                </div>
            </div>

            {/* Low Attendance Alerts */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance Alerts</h2>
                
                {attendanceData.filter(r => (r.attendedClasses/r.totalClasses * 100) < 75).length === 0 ? (
                    <div className="flex items-center text-green-600 bg-green-50 p-4 rounded-lg">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        <span className="font-medium">All clear! No low attendance alerts.</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {attendanceData.filter(r => (r.attendedClasses/r.totalClasses * 100) < 75).map(record => {
                             const percent = (record.attendedClasses / record.totalClasses) * 100;
                             const isCritical = percent < 65;
                             return (
                                <div key={record.id} className={`border-l-4 ${isCritical ? 'border-red-400 bg-red-50' : 'border-yellow-400 bg-yellow-50'} p-4 rounded-r-lg shadow-sm`}>
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className={`h-5 w-5 ${isCritical ? 'text-red-400' : 'text-yellow-400'}`} viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className={`text-sm font-medium ${isCritical ? 'text-red-800' : 'text-yellow-800'}`}>
                                                {isCritical ? 'Critical Alert' : 'Warning'} in {record.subject}: {percent.toFixed(1)}% (Below 75%). Please take action.
                                            </p>
                                        </div>
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