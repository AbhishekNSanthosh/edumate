"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import { FiClock, FiSpeaker, FiBarChart2, FiAlertCircle, FiCheckCircle } from "react-icons/fi";

export default function ParentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [studentData, setStudentData] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any | null>(null);
  const [performance, setPerformance] = useState<any[]>([]);
  const [pendingFees, setPendingFees] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
          setLoading(false);
          return;
      }

      try {
        setLoading(true);

        // 1. Fetch Student Profile (to get Batch, Name, etc.)
        const studentDoc = await getDoc(doc(db, "students", user.uid));
        if (studentDoc.exists()) {
            setStudentData(studentDoc.data());
        }

        // 2. Fetch Notifications (Parent specific + All)
        const notifQuery = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(20)); 
        const notifSnap = await getDocs(notifQuery);
        const filteredNotifs = notifSnap.docs
            .map(d => ({id: d.id, ...d.data()} as any))
            .filter(n => {
                 // Must include 'parent' or 'all'
                 return n.audience && (n.audience.includes('parent') || n.audience.includes('all'));
            })
            .slice(0, 3);
        setNotifications(filteredNotifs);

        // 3. Fetch Fees (For Reminders)
        const feeQuery = query(collection(db, "fees"), where("studentId", "==", user.uid), where("status", "in", ["pending", "overdue"]));
        const feeSnap = await getDocs(feeQuery);
        setPendingFees(feeSnap.docs.map(d => d.data()));

        // 4. Fetch Performance
        const performanceQuery = query(collection(db, "evaluation_reports"), where("studentId", "==", user.uid));
        const performanceSnap = await getDocs(performanceQuery);
        setPerformance(performanceSnap.docs.map(d => d.data()));

        // 5. Fetch Timetable (if batch is available)
        const batch = studentDoc.data()?.batch;
        if (batch) {
            const timetableQuery = query(collection(db, "timetables"), where("batch", "==", batch));
            const timetableSnap = await getDocs(timetableQuery);
            if (!timetableSnap.empty) {
                setTimetable(timetableSnap.docs[0].data());
            }
        }

      } catch (error) {
        console.error("Error fetching parent dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const renderTimetable = () => {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const scheduleData = timetable?.schedule || {};

      return days.map((day, i) => {
          const slots = scheduleData[day] || Array(8).fill('-');
          return (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900 bg-gray-50">{day}</td>
              {slots.map((cell: string, j: number) => (
                <td key={j} className="px-3 py-3 text-center text-gray-700">
                  <span className={`inline-block px-2 py-1 text-xs rounded-md ${cell === 'Lunch' ? 'bg-gray-200 text-gray-600' : 'bg-azure-50 text-azure-700'}`}>
                    {cell}
                  </span>
                </td>
              ))}
            </tr>
          );
      });
  }

  if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen mt-[80px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
  }

  return (
    <div className="w-full p-4 md:p-6 mb-[50px] mt-[80px] bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Dashboard Overview
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Tracking progress for <span className="font-semibold text-gray-700">{studentData?.name || user?.displayName || "Student"}</span>
            </p>
          </div>
          <div className="text-right">
            {studentData?.batch && (
                <span className="bg-azure-50 text-azure-700 px-3 py-1 rounded-full text-sm font-medium border border-azure-100">
                Batch: {studentData.batch}
                </span>
            )}
          </div>
        </div>

        {/* Top Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Time Table */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiClock className="text-blue-600"/>
                Class Schedule
              </h2>
              {!timetable && <span className="text-xs text-red-400 bg-red-50 px-2 py-1 rounded">No Schedule Found</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 border-b border-gray-200">Day</th>
                    {Array.from({length: 8}, (_, i) => (
                        <th key={i} className="px-3 py-3 text-center font-medium text-gray-700 border-b border-gray-200">H{i+1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {timetable ? renderTimetable() : (
                        <tr>
                            <td colSpan={9} className="p-6 text-center text-gray-400">
                                Schedule not available for {studentData?.batch || "this batch"}.
                            </td>
                        </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden lg:col-span-1">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiSpeaker className="text-yellow-600"/>
                Announcements
              </h2>
            </div>
            <div className="p-4 space-y-4">
              {notifications.length > 0 ? notifications.map((notif: any) => (
                  <div key={notif.id} className="space-y-1 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                      <span className="font-medium text-gray-900 text-sm line-clamp-1">
                        {notif.title}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 pl-3.5">
                      {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleDateString() : 'Recent'}
                    </p>
                    <p className="text-xs text-gray-600 pl-3.5 line-clamp-2">{notif.message}</p>
                  </div>
              )) : (
                  <p className="text-center text-gray-400 text-sm py-4">No new notices for parents.</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Performance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sm:col-span-2 lg:col-span-1">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiBarChart2 className="text-green-600"/>
                Academic Performance
              </h2>
            </div>
            <div className="p-6">
               {performance.length > 0 ? (
                    <div className="grid grid-cols-5 gap-2 h-48">
                        {performance.map((item, i) => (
                        <div key={i} className="relative h-full w-full flex flex-col items-center justify-end">
                            <div
                            className={`${item.color || 'bg-blue-500'} absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-300`}
                            style={{ height: `${item.percentage || 0}%` }}
                            ></div>
                            <span className="text-[10px] text-gray-600 mt-2 font-medium relative z-10 truncate w-full text-center" title={item.subject}>
                            {item.subject.substring(0, 3).toUpperCase()}
                            </span>
                            <span className="text-[10px] text-gray-500 relative z-10">
                            {item.percentage}%
                            </span>
                        </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                        No recent exam data available.
                    </div>
                )}
            </div>
          </div>

          {/* Reminders / Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiAlertCircle className="text-red-600"/>
                Status & Alerts
              </h2>
            </div>
            <div className="p-4 space-y-4">
              {pendingFees.length > 0 ? (
                  pendingFees.map((fee, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                        <p className="text-sm font-medium text-gray-900">
                            Fee Pending: {fee.item}
                        </p>
                        <p className="text-xs text-red-700">
                            Amount: ₹{fee.amount} • Due: {fee.dueDate?.toDate().toLocaleDateString()}
                        </p>
                        </div>
                    </div>
                  ))
              ) : (
                   <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <FiCheckCircle className="text-green-600 mt-0.5"/>
                        <div>
                        <p className="text-sm font-medium text-gray-900">
                            No Pending Dues
                        </p>
                        <p className="text-xs text-green-700">
                            All fees are paid up to date.
                        </p>
                        </div>
                    </div>
              )}
              
              {/* Absences Alert logic could go here */}
            </div>
          </div>

          {/* Attendance Summary (Mocked from performance for now) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiCheckCircle className="text-blue-600"/>
                Attendance Summary
              </h2>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-gray-900 mb-2">92%</div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: "92%" }}
                ></div>
              </div>
              <div className="space-y-2 text-sm max-h-[150px] overflow-y-auto">
                 {performance.length > 0 ? performance.slice(0, 5).map((p, i) => (
                     <div key={i} className="flex justify-between">
                        <span className="text-gray-600 truncate w-32">{p.subject}</span>
                        <span className="font-medium text-green-600">Present</span>
                     </div>
                 )) : (
                     <p className="text-gray-400 text-xs italic">Subject-wise attendance will appear here.</p>
                 )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
