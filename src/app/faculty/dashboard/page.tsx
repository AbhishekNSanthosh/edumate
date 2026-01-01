"use client"
import React, { useEffect, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import Link from 'next/link'

export default function FacultyDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  
  // State for dynamic data
  const [timetable, setTimetable] = useState<any[]>([])
  const [assignedSubjects, setAssignedSubjects] = useState<any[]>([])
  const [leaves, setLeaves] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])

  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. Fetch Profile
            const profileRef = doc(db, "faculty", user.uid);
            const profileSnap = await getDoc(profileRef);
            if (profileSnap.exists()) {
                const data = profileSnap.data();
                setProfile(data);
                // Assume subjects are stored in profile or fetch from separate collection if needed
                if(data.assignedSubjects) setAssignedSubjects(data.assignedSubjects); 
            }

            // 2. Fetch Today's Timetable (Mocking query for now as timetable structure varies)
            // In a real app: query(collection(db, 'timetable'), where('facultyId', '==', user.uid), where('day', '==', currentDay))
            // For now, we will leave it empty or show a placeholder message if no data found
            // const timetableQuery = query(collection(db, "timetables"), where("facultyId", "==", user.uid));
            // const timetableSnap = await getDocs(timetableQuery);
            // setTimetable(timetableSnap.docs.map(d => d.data()));
            
            // 3. Fetch Leaves (Client-side sort to avoid composite index requirement)
            const leaveQuery = query(collection(db, "leaves"), where("userId", "==", user.uid));
            const leaveSnap = await getDocs(leaveQuery);
            const allLeaves = leaveSnap.docs.map(d => d.data());
            const sortedLeaves = allLeaves.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setLeaves(sortedLeaves.slice(0, 1));

            // 4. Fetch Notifications (Announcements)
            const notifQuery = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(5));
            const notifSnap = await getDocs(notifQuery);
            setNotifications(notifSnap.docs.map(d => ({id: d.id, ...d.data()})));

        } catch (error) {
            console.error("Error loading dashboard data", error);
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, [user]);

  const quickActions = [
    { label: 'My Attendance', icon: '📝', path: '/faculty/my-attendance' },
    { label: 'Student Leaves', icon: '👥', path: '/faculty/student-leave-management' },
    { label: 'Evaluations', icon: '📊', path: '/faculty/evaluation' },
    { label: 'My Timetable', icon: '📅', path: '/faculty/timetable' },
    { label: 'Apply Leave', icon: '📄', path: '/faculty/leave-management' },
    { label: 'Messages', icon: '🔔', path: '/faculty/message-box' },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-yellow-100 text-yellow-800';
      case 'ongoing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  if (loading) return (
      <div className="mt-[100px] flex items-center justify-center h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
  )

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Faculty Dashboard</h1>
          <p className="text-gray-600">Welcome back, {profile?.name || 'Professor'}. Here is your overview for {todayDate}.</p>
        </div>

        {/* Quick Access Shortcuts */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action, index) => (
              <Link href={action.path} key={index}>
                  <div
                    className="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 cursor-pointer h-full"
                  >
                    <span className="text-2xl mb-2">{action.icon}</span>
                    <span className="text-sm font-medium text-blue-700 text-center">{action.label}</span>
                  </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Today’s Timetable */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Today's Timetable</h2>
            <Link href="/faculty/timetable" className="text-sm text-blue-600 hover:underline">View Full Schedule</Link>
          </div>
          <div className="overflow-x-auto">
            {timetable.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {timetable.map((slot, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{slot.time}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{slot.subject}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{slot.batch}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{slot.room}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(slot.status)}`}>
                            {slot.status}
                        </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">Mark Attendance</button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            ) : (
                <div className="p-8 text-center text-gray-500">
                    <p>No classes scheduled for today.</p>
                </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
             {/* Assigned Subjects */}
           <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Assigned Subjects</h2>
            {assignedSubjects.length > 0 ? (
                <ul className="space-y-3">
                {assignedSubjects.map((assignment: any, index: number) => (
                    <li key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div>
                        <span className="font-medium text-gray-900">{assignment.subject}</span>
                        <span className="text-sm text-gray-500 ml-2">({assignment.batch})</span>
                    </div>
                    </li>
                ))}
                </ul>
            ) : (
                <p className="text-gray-500 text-sm">No subjects currently assigned to your profile.</p>
            )}
          </div>

          {/* Recent Notifications */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Announcements</h2>
            <ul className="space-y-3">
              {notifications.length > 0 ? notifications.slice(0, 3).map((notif: any) => (
                <li key={notif.id} className="p-3 bg-gray-50 rounded-md">
                  <div className="font-medium text-gray-900">{notif.title}</div>
                  <div className="text-xs text-gray-500">{new Date(notif.createdAt).toLocaleDateString()}</div>
                  <p className="text-sm text-gray-700 mt-1 line-clamp-2">{notif.message}</p>
                </li>
              )) : (
                  <p className="text-gray-500 text-sm">No recent announcements.</p>
              )}
            </ul>
            <Link href="/faculty/message-box" className="block mt-4">
                <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                View All Messages
                </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}