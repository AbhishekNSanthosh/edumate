'use client';

import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { collection, query, where, getDocs, orderBy, limit, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [notifications, setNotifications] = useState<any[]>([]);
  const [recentLeave, setRecentLeave] = useState<any | null>(null);
  const [timetable, setTimetable] = useState<any | null>(null);
  const [performance, setPerformance] = useState<any[]>([]);
  
  // Basic info (mocked or derived)
  const [batchCode, setBatchCode] = useState('CSE 2022-26'); 

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
          setLoading(false); 
          return; 
      }

      try {
        setLoading(true);
        
        // 1. Fetch Notifications (Announcements) and Filter Client-Side
        const notifQuery = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(20)); // Fetch more to filter locally
        const notifSnap = await getDocs(notifQuery);
        
        const filteredNotifs = notifSnap.docs
            .map(d => ({id: d.id, ...d.data()} as any))
            .filter(n => {
                // If audience is defined, must include 'student' or 'all'
                if (n.audience) {
                    return n.audience.includes('student') || n.audience.includes('all');
                }
                // Legacy/Fallback: Exclude known admin/faculty-only titles if no audience tag
                const adminTitles = ['New Student Added', 'New Faculty Added'];
                if (adminTitles.includes(n.title)) return false;
                
                return true; // Default to showing if unsure (or change to false for strict mode)
            })
            .slice(0, 3); // Take top 3 after filtering

        setNotifications(filteredNotifs);

        // 2. Fetch Recent Leave
        const leaveQuery = query(collection(db, "leaves"), where("userId", "==", user.uid));
        const leaveSnap = await getDocs(leaveQuery);
        const allLeaves = leaveSnap.docs.map(d => d.data());
        allLeaves.sort((a, b) => {
            const dateA = a.createdAt?.seconds ? a.createdAt.seconds : 0;
            const dateB = b.createdAt?.seconds ? b.createdAt.seconds : 0;
            return dateB - dateA;
        });
        if (allLeaves.length > 0) setRecentLeave(allLeaves[0]);

        // 3. Fetch Timetable
        // Assuming one timetable document per batch
        const timetableQuery = query(collection(db, "timetables"), where("batch", "==", batchCode));
        const timetableSnap = await getDocs(timetableQuery);
        if (!timetableSnap.empty) {
            setTimetable(timetableSnap.docs[0].data());
        }

        // 4. Fetch Performance Reports
        // These are individual reports for the student
        const performanceQuery = query(collection(db, "evaluation_reports"), where("studentId", "==", user.uid));
        const performanceSnap = await getDocs(performanceQuery);
        setPerformance(performanceSnap.docs.map(d => d.data()));

      } catch (error) {
        console.error("Error fetching student dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, batchCode]);

  const seedDashboardData = async () => {
      if (!user) return;
      if (!confirm("Seed sample Timetable and Performance data?")) return;

      try {
          // 1. Seed Timetable for Batch
          // Check if exists first to avoid dupes
          const timetableQuery = query(collection(db, "timetables"), where("batch", "==", batchCode));
          const timetableSnap = await getDocs(timetableQuery);
          
          if (timetableSnap.empty) {
               await addDoc(collection(db, "timetables"), {
                  batch: batchCode,
                  schedule: {
                      Monday: ['AI', 'ML', 'SE', 'OE', 'Lunch', 'PR', 'AI Lab', 'ML Lab'],
                      Tuesday: ['SE', 'PR', 'ML', 'Lunch', 'OE', 'SE Lab', 'OE Lab', 'SE'],
                      Wednesday: ['OE', 'SE', 'AI', 'ML', 'Lunch', 'SE', 'PR Lab', 'AI Lab'],
                      Thursday: ['OE', 'SE', 'ML', 'AI', 'Lunch', 'PR', 'ML Lab', 'SE Lab'],
                      Friday: ['PR', 'OE', 'SE', 'AI', 'Lunch', 'ML', 'OE Lab', 'PR Lab'],
                  },
                  createdAt: serverTimestamp()
               });
          }

          // 2. Seed Performance Reports for Student
          const performanceQuery = query(collection(db, "evaluation_reports"), where("studentId", "==", user.uid));
          const performanceSnap = await getDocs(performanceQuery);
          
          if (performanceSnap.empty) {
              const subjects = [
                  { subject: 'Artificial Intelligence', grade: 'A', percent: 85, color: 'bg-blue-500' },
                  { subject: 'Machine Learning', grade: 'O', percent: 95, color: 'bg-green-500' },
                  { subject: 'Software Engineering', grade: 'B+', percent: 78, color: 'bg-yellow-500' },
                  { subject: 'Open Elective', grade: 'B', percent: 70, color: 'bg-orange-500' },
                  { subject: 'Project', grade: 'A+', percent: 90, color: 'bg-purple-500' },
              ];

              for (const sub of subjects) {
                  await addDoc(collection(db, "evaluation_reports"), {
                      studentId: user.uid,
                      student: user.displayName || 'Student',
                      regNumber: 'REG001', // Mock
                      subject: sub.subject,
                      overallGrade: sub.grade,
                      percentage: sub.percent,
                      color: sub.color,
                      status: 'passed',
                      cgpa: 8.5,
                      facultyId: 'global', // simplified
                      createdAt: serverTimestamp()
                  });
              }
          }

          toast.success("Dashboard data seeded! Refreshing...");
          window.location.reload();

      } catch (error) {
          console.error(error);
          toast.error("Failed to seed data");
      }
  }

  // Helper to render timetable rows
  const renderTimetable = () => {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const defaultSchedule = [
          ['No Data', '-', '-', '-', '-', 'Lunch', '-', '-', '-'],
      ];
      
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
        <div className="w-full p-4 md:p-6 mb-[50px] mt-[80px] bg-gray-50 min-h-screen animate-pulse">
          <div className="max-w-7xl mx-auto">
            {/* Header Skeleton */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <div className="h-8 w-64 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-48 bg-gray-200 rounded"></div>
              </div>
              <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
            </div>

            {/* Top Section Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Timetable Skeleton */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 h-64 p-6">
                <div className="flex justify-between mb-4">
                    <div className="h-6 w-32 bg-gray-200 rounded"></div>
                    <div className="h-6 w-20 bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-3">
                    <div className="h-8 w-full bg-gray-100 rounded"></div>
                    <div className="h-8 w-full bg-gray-100 rounded"></div>
                    <div className="h-8 w-full bg-gray-100 rounded"></div>
                    <div className="h-8 w-full bg-gray-100 rounded"></div>
                </div>
              </div>

              {/* Announcements Skeleton */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-64 p-6 col-span-1">
                <div className="h-6 w-40 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-4">
                    <div className="h-16 w-full bg-gray-100 rounded"></div>
                    <div className="h-16 w-full bg-gray-100 rounded"></div>
                </div>
              </div>
            </div>

            {/* Bottom Section Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Performance Skeleton */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-60 p-6 sm:col-span-2 lg:col-span-1">
                 <div className="h-6 w-32 bg-gray-200 rounded mb-6"></div>
                 <div className="flex items-end justify-between h-32 px-2 gap-2">
                     <div className="h-20 w-8 bg-gray-100 rounded"></div>
                     <div className="h-28 w-8 bg-gray-100 rounded"></div>
                     <div className="h-16 w-8 bg-gray-100 rounded"></div>
                     <div className="h-24 w-8 bg-gray-100 rounded"></div>
                     <div className="h-12 w-8 bg-gray-100 rounded"></div>
                 </div>
              </div>

              {/* Reminders Skeleton */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-60 p-6">
                  <div className="h-6 w-32 bg-gray-200 rounded mb-6"></div>
                  <div className="space-y-4">
                      <div className="h-12 w-full bg-gray-100 rounded"></div>
                      <div className="h-12 w-full bg-gray-100 rounded"></div>
                  </div>
              </div>

              {/* Attendance Skeleton */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-60 p-6">
                  <div className="h-6 w-32 bg-gray-200 rounded mb-6"></div>
                  <div className="space-y-3">
                      <div className="h-4 w-full bg-gray-100 rounded"></div>
                      <div className="h-4 w-full bg-gray-100 rounded"></div>
                      <div className="h-4 w-full bg-gray-100 rounded"></div>
                      <div className="h-4 w-full bg-gray-100 rounded"></div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      )
  }

  return (
    <div className="w-full p-4 md:p-6 mb-[50px] mt-[80px] bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Dashboard Overview
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Welcome back, <span className="font-semibold text-gray-700">{user?.displayName || 'Student'}</span>!
            </p>
          </div>
          <div className="text-right self-end sm:self-auto">
            <span className="bg-azure-50 text-azure-700 px-4 py-2 rounded-xl text-sm font-semibold border border-azure-100 shadow-sm">
              Batch: {batchCode}
            </span>
          </div>
        </div>

        {/* Top Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Time Table (Dynamic) */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
               📅 Time Table
              </h2>
              {!timetable && (
                  <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">Not synced</span>
              )}
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
                   {renderTimetable()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Announcements (Dynamic) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden lg:col-span-1">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                📢 Announcements
              </h2>
            </div>
            <div className="p-4 space-y-4">
              {notifications.length > 0 ? (
                  notifications.map((notif: any) => (
                      <div key={notif.id} className="space-y-2">
                          <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          <span className="font-medium text-gray-900 text-sm">
                              {notif.title}
                          </span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-gray-500">
                             <span>{notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleDateString() : 'Recent'}</span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">{notif.message}</p>
                      </div>
                  ))
              ) : (
                  <p className="text-gray-500 text-sm text-center py-4">No recent announcements.</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Performance (Dynamic) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sm:col-span-2 lg:col-span-1">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
               📈 Performance
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
                      No performance data
                  </div>
              )}
            </div>
          </div>

          {/* Reminders & Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
               🔔 Reminders
              </h2>
            </div>
            <div className="p-4 space-y-4">
               {recentLeave ? (
                   <div className={`flex items-start gap-3 p-3 rounded-lg ${recentLeave.status === 'Approved' ? 'bg-green-50' : recentLeave.status === 'Rejected' ? 'bg-red-50' : 'bg-yellow-50'}`}>
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${recentLeave.status === 'Approved' ? 'bg-green-500' : recentLeave.status === 'Rejected' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Leave Application</p>
                      <p className="text-xs text-gray-700">Recent request: <b>{recentLeave.status}</b></p>
                    </div>
                  </div>
               ) : (
                   <p className="text-xs text-gray-500 p-2">No recent leave activity.</p>
               )}
               
               <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Fees Pending</p>
                    <p className="text-xs text-red-700">Check portal for dues.</p>
                  </div>
                </div>
            </div>
          </div>

          {/* Attendance Summary (Static / Placeholder) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
               📝 Attendance
              </h2>
            </div>
            <div className="p-6">
                 {/* Using Performance data to mock attendance subjects for now, or just static list */}
                 {performance.length > 0 ? (
                      <div className="space-y-2 text-sm">
                          {performance.slice(0, 5).map((p, i) => (
                             <div key={i} className="flex justify-between">
                                <span className="text-gray-600 truncate w-32">{p.subject}</span>
                                <span className="font-medium text-green-600">Present</span>
                             </div>
                          ))}
                      </div>
                 ) : (
                     <div className="text-center text-gray-400 text-sm">No attendance records</div>
                 )}
            </div>
          </div>
        </div>

        {/* Development Tools */}
        {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 text-center bg-purple-50 p-4 rounded-xl border border-purple-100">
                <p className="text-xs text-purple-800 mb-2 font-semibold">Development Tools</p>
                <button 
                    onClick={seedDashboardData}
                    className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"
                >
                    + Seed Dashboard Data (Timetable & Metrics)
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
