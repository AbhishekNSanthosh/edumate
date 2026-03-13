"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  limit,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [recentLeave, setRecentLeave] = useState<any | null>(null);
  const [timetableEntries, setTimetableEntries] = useState<any[]>([]);
  const [timetableTimings, setTimetableTimings] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<{
    total: number;
    present: number;
  }>({ total: 0, present: 0 });

  const [batchId, setBatchId] = useState<string>("");
  const [batchName, setBatchName] = useState<string>("");

  const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const [selectedDay, setSelectedDay] = useState(
    WEEKDAYS.includes(today) ? today : "Monday",
  );

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 0. Fetch student doc to get batch info
        const studentDoc = await getDoc(doc(db, "students", user.uid));
        let studentBatchId = "";
        if (studentDoc.exists()) {
          const studentData = studentDoc.data();
          const studentBatch = studentData.batch || "";
          const studentDept = studentData.department || "";

          if (studentBatch) {
            const batchSnap = await getDocs(collection(db, "batches"));
            const matchedBatch = batchSnap.docs.find((d) => {
              const bName = d.data().name || "";
              return (
                bName === studentBatch ||
                bName === `${studentDept} ${studentBatch}` ||
                bName.includes(studentBatch)
              );
            });
            if (matchedBatch) {
              studentBatchId = matchedBatch.id;
              setBatchId(studentBatchId);
              setBatchName(matchedBatch.data().name || studentBatch);
            } else {
              setBatchName(
                studentDept
                  ? `${studentDept} ${studentBatch}`
                  : studentBatch,
              );
            }
          }
        }

        // 1. Fetch Notifications
        const roleQuery = query(
          collection(db, "notifications"),
          where("audience", "array-contains", "student"),
          limit(20),
        );
        const personalQuery = query(
          collection(db, "notifications"),
          where("targetUid", "==", user.uid),
          limit(10),
        );

        const [roleSnap, personalSnap] = await Promise.all([
          getDocs(roleQuery),
          getDocs(personalQuery),
        ]);

        const map = new Map<string, any>();
        [...roleSnap.docs, ...personalSnap.docs].forEach((d) =>
          map.set(d.id, { id: d.id, ...d.data() }),
        );
        const filteredNotifs = Array.from(map.values())
          .filter((n: any) => {
            if (n.targetUid && n.targetUid !== user.uid) return false;
            if (n.audience) {
              return (
                n.audience.includes("student") || n.audience.includes("all")
              );
            }
            if (n.targetUid === user.uid) return true;
            const adminTitles = ["New Student Added", "New Faculty Added"];
            if (adminTitles.includes(n.title)) return false;
            return true;
          })
          .sort((a: any, b: any) => {
            const tA =
              a.createdAt?.seconds ||
              new Date(a.createdAt || 0).getTime() / 1000;
            const tB =
              b.createdAt?.seconds ||
              new Date(b.createdAt || 0).getTime() / 1000;
            return tB - tA;
          })
          .slice(0, 5);

        setNotifications(filteredNotifs);

        // 2. Fetch Recent Leave
        const leaveQuery = query(
          collection(db, "leaves"),
          where("userId", "==", user.uid),
        );
        const leaveSnap = await getDocs(leaveQuery);
        const allLeaves = leaveSnap.docs.map((d) => d.data());
        allLeaves.sort((a, b) => {
          const dateA = a.createdAt?.seconds ? a.createdAt.seconds : 0;
          const dateB = b.createdAt?.seconds ? b.createdAt.seconds : 0;
          return dateB - dateA;
        });
        if (allLeaves.length > 0) setRecentLeave(allLeaves[0]);

        // 2b. Fetch Attendance summary
        const attendanceQuery = query(
          collection(db, "attendance"),
          where("studentId", "==", user.uid),
        );
        const attendanceSnap = await getDocs(attendanceQuery);
        const attendanceRecords = attendanceSnap.docs.map((d) => d.data());
        const presentCount = attendanceRecords.filter(
          (r) => r.status === "present" || r.status === "Present",
        ).length;
        setAttendanceSummary({
          total: attendanceRecords.length,
          present: presentCount,
        });

        // 3. Fetch Timetable
        if (studentBatchId) {
          const timetableDoc = await getDoc(
            doc(db, "timetables", studentBatchId),
          );
          if (timetableDoc.exists()) {
            const ttData = timetableDoc.data();
            setTimetableEntries(ttData.entries || []);
            setTimetableTimings(ttData.timings || []);
          }
        }

        // 4. Fetch Performance Reports
        const performanceQuery = query(
          collection(db, "evaluation_reports"),
          where("studentId", "==", user.uid),
        );
        const performanceSnap = await getDocs(performanceQuery);
        setPerformance(performanceSnap.docs.map((d) => d.data()));
      } catch (error) {
        console.error("Error fetching student dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getEntryForSlot = (day: string, time: string) => {
    return timetableEntries.find((e: any) => e.day === day && e.time === time);
  };

  const classTimings = timetableTimings.filter((t: any) => t.type === "class");
  const allTimings = timetableTimings;
  const hasTimetable = timetableEntries.length > 0 && classTimings.length > 0;

  // Today's classes for the hero card
  const todayClasses = useMemo(() => {
    if (!hasTimetable) return [];
    return allTimings
      .map((slot: any) => {
        if (slot.type === "interval") return { ...slot, isBreak: true };
        const entry = getEntryForSlot(today, slot.time);
        return entry ? { ...entry, timing: slot.time } : null;
      })
      .filter(Boolean);
  }, [timetableEntries, timetableTimings, today]);

  // Currently active class
  const currentSlot = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const slot of allTimings) {
      if (slot.type === "interval") continue;
      const parts = slot.time.split(" - ");
      if (parts.length !== 2) continue;

      const parseTime = (t: string) => {
        const match = t.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return 0;
        let h = parseInt(match[1]);
        const m = parseInt(match[2]);
        const ampm = match[3].toUpperCase();
        if (ampm === "PM" && h < 12) h += 12;
        if (ampm === "AM" && h === 12) h = 0;
        return h * 60 + m;
      };

      const start = parseTime(parts[0]);
      const end = parseTime(parts[1]);
      if (currentMinutes >= start && currentMinutes < end) {
        return slot.time;
      }
    }
    return null;
  }, [timetableTimings]);

  // Color palette for timetable cells
  const subjectColors: Record<string, { bg: string; text: string }> = {};
  const colorPalette = [
    { bg: "bg-blue-50", text: "text-blue-700" },
    { bg: "bg-violet-50", text: "text-violet-700" },
    { bg: "bg-emerald-50", text: "text-emerald-700" },
    { bg: "bg-amber-50", text: "text-amber-700" },
    { bg: "bg-rose-50", text: "text-rose-700" },
    { bg: "bg-cyan-50", text: "text-cyan-700" },
    { bg: "bg-orange-50", text: "text-orange-700" },
    { bg: "bg-teal-50", text: "text-teal-700" },
  ];
  let colorIdx = 0;
  timetableEntries.forEach((e: any) => {
    if (e.subject && !subjectColors[e.subject]) {
      subjectColors[e.subject] = colorPalette[colorIdx % colorPalette.length];
      colorIdx++;
    }
  });

  const getSubjectColor = (subject: string) =>
    subjectColors[subject] || colorPalette[0];

  const formatTimeShort = (time: string) => {
    const part = time.split(" - ")[0]?.trim() || time;
    return part.replace(/:00/g, "").replace(/\s+/g, "");
  };

  if (loading) {
    return (
      <div className="w-full p-4 md:p-6 bg-gray-50/50 min-h-screen">
        <div className="max-w-7xl mx-auto animate-pulse">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <div className="h-8 w-56 bg-gray-200 rounded-lg mb-3"></div>
              <div className="h-4 w-40 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-10 w-36 bg-gray-200 rounded-xl"></div>
          </div>
          <div className="bg-white rounded-2xl p-6 mb-6">
            <div className="h-6 w-40 bg-gray-200 rounded-lg mb-4"></div>
            <div className="flex gap-3 overflow-hidden">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 w-48 bg-gray-100 rounded-xl shrink-0"></div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 mb-6">
            <div className="h-6 w-48 bg-gray-200 rounded-lg mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 w-full bg-gray-100 rounded-xl"></div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-56 p-6">
                <div className="h-6 w-32 bg-gray-200 rounded-lg mb-4"></div>
                <div className="space-y-3">
                  <div className="h-10 w-full bg-gray-100 rounded-xl"></div>
                  <div className="h-10 w-full bg-gray-100 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50/50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Welcome back,{" "}
              <span className="font-semibold text-gray-700">
                {user?.displayName || "Student"}
              </span>
            </p>
          </div>
          {batchName && (
            <span className="inline-flex items-center gap-2 text-gray-600 pl-3 pr-4 py-2 rounded-xl text-sm font-medium bg-gray-100">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              {batchName}
            </span>
          )}
        </div>

        {/* Today's Schedule - Hero Card */}
        {WEEKDAYS.includes(today) && hasTimetable && (
          <div className="bg-white rounded-2xl mb-6 overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Today&apos;s Schedule
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{today}</p>
              </div>
              {currentSlot && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live
                </span>
              )}
            </div>
            <div className="px-5 pb-5">
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
                {todayClasses.length > 0 ? (
                  todayClasses.map((cls: any, i: number) => {
                    if (cls.isBreak) {
                      return (
                        <div
                          key={`break-${i}`}
                          className="shrink-0 snap-start flex items-center justify-center w-20 self-stretch"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-px h-4 bg-gray-200"></div>
                            <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                              {cls.label || "Break"}
                            </span>
                            <div className="w-px h-4 bg-gray-200"></div>
                          </div>
                        </div>
                      );
                    }

                    const isNow = currentSlot === cls.timing;
                    const color = getSubjectColor(cls.subject);

                    return (
                      <div
                        key={cls.id || i}
                        className={`shrink-0 snap-start w-44 rounded-xl p-3.5 transition-all ${
                          isNow
                            ? "bg-blue-600 text-white"
                            : color.bg
                        }`}
                      >
                        <div className={`text-[11px] font-medium mb-2 ${isNow ? "text-blue-100" : "text-gray-400"}`}>
                          {formatTimeShort(cls.timing)}
                        </div>
                        <div className={`text-sm font-semibold mb-1 leading-tight ${isNow ? "text-white" : color.text}`}>
                          {cls.subject}
                        </div>
                        <div className={`text-xs ${isNow ? "text-blue-100" : "text-gray-500"}`}>
                          {cls.faculty}
                        </div>
                        {cls.room && (
                          <div className={`text-[11px] mt-1 ${isNow ? "text-blue-200" : "text-gray-400"}`}>
                            {cls.room}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full py-6 text-center text-sm text-gray-400">
                    No classes scheduled today
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Full Week Timetable */}
        <div className="bg-white rounded-2xl mb-6 overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900">
              Weekly Timetable
            </h2>
            {!hasTimetable && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                {!batchId ? "No batch assigned" : "Timetable not set up"}
              </span>
            )}
          </div>

          {hasTimetable && (
            <>
              {/* Day Tabs - visible on all screens */}
              <div className="px-5 pb-3 md:hidden">
                <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
                  {WEEKDAYS.map((day, i) => (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                        selectedDay === day
                          ? "bg-white text-gray-900"
                          : day === today
                            ? "text-blue-600"
                            : "text-gray-500"
                      }`}
                    >
                      {WEEKDAYS_SHORT[i]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile: Selected Day View */}
              <div className="md:hidden px-4 pb-5">
                <div className="space-y-2">
                  {allTimings.map((slot: any, idx: number) => {
                    if (slot.type === "interval") {
                      return (
                        <div key={slot.id || idx} className="flex items-center gap-3 py-2 px-1">
                          <div className="w-16"></div>
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1 h-px bg-gray-200"></div>
                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                              {slot.label || "Break"}
                            </span>
                            <div className="flex-1 h-px bg-gray-200"></div>
                          </div>
                        </div>
                      );
                    }

                    const entry = getEntryForSlot(selectedDay, slot.time);
                    const isNow = selectedDay === today && currentSlot === slot.time;
                    const color = entry ? getSubjectColor(entry.subject) : null;

                    return (
                      <div
                        key={slot.id || idx}
                        className={`flex items-stretch gap-3 rounded-xl transition-all ${
                          isNow ? "ring-2 ring-blue-500 ring-offset-2" : ""
                        }`}
                      >
                        {/* Time label */}
                        <div className="w-16 shrink-0 flex flex-col justify-center py-3">
                          <span className="text-[11px] font-semibold text-gray-500 leading-tight">
                            {formatTimeShort(slot.time.split(" - ")[0])}
                          </span>
                          <span className="text-[10px] text-gray-300 leading-tight">
                            {formatTimeShort(slot.time.split(" - ")[1])}
                          </span>
                        </div>

                        {/* Class card */}
                        {entry ? (
                          <div className={`flex-1 ${color!.bg} rounded-xl p-3.5`}>
                            <div className={`text-sm font-semibold ${color!.text} leading-tight`}>
                              {entry.subject}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-xs text-gray-500">{entry.faculty}</span>
                              {entry.room && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                  <span className="text-xs text-gray-400">{entry.room}</span>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 bg-gray-50 rounded-xl p-3.5 flex items-center">
                            <span className="text-xs text-gray-300">Free period</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desktop: Full Week Grid */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-36">
                        Time
                      </th>
                      {WEEKDAYS.map((day) => (
                        <th
                          key={day}
                          className={`px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider ${
                            day === today
                              ? "text-blue-600"
                              : "text-gray-400"
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            {day.substring(0, 3)}
                            {day === today && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allTimings.map((slot: any, idx: number) => {
                      if (slot.type === "interval") {
                        return (
                          <tr key={slot.id || idx}>
                            <td className="px-4 py-1.5 text-[10px] font-medium text-gray-400">
                              {slot.time}
                            </td>
                            <td colSpan={5} className="px-4 py-1.5 text-center">
                              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                                {slot.label || "Break"}
                              </span>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={slot.id || idx}>
                          <td className="px-4 py-2.5 align-top">
                            <div className="text-[11px] font-medium text-gray-500 leading-tight whitespace-nowrap">
                              {slot.time.split(" - ")[0]}
                            </div>
                            <div className="text-[10px] text-gray-300 leading-tight">
                              {slot.time.split(" - ")[1]}
                            </div>
                          </td>
                          {WEEKDAYS.map((day) => {
                            const entry = getEntryForSlot(day, slot.time);
                            const isNow = day === today && currentSlot === slot.time;
                            const isToday = day === today;

                            if (!entry) {
                              return (
                                <td
                                  key={day}
                                  className={`px-1.5 py-1.5 text-center ${isToday ? "bg-blue-50/10" : ""}`}
                                >
                                  <div className="h-full min-h-[3.5rem] rounded-lg"></div>
                                </td>
                              );
                            }

                            const color = getSubjectColor(entry.subject);

                            return (
                              <td
                                key={day}
                                className={`px-1.5 py-1.5 ${isToday ? "bg-blue-50/10" : ""}`}
                              >
                                <div
                                  className={`rounded-lg p-2.5 min-h-[3.5rem] transition-all ${
                                    isNow
                                      ? "bg-blue-600 text-white"
                                      : color.bg
                                  }`}
                                >
                                  <div
                                    className={`text-xs font-semibold leading-tight ${
                                      isNow ? "text-white" : color.text
                                    }`}
                                  >
                                    {entry.subject}
                                  </div>
                                  <div
                                    className={`text-[10px] mt-1 leading-tight ${
                                      isNow ? "text-blue-100" : "text-gray-500"
                                    }`}
                                  >
                                    {entry.faculty}
                                  </div>
                                  {entry.room && (
                                    <div
                                      className={`text-[10px] mt-0.5 ${
                                        isNow ? "text-blue-200" : "text-gray-400"
                                      }`}
                                    >
                                      {entry.room}
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!hasTimetable && (
            <div className="px-5 pb-8 pt-2">
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4 text-2xl">
                  📅
                </div>
                <p className="text-sm font-medium text-gray-500 mb-1">
                  No timetable available
                </p>
                <p className="text-xs text-gray-400 max-w-xs">
                  {!batchId
                    ? "Your batch hasn't been assigned yet. Contact your admin."
                    : "Your batch timetable hasn't been set up yet."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Announcements */}
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-base font-semibold text-gray-900">
                Announcements
              </h2>
            </div>
            <div className="px-5 pb-5 space-y-2.5 max-h-80 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notif: any) => {
                  const date = notif.createdAt?.toDate
                    ? notif.createdAt.toDate()
                    : notif.createdAt
                      ? new Date(notif.createdAt)
                      : null;
                  const formattedDate = date
                    ? date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : null;

                  return (
                    <div key={notif.id} className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 shrink-0"></span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 leading-tight truncate">
                              {notif.title}
                            </p>
                            {formattedDate && (
                              <span className="text-[10px] text-gray-400 shrink-0">
                                {formattedDate}
                              </span>
                            )}
                          </div>
                          {notif.message && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {notif.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-400">No announcements yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Performance */}
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-base font-semibold text-gray-900">
                Performance
              </h2>
            </div>
            <div className="px-5 pb-5">
              {performance.length > 0 ? (
                <div className="space-y-3.5">
                  {performance.slice(0, 5).map((item, i) => {
                    const barColors = [
                      "bg-blue-500",
                      "bg-violet-500",
                      "bg-emerald-500",
                      "bg-amber-500",
                      "bg-rose-500",
                    ];
                    const pct = item.percentage || 0;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-gray-700 truncate max-w-[60%]">
                            {item.subject}
                          </span>
                          <div className="flex items-center gap-2">
                            {item.overallGrade && (
                              <span className="text-[10px] text-gray-400">
                                {item.overallGrade}
                              </span>
                            )}
                            <span className="text-xs font-semibold text-gray-900">
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColors[i % barColors.length]}`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-400">
                    No evaluations published yet
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Reminders & Quick Info */}
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-base font-semibold text-gray-900">
                Quick Info
              </h2>
            </div>
            <div className="px-5 pb-5 space-y-2.5">
              {/* Attendance overview */}
              {attendanceSummary.total > 0 && (
                <div className="p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-900">
                      Attendance
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        attendanceSummary.total > 0 &&
                        (attendanceSummary.present / attendanceSummary.total) * 100 >= 75
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    >
                      {Math.round(
                        (attendanceSummary.present / attendanceSummary.total) * 100,
                      )}
                      %
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (attendanceSummary.present / attendanceSummary.total) * 100 >= 75
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                      style={{
                        width: `${Math.round(
                          (attendanceSummary.present / attendanceSummary.total) * 100,
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    {attendanceSummary.present} of {attendanceSummary.total} classes
                  </p>
                </div>
              )}

              {/* Recent leave */}
              {recentLeave && (
                <div
                  className={`p-3 rounded-xl ${
                    recentLeave.status === "Approved"
                      ? "bg-emerald-50"
                      : recentLeave.status === "Rejected"
                        ? "bg-red-50"
                        : "bg-amber-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          recentLeave.status === "Approved"
                            ? "bg-emerald-500"
                            : recentLeave.status === "Rejected"
                              ? "bg-red-500"
                              : "bg-amber-500"
                        }`}
                      ></span>
                      <span className="text-xs font-semibold text-gray-900">
                        Leave Request
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        recentLeave.status === "Approved"
                          ? "text-emerald-700 bg-emerald-100"
                          : recentLeave.status === "Rejected"
                            ? "text-red-700 bg-red-100"
                            : "text-amber-700 bg-amber-100"
                      }`}
                    >
                      {recentLeave.status}
                    </span>
                  </div>
                  {recentLeave.reason && (
                    <p className="text-[11px] text-gray-500 mt-1.5 pl-4 line-clamp-1">
                      {recentLeave.reason}
                    </p>
                  )}
                </div>
              )}

              {/* Fallback when nothing to show */}
              {attendanceSummary.total === 0 && !recentLeave && (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-400">Nothing to show yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
