"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import Link from "next/link";
import Skeleton from "../../../common/components/Skeleton";

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  // State for dynamic data
  const [timetable, setTimetable] = useState<any[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
          if (data.assignedSubjects) setAssignedSubjects(data.assignedSubjects);
        }

        // 2. Fetch Today's Timetable (Mocking query for now as timetable structure varies)
        // In a real app: query(collection(db, 'timetable'), where('facultyId', '==', user.uid), where('day', '==', currentDay))
        // For now, we will leave it empty or show a placeholder message if no data found
        // const timetableQuery = query(collection(db, "timetables"), where("facultyId", "==", user.uid));
        // const timetableSnap = await getDocs(timetableQuery);
        // setTimetable(timetableSnap.docs.map(d => d.data()));

        // 3. Fetch Leaves (Client-side sort to avoid composite index requirement)
        const leaveQuery = query(
          collection(db, "leaves"),
          where("userId", "==", user.uid),
        );
        const leaveSnap = await getDocs(leaveQuery);
        const allLeaves = leaveSnap.docs.map((d) => d.data());
        const sortedLeaves = allLeaves.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setLeaves(sortedLeaves.slice(0, 1));

        // 4. Fetch Notifications (Faculty-specific + personalized)
        const [roleNotifSnap, personalNotifSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "notifications"),
              where("audience", "array-contains", "faculty"),
              limit(10),
            ),
          ),
          getDocs(
            query(
              collection(db, "notifications"),
              where("targetUid", "==", user.uid),
              limit(10),
            ),
          ),
        ]);
        const notifMap = new Map<string, any>();
        [...roleNotifSnap.docs, ...personalNotifSnap.docs].forEach((d) =>
          notifMap.set(d.id, { id: d.id, ...d.data() }),
        );
        const sortedNotifs = Array.from(notifMap.values())
          .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
          .slice(0, 5);
        setNotifications(sortedNotifs);
      } catch (error) {
        console.error("Error loading dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const quickActions = [
    { label: "My Attendance", icon: "📝", path: "/faculty/my-attendance" },
    {
      label: "Student Leaves",
      icon: "👥",
      path: "/faculty/student-leave-management",
    },
    { label: "Evaluations", icon: "📊", path: "/faculty/evaluation" },
    { label: "My Timetable", icon: "📅", path: "/faculty/timetable" },
    { label: "Apply Leave", icon: "📄", path: "/faculty/leave-management" },
    { label: "Messages", icon: "🔔", path: "/faculty/message-box" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-yellow-100 text-yellow-800";
      case "ongoing":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading)
    return (
      <div className="w-full p-6 space-y-8 bg-gray-50 min-h-screen">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>

        {/* Quick Access Skeleton */}
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <Skeleton className="h-7 w-48 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>

        {/* Timetable Skeleton */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 border border-gray-200 rounded-lg h-64">
            <Skeleton className="h-7 w-48 mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
          <div className="bg-white p-6 border border-gray-200 rounded-lg h-64">
            <Skeleton className="h-7 w-48 mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-light text-gray-900">
            Faculty Dashboard
          </h1>
          <p className="text-gray-500 font-light mt-1">
            Welcome back,{" "}
            <span className="font-medium text-gray-900">
              {profile?.name || "Professor"}
            </span>
            . Here is your overview for {todayDate}.
          </p>
        </div>

        {/* Quick Access Shortcuts */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Quick Access
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action, index) => (
              <Link href={action.path} key={index}>
                <div className="flex flex-col items-center justify-center p-4 bg-white hover:bg-gray-50 rounded-lg transition-all border border-gray-200 hover:border-blue-300 cursor-pointer h-full group">
                  <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                    {action.icon}
                  </span>
                  <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600 text-center">
                    {action.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Today’s Timetable */}
        <div className="bg-white rounded-xl border border-gray-200 mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
            <h2 className="text-lg font-medium text-gray-900">
              Today's Timetable
            </h2>
            <Link
              href="/faculty/timetable"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View Full Schedule &rarr;
            </Link>
          </div>
          <div className="overflow-x-auto">
            {timetable.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Batch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Room
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {timetable.map((slot, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {slot.time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {slot.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {slot.batch}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {slot.room}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(slot.status)}`}
                        >
                          {slot.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 hover:border-blue-400 px-3 py-1 rounded">
                          Mark Attendance
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-10 text-center text-gray-400">
                <p>No classes scheduled for today.</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Assigned Subjects */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-100 pb-2">
              Assigned Subjects
            </h2>
            {assignedSubjects.length > 0 ? (
              <ul className="space-y-2">
                {assignedSubjects.map((assignment: any, index: number) => (
                  <li
                    key={index}
                    className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100"
                  >
                    <div>
                      <span className="font-medium text-gray-900 block">
                        {assignment.subject}
                      </span>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">
                        {assignment.batch}
                      </span>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                      📚
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 text-sm py-4 text-center">
                No subjects currently assigned.
              </p>
            )}
          </div>

          {/* Recent Notifications */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
              <h2 className="text-lg font-medium text-gray-900">
                Recent Announcements
              </h2>
              <Link
                href="/faculty/message-box"
                className="text-xs text-blue-600 hover:underline"
              >
                View All
              </Link>
            </div>

            <ul className="space-y-4">
              {notifications.length > 0 ? (
                notifications.slice(0, 3).map((notif: any) => (
                  <li
                    key={notif.id}
                    className="p-3 bg-blue-50/50 rounded-lg border border-blue-100/50"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-medium text-gray-900 text-sm">
                        {notif.title}
                      </div>
                      <div className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                  </li>
                ))
              ) : (
                <p className="text-gray-400 text-sm py-4 text-center">
                  No recent announcements.
                </p>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
