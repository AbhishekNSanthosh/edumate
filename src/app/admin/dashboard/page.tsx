"use client"
import { collection, getCountFromServer, query, getDocs, limit, orderBy } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
      students: 0,
      faculty: 0, 
      departments: 0,
  })
  const [recentStudents, setRecentStudents] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
        try {
            // Count Students
            const studentColl = collection(db, "students");
            const studentSnapshot = await getCountFromServer(studentColl);
            
            // Count Departments
            const deptColl = collection(db, "departments");
            const deptSnapshot = await getCountFromServer(deptColl);

            // Fetch Recent Students (Act as "Activity Log" for now)
            const recentQuery = query(collection(db, "students"), orderBy("createdAt", "desc"), limit(5));
            const recentDocs = await getDocs(recentQuery);
            const recentList = recentDocs.docs.map(d => ({ id: d.id, ...d.data() }));

            setStats({
                students: studentSnapshot.data().count,
                faculty: 0, 
                departments: deptSnapshot.data().count,
            })
            setRecentStudents(recentList);

        } catch (error) {
            console.error("Error fetching dashboard stats:", error);
        } finally {
            setLoading(false)
        }
    }
    fetchStats();
  }, [])

  // Static for now, as we don't have attendance/events modules yet
  const attendanceSummary = {
    overall: 'N/A',
    present: 0,
    absent: 0,
  }

  const upcomingEvents = [
    { type: 'Exam', title: 'Midterm - Calculus I', date: 'Jan 15, 2026' },
  ]

  const notifications = [
    { message: 'System maintenance scheduled', time: 'Tomorrow', type: 'info' },
  ]
  
  const quickActions = [
    { label: 'Add Student', icon: '👤', path: '/admin/student/add' },
    { label: 'View Students', icon: '🎓', path: '/admin/student' },
    { label: 'Manage Departments', icon: '🏢', path: '/admin/department' },
  ]

  const SkeletonLoader = () => (
    <div className="animate-pulse">
        {/* Header Skeleton */}
        <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>

        {/* Stats Row Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-gray-200 h-32">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-10 bg-gray-200 rounded w-1/4"></div>
                </div>
            ))}
        </div>

        {/* Middle Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
             <div className="bg-white p-6 rounded-lg shadow-md h-64">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
                <div className="flex justify-between items-center mt-10">
                    <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                </div>
             </div>
             <div className="bg-white p-6 rounded-lg shadow-md h-64">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-gray-100 rounded w-full"></div>
                    ))}
                </div>
             </div>
        </div>

        {/* Bottom Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
             {[1, 2].map(c => (
                <div key={c} className="bg-white p-6 rounded-lg shadow-md h-64">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex space-x-3">
                                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                     <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                     <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             ))}
        </div>
    </div>
  )

  if (loading) {
      return (
        <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <SkeletonLoader />
            </div>
        </div>
      )
  }

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Centralized overview of institutional operations</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Students</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.students.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Faculty</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.faculty.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Departments</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.departments}</p>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Summary</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-blue-500">{attendanceSummary.overall}</p>
                <p className="text-gray-600">Overall Attendance</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-medium text-green-600">{attendanceSummary.present} Present</p>
                <p className="text-lg font-medium text-red-600">{attendanceSummary.absent} Absent</p>
              </div>
            </div>
          </div>

          {/* Upcoming Exams and Assignments */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Exams & Assignments</h3>
            <ul className="space-y-2">
              {upcomingEvents.map((event, index) => (
                <li key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                  <div>
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full mr-2">
                      {event.type}
                    </span>
                    <span className="font-medium">{event.title}</span>
                  </div>
                  <span className="text-sm text-gray-500">{event.date}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Notifications and Activity Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Notifications & Alerts</h3>
            <ul className="space-y-3">
              {notifications.map((notif, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${notif.type === 'alert' ? 'bg-red-500' : notif.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                  <div>
                    <p className="text-sm text-gray-900">{notif.message}</p>
                    <p className="text-xs text-gray-500">{notif.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Student Additions</h3>
            <ul className="space-y-2">
              {recentStudents.length === 0 ? <p className="text-gray-500">No recent activity.</p> : 
               recentStudents.map((student, index) => (
                <li key={index} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded">
                  <span className="text-gray-900 font-medium">{student.name} ({student.regNumber})</span>
                  <span className="text-gray-500 text-xs">Joined: {new Date(student.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Quick-Access Shortcuts */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick-Access Shortcuts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                onClick={() => router.push(action.path)}
              >
                <span className="text-2xl mb-2">{action.icon}</span>
                <span className="text-sm font-medium text-blue-700 text-center">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}