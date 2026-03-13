"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from "../../../context/AuthContext";
import {
  collection, query, where, getDocs, addDoc, serverTimestamp
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import { MdCalendarToday, MdChevronLeft, MdChevronRight } from 'react-icons/md';

// ── Firestore record shape ──────────────────────────────────────────────
interface AttendanceRecord {
  id: string;
  subject: string;
  subjectName?: string;
  subjectId?: string;
  totalClasses: number;
  attendedClasses: number;
  lastUpdated: any;
}

// ── Per-period / per-day record (for calendar) ────────────────────────
interface DayRecord {
  docId: string;
  status: string;
  subjectName: string;
  period: string | number;
  subjectId: string;
}

type FilterMode = 'overview' | 'calendar';

const STATUS_CONFIG: Record<string, { label: string; short: string; bg: string; text: string; border: string }> = {
  Present:   { label: "Present",    short: "P",  bg: "bg-green-100",  text: "text-green-800",  border: "border-green-300" },
  Absent:    { label: "Absent",     short: "AB", bg: "bg-red-100",    text: "text-red-800",    border: "border-red-300" },
  Late:      { label: "Late",       short: "L",  bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
  DutyLeave: { label: "Duty Leave", short: "DL", bg: "bg-blue-100",   text: "text-blue-800",   border: "border-blue-300" },
};

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDay(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<FilterMode>('overview');

  // ── Overview state ───────────────────────────────────────────────────
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Calendar state ───────────────────────────────────────────────────
  const today = new Date();
  const [calYear, setCalYear]   = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calRecords, setCalRecords] = useState<Record<string, DayRecord[]>>({});
  const [calLoading, setCalLoading] = useState(false);
  const [calSubjects, setCalSubjects] = useState<{ id: string; name: string }[]>([]);
  const [calSubject, setCalSubject] = useState('');

  // ── Fetch overview data ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "attendance"), where("studentId", "==", user.uid));
    // One-time fetch is fine; use getDocs to aggregate by subject
    getDocs(q).then(snapshot => {
      // Group raw records by subjectId/subjectName → aggregate totals
      const bySubject: Record<string, { subject: string; total: number; attended: number; lastUpdated: any }> = {};
      snapshot.docs.forEach(d => {
        const data = d.data();
        const key = data.subjectId || data.subject || data.subjectName || 'Unknown';
        const name = data.subjectName || data.subject || key;
        if (!bySubject[key]) bySubject[key] = { subject: name, total: 0, attended: 0, lastUpdated: data.createdAt };
        bySubject[key].total += 1;
        // DutyLeave counts as attended (beneficial for student)
        if (data.status === 'Present' || data.status === 'Late' || data.status === 'DutyLeave') {
          bySubject[key].attended += 1;
        }
        if (data.createdAt) bySubject[key].lastUpdated = data.createdAt;
      });

      // If no per-period records found, fall back to the old aggregate collection documents
      if (Object.keys(bySubject).length === 0) {
        const fallback = snapshot.docs
          .filter(d => d.data().totalClasses !== undefined)
          .map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
        setAttendanceData(fallback);
      } else {
        const agg: AttendanceRecord[] = Object.entries(bySubject).map(([key, val]) => ({
          id: key,
          subject: val.subject,
          totalClasses: val.total,
          attendedClasses: val.attended,
          lastUpdated: val.lastUpdated,
        }));
        setAttendanceData(agg);
      }

      // Collect unique subjects for calendar filter
      const subjMap: Record<string, string> = {};
      snapshot.docs.forEach(d => {
        const data = d.data();
        const id = data.subjectId || '';
        const name = data.subjectName || data.subject || '';
        if (id && name) subjMap[id] = name;
      });
      setCalSubjects(Object.entries(subjMap).map(([id, name]) => ({ id, name })));

      setLoading(false);
    }).catch(err => {
      console.error("Attendance fetch error:", err);
      toast.error("Failed to load attendance");
      setLoading(false);
    });
  }, [user]);

  // ── Fetch calendar records ────────────────────────────────────────────
  const fetchCalendar = useCallback(async () => {
    if (!user) return;
    setCalLoading(true);
    try {
      const firstDay = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
      const lastDay  = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(getDaysInMonth(calYear, calMonth)).padStart(2, '0')}`;

      let q = query(
        collection(db, 'attendance'),
        where('studentId', '==', user.uid)
      );

      const snap = await getDocs(q);
      const byDate: Record<string, DayRecord[]> = {};
      
      snap.docs.forEach(d => {
        const data = d.data();
        const key = data.date as string;
        if (!key) return;
        
        // Client-side filtering to avoid missing composite index errors
        if (key < firstDay || key > lastDay) return;
        if (calSubject && data.subjectId !== calSubject && (data.subjectName || data.subject) !== calSubject) return;

        if (!byDate[key]) byDate[key] = [];
        byDate[key].push({
          docId: d.id,
          status: data.status as string,
          subjectName: data.subjectName || data.subject || '',
          period: data.period || '',
          subjectId: data.subjectId || '',
        });
      });
      setCalRecords(byDate);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load calendar data");
    } finally {
      setCalLoading(false);
    }
  }, [user, calYear, calMonth, calSubject]);

  useEffect(() => {
    if (tab === 'calendar') fetchCalendar();
  }, [tab, fetchCalendar]);

  // ── Dev seeder ───────────────────────────────────────────────────────
  const seedAttendanceData = async () => {
    if (!user) return;
    if (!confirm("This will add sample attendance records. Continue?")) return;
    try {
      const subjects = [
        { subject: "Mathematics", total: 45, attended: 40 },
        { subject: "Physics", total: 42, attended: 35 },
        { subject: "Chemistry", total: 40, attended: 28 },
        { subject: "Computer Science", total: 38, attended: 36 },
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
      console.error(e); toast.error("Failed to seed data");
    }
  };

  // ── Computed values for overview ─────────────────────────────────────
  const totalClasses  = attendanceData.reduce((a, c) => a + c.totalClasses, 0);
  const totalAttended = attendanceData.reduce((a, c) => a + c.attendedClasses, 0);
  const overallPct    = totalClasses > 0 ? ((totalAttended / totalClasses) * 100) : 0;
  const overallStr    = overallPct.toFixed(1);
  const radius        = 50;
  const circ          = 2 * Math.PI * radius;
  const dashOffset    = circ - (overallPct / 100) * circ;

  const getStatus = (pct: number) => {
    if (pct >= 75) return { label: 'Good', color: 'bg-green-100 text-green-800' };
    if (pct >= 60) return { label: 'Warning', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Critical', color: 'bg-red-100 text-red-800' };
  };

  // ── Calendar helpers ──────────────────────────────────────────────────
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay    = getFirstDay(calYear, calMonth);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  // Monthly summary
  const monthlySummary = { Present: 0, Absent: 0, Late: 0, DutyLeave: 0 };
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    (calRecords[key] || []).forEach(r => {
      if (r.status in monthlySummary) monthlySummary[r.status as keyof typeof monthlySummary]++;
    });
  }

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-6" />
        <div className="h-12 bg-white rounded-lg border border-gray-100 mb-6" />
        <div className="h-64 bg-white rounded-lg border border-gray-100 mb-6" />
        <div className="h-64 bg-white rounded-lg border border-gray-100" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        {process.env.NODE_ENV === 'development' && attendanceData.length === 0 && (
          <button onClick={seedAttendanceData}
            className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200 transition">
            + Seed Data
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1.5 mb-6 w-fit">
        <button
          onClick={() => setTab('overview')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'overview' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
        >
          Overview
        </button>
        <button
          onClick={() => setTab('calendar')}
          className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'calendar' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
        >
          <MdCalendarToday className="text-base" /> Calendar
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          OVERVIEW TAB
      ════════════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        attendanceData.length === 0 ? (
          <div className="bg-white p-10 rounded-lg text-center">
            <p className="text-gray-500">No attendance records found.</p>
          </div>
        ) : (
          <>
            {/* Overall ring */}
            <div className="bg-white rounded-lg border border-gray-100 p-6 mb-6">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="text-center md:text-left mb-4 md:mb-0">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Overall Attendance</h2>
                  <p className={`text-3xl font-bold ${overallPct < 75 ? 'text-red-500' : 'text-blue-600'}`}>{overallStr}%</p>
                  <p className="text-sm text-gray-500 mt-1">Total {totalAttended}/{totalClasses} classes attended</p>
                  <p className="text-xs text-gray-400 mt-0.5">(Duty Leave counted as attended)</p>
                </div>
                <div className="relative">
                  <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
                    <circle cx="60" cy="60" r={radius} fill="none" stroke="#DBEAFE" strokeWidth="10" />
                    <circle cx="60" cy="60" r={radius} fill="none"
                      stroke={overallPct < 75 ? '#EF4444' : '#3B82F6'}
                      strokeWidth="10" strokeDasharray={circ} strokeDashoffset={dashOffset}
                      strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">Avg</span>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap justify-center md:justify-start mt-4 gap-4">
                {[
                  { label: "Present / Late / DL", color: overallPct < 75 ? 'bg-red-500' : 'bg-blue-600' },
                  { label: "Absent", color: 'bg-blue-100' },
                ].map(l => (
                  <div key={l.label} className="flex items-center space-x-1">
                    <div className={`w-3 h-3 rounded-full ${l.color}`} />
                    <span className="text-sm text-gray-600">{l.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-4">
                {overallPct >= 75
                  ? "Great job! Your attendance is above the requirement. Keep it up!"
                  : "Your attendance is below the 75% requirement. Please focus on attending more classes."}
              </p>
            </div>

            {/* Subject table */}
            <div className="bg-white rounded-lg border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Subject-wise Attendance</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Subject</th>
                      <th className="text-center py-3 px-2 font-semibold text-gray-700">Total</th>
                      <th className="text-center py-3 px-2 font-semibold text-gray-700">Attended</th>
                      <th className="text-center py-3 px-2 font-semibold text-gray-700">Percentage</th>
                      <th className="text-center py-3 px-2 font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.map(record => {
                      const pct = record.totalClasses > 0 ? (record.attendedClasses / record.totalClasses) * 100 : 0;
                      const status = getStatus(pct);
                      return (
                        <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="py-3 px-4 font-medium text-gray-900">{record.subject}</td>
                          <td className="text-center py-3 px-2">{record.totalClasses}</td>
                          <td className="text-center py-3 px-2">{record.attendedClasses}</td>
                          <td className="text-center py-3 px-2 font-medium">{pct.toFixed(1)}%</td>
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

            {/* Alerts */}
            <div className="bg-white rounded-lg border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance Alerts</h2>
              {attendanceData.filter(r => r.totalClasses > 0 && (r.attendedClasses / r.totalClasses * 100) < 75).length === 0 ? (
                <div className="flex items-center text-green-600 bg-green-50 p-4 rounded-lg">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">All clear! No low attendance alerts.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {attendanceData.filter(r => r.totalClasses > 0 && (r.attendedClasses / r.totalClasses * 100) < 75).map(record => {
                    const pct = (record.attendedClasses / record.totalClasses) * 100;
                    const isCritical = pct < 65;
                    return (
                      <div key={record.id} className={`border-l-4 ${isCritical ? 'border-red-400 bg-red-50' : 'border-yellow-400 bg-yellow-50'} p-4 rounded-r-lg`}>
                        <p className={`text-sm font-medium ${isCritical ? 'text-red-800' : 'text-yellow-800'}`}>
                          {isCritical ? 'Critical Alert' : 'Warning'} in {record.subject}: {pct.toFixed(1)}% (Below 75%). Please take action.
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )
      )}

      {/* ═══════════════════════════════════════════════════════════════
          CALENDAR TAB
      ════════════════════════════════════════════════════════════════ */}
      {tab === 'calendar' && (
        <>
          {/* Subject filter */}
          {calSubjects.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-gray-600">Filter by subject:</span>
              <select value={calSubject} onChange={e => setCalSubject(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Subjects</option>
                {calSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {/* Month navigator */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white border border-gray-200 hover:shadow-sm transition">
              <MdChevronLeft className="text-xl text-gray-600" />
            </button>
            <h2 className="text-lg font-bold text-gray-900">{MONTH_NAMES[calMonth]} {calYear}</h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white border border-gray-200 hover:shadow-sm transition">
              <MdChevronRight className="text-xl text-gray-600" />
            </button>
          </div>

          {/* Monthly summary */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {(Object.entries(monthlySummary) as [string, number][]).map(([status, count]) => {
              const cfg = STATUS_CONFIG[status];
              return (
                <div key={status} className={`${cfg.bg} border ${cfg.border} rounded-xl p-3 text-center`}>
                  <p className={`text-2xl font-bold ${cfg.text}`}>{count}</p>
                  <p className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</p>
                </div>
              );
            })}
          </div>

          {/* Calendar grid */}
          {calLoading ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 animate-pulse">
              Loading calendar…
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-gray-100">
                {DAY_NAMES.map(d => (
                  <div key={d} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">{d}</div>
                ))}
              </div>

              {/* Cells */}
              <div className="grid grid-cols-7">
                {/* Empty prefix */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`e-${i}`} className="min-h-[72px] border-b border-r border-gray-50 bg-gray-50/50" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const records = calRecords[dateKey] || [];
                  const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
                  const col = (firstDay + i) % 7;
                  const isWeekend = col === 0 || col === 6;

                  return (
                    <div key={day}
                      className={`min-h-[72px] border-b border-r border-gray-100 p-1.5 flex flex-col gap-1 ${isWeekend ? 'bg-gray-50/50' : 'bg-white'}`}>

                      <div className={`self-start w-6 h-6 flex items-center justify-center text-xs font-semibold rounded-full
                        ${isToday ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>
                        {day}
                      </div>

                      {records.map(rec => {
                        const cfg = STATUS_CONFIG[rec.status] || STATUS_CONFIG.Present;
                        return (
                          <div key={rec.docId}
                            className={`${cfg.bg} border ${cfg.border} rounded px-1.5 py-0.5`}>
                            <span className={`text-[10px] font-bold ${cfg.text}`}>{cfg.short}</span>
                            {rec.subjectName && (
                              <span className={`text-[9px] block truncate max-w-[56px] ${cfg.text} opacity-80`}>
                                {rec.subjectName.split(' ')[0]}
                              </span>
                            )}
                            {rec.period && (
                              <span className={`text-[9px] ${cfg.text} opacity-70`}>P{rec.period}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-5 items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Legend</span>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <span key={key} className="flex items-center gap-1.5 text-xs">
                <span className={`${cfg.bg} border ${cfg.border} ${cfg.text} font-bold px-1.5 py-0.5 rounded text-[10px]`}>{cfg.short}</span>
                <span className="text-gray-600">{cfg.label}</span>
              </span>
            ))}
            <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 ml-auto">
              DL (Duty Leave) counts as attended ✓
            </span>
          </div>
        </>
      )}
    </div>
  );
}
