"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import Link from "next/link";
import Skeleton from "../../../common/components/Skeleton";
import {
  IoTimeOutline,
  IoCalendarOutline,
  IoLogInOutline,
  IoLogOutOutline,
  IoCheckmarkCircleOutline,
} from "react-icons/io5";

interface AttendanceRecord {
  id?: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // ISO String
  checkOut?: string; // ISO String
  status: "present" | "absent" | "leave" | "holiday" | "weekend" | "upcoming";
  notes?: string;
  leaveId?: string;
}

// Helper to get local YYYY-MM-DD string
const getLocalYYYYMMDD = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().split("T")[0];
};

export default function page() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const today = new Date();
  const todayStr = getLocalYYYYMMDD(today);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const startOfMonth = new Date(`${selectedMonth}-01`);
        const endOfMonth = new Date(
          startOfMonth.getFullYear(),
          startOfMonth.getMonth() + 1,
          0,
        );

        // 1. Fetch Check-ins (faculty_attendance)
        const attendanceQuery = query(
          collection(db, "faculty_attendance"),
          where("facultyId", "==", user.uid),
        );
        const attendanceSnap = await getDocs(attendanceQuery);
        const checkIns = attendanceSnap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as any)
          .filter(
            (doc: any) =>
              doc.date >= getLocalYYYYMMDD(startOfMonth) &&
              doc.date <= getLocalYYYYMMDD(endOfMonth),
          );

        // 2. Fetch Approved Leaves
        const leaveQuery = query(
          collection(db, "leaves"),
          where("userId", "==", user.uid),
          where("status", "==", "approved"),
          // Note: Complex date overlap queries are hard in NoSQL without splitting ranges.
          // For simplicity, we fetch all user leaves and filter client side for this month
        );
        const leaveSnap = await getDocs(leaveQuery);
        const leaves = leaveSnap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as any,
        );

        // 3. Generate Calendar for Month
        const records: AttendanceRecord[] = [];
        const daysInMonth = endOfMonth.getDate();

        for (let i = 1; i <= daysInMonth; i++) {
          const dateObj = new Date(
            startOfMonth.getFullYear(),
            startOfMonth.getMonth(),
            i,
          );
          const dateStr = getLocalYYYYMMDD(dateObj);
          const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday

          // Find Check-in
          const checkIn = checkIns.find((c) => c.date === dateStr);

          // Find Leave (Assuming single day range for simplicity or filter range)
          // Expanded logic: Check if dateStr is strictly within leave startDate and endDate
          const onLeave = leaves.find((l) => {
            const start = l.startDate.split("T")[0];
            const end = l.endDate.split("T")[0];
            return dateStr >= start && dateStr <= end;
          });

          let status: AttendanceRecord["status"] = "absent";
          let notes = "";

          if (checkIn) {
            status = "present";
          } else if (onLeave) {
            status = "leave";
            notes = onLeave.reason || "Approved Leave";
          } else if (dayOfWeek === 0 || dayOfWeek === 6) {
            status = "weekend";
          } else if (dateStr > todayStr) {
            status = "upcoming";
          }

          records.push({
            id: checkIn?.id,
            date: dateStr,
            checkIn: checkIn?.checkInTime,
            checkOut: checkIn?.checkOutTime,
            status,
            notes,
            leaveId: onLeave?.id,
          });
        }

        // Determine Today's Record separately for the main interaction
        const todayRec = records.find((r) => r.date === todayStr);
        setTodayRecord(todayRec || null);

        // Sort Descending for view
        setAttendanceRecords(
          records.sort((a, b) => b.date.localeCompare(a.date)),
        );
      } catch (error) {
        console.error("Error fetching attendance", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendanceData();
  }, [user, selectedMonth, refreshKey]);

  const handleCheckIn = async () => {
    if (!user || actionLoading) return;
    if (todayRecord) {
      toast.error("Already checked in today");
      return;
    }
    setActionLoading(true);
    try {
      const now = new Date();
      // Double check if record exists to prevent race conditions or stale state
      const q = query(
        collection(db, "faculty_attendance"),
        where("facultyId", "==", user.uid),
        where("date", "==", todayStr),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        toast.error("Attendance already marked for today");
        setRefreshKey((k) => k + 1);
        return;
      }

      await addDoc(collection(db, "faculty_attendance"), {
        facultyId: user.uid,
        date: todayStr,
        checkInTime: now.toISOString(),
        createdAt: now.toISOString(),
      });
      toast.success("Checked In Successfully");
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
      toast.error("Check-in failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user || !todayRecord?.id || actionLoading) return;
    setActionLoading(true);
    try {
      const now = new Date();
      await updateDoc(doc(db, "faculty_attendance", todayRecord.id), {
        checkOutTime: now.toISOString(),
      });
      toast.success("Checked Out Successfully");
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
      toast.error("Check-out failed");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800 border-green-200";
      case "leave":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "holiday":
        return "bg-yellow-50 text-yellow-800 border-yellow-200";
      case "weekend":
        return "bg-gray-100 text-gray-600 border-gray-200";
      case "absent":
        return "bg-red-50 text-red-800 border-red-100";
      case "upcoming":
        return "bg-gray-50 text-gray-400 border-gray-100";
      default:
        return "bg-gray-50 text-gray-500";
    }
  };

  // Stats
  const presentDays = attendanceRecords.filter(
    (r) => r.status === "present",
  ).length;
  const leaveDays = attendanceRecords.filter(
    (r) => r.status === "leave",
  ).length;
  const absentDays = attendanceRecords.filter(
    (r) => r.status === "absent" && r.date < todayStr,
  ).length; // Only count past absent days

  if (loading)
    return (
      <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-48" />
        </div>

        <div className="mb-6 md:mb-8 bg-white p-8 rounded-xl border border-gray-200 flex flex-col items-center">
          <Skeleton className="h-6 w-96 mb-8" />
          <div className="flex gap-4">
            <Skeleton className="h-32 w-32 rounded-full" />
            <Skeleton className="h-32 w-32 rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 md:mb-8">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-xl border border-gray-200"
            >
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mb-6 md:mb-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-48" />
        </div>

        <div className="mb-6 md:mb-8 bg-white p-8 rounded-xl border border-gray-100 flex flex-col items-center">
          <Skeleton className="h-6 w-96 mb-8" />
          <div className="flex gap-4">
            <Skeleton className="h-32 w-32 rounded-full" />
            <Skeleton className="h-32 w-32 rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 md:mb-8">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-xl border border-gray-100"
            >
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <Skeleton className="h-7 w-48" />
          </div>
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-light text-gray-900">My Attendance</h1>
            <p className="text-gray-500 font-light mt-1">
              Manage daily check-ins and view monthly history.
            </p>
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-black focus:border-black text-sm"
          />
        </div>

        {/* Today's Action Card */}
        <div className="bg-white p-8 rounded-xl border border-gray-100 mb-6 md:mb-8 flex flex-col items-center justify-center text-center">
          <h2 className="text-xl font-medium text-gray-900 mb-6">
            Today,{" "}
            <span className="font-semibold">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </h2>

          <div className="space-y-4">
            {todayRecord?.status === "leave" ? (
              <div className="px-6 py-3 bg-blue-100 text-blue-800 rounded-full font-bold">
                You are on Leave Today
              </div>
            ) : todayRecord?.status === "weekend" ? (
              <div className="px-6 py-3 bg-gray-100 text-gray-600 rounded-full font-bold">
                It's the Weekend!
              </div>
            ) : (
              <>
                <div className="flex gap-6">
                  {/* Check In Button */}
                  {!todayRecord?.checkIn ? (
                    <button
                      onClick={handleCheckIn}
                      disabled={actionLoading}
                      className={`flex flex-col items-center gap-2 group ${actionLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="p-6 bg-green-500 text-white rounded-full group-hover:bg-green-600 transition-all transform group-hover:scale-105 active:scale-95">
                        {actionLoading ? (
                          <div className="animate-spin h-8 w-8 border-2 border-white rounded-full border-t-transparent"></div>
                        ) : (
                          <IoLogInOutline size={32} />
                        )}
                      </div>
                      <span className="font-medium text-gray-700 mt-2">
                        {actionLoading ? "Checking In..." : "Check In"}
                      </span>
                    </button>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-6 bg-green-50 text-green-600 rounded-full border border-green-100">
                        <IoCheckmarkCircleOutline size={32} />
                      </div>
                      <div className="mt-2">
                        <span className="block font-bold text-green-700 text-sm">
                          Checked In
                        </span>
                        <span className="text-xs text-green-600 font-mono">
                          {new Date(todayRecord.checkIn).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Check Out Button */}
                  {todayRecord?.checkIn && !todayRecord?.checkOut ? (
                    <button
                      onClick={handleCheckOut}
                      disabled={actionLoading}
                      className={`flex flex-col items-center gap-2 group ${actionLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="p-6 bg-red-500 text-white rounded-full group-hover:bg-red-600 transition-all transform group-hover:scale-105 active:scale-95">
                        {actionLoading ? (
                          <div className="animate-spin h-8 w-8 border-2 border-white rounded-full border-t-transparent"></div>
                        ) : (
                          <IoLogOutOutline size={32} />
                        )}
                      </div>
                      <span className="font-medium text-gray-700 mt-2">
                        {actionLoading ? "Checking Out..." : "Check Out"}
                      </span>
                    </button>
                  ) : todayRecord?.checkOut ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-6 bg-gray-50 text-gray-600 rounded-full border border-gray-100">
                        <IoLogOutOutline size={32} />
                      </div>
                      <div className="mt-2">
                        <span className="block font-bold text-gray-700 text-sm">
                          Checked Out
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          {new Date(todayRecord.checkOut).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 md:mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-100 hover:border-green-300 transition-colors">
            <p className="text-gray-500 text-xs uppercase font-semibold">
              Present Days
            </p>
            <p className="text-3xl font-light text-gray-900 mt-2">
              {presentDays}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 hover:border-blue-300 transition-colors">
            <p className="text-gray-500 text-xs uppercase font-semibold">
              Leaves Taken
            </p>
            <p className="text-3xl font-light text-gray-900 mt-2">
              {leaveDays}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 hover:border-red-300 transition-colors">
            <p className="text-gray-500 text-xs uppercase font-semibold">
              Absences (Past)
            </p>
            <p className="text-3xl font-light text-gray-900 mt-2">
              {absentDays}
            </p>
          </div>
        </div>

        {/* Monthly History */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/30">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <IoCalendarOutline /> Monthly History
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Check In
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Check Out
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendanceRecords.map((record) => (
                  <tr
                    key={record.date}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(record.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide rounded-full border ${getStatusColor(record.status)}`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {record.checkIn
                        ? new Date(record.checkIn).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {record.checkOut
                        ? new Date(record.checkOut).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">
                      {record.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
