"use client";
import React, { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, getDocs, addDoc, getDoc,
  doc, serverTimestamp, updateDoc
} from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import toast from 'react-hot-toast';
import { MdChevronLeft, MdChevronRight, MdCalendarToday, MdEdit, MdCheckCircle } from 'react-icons/md';

interface AttendanceAlert {
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  subjectName: string;
  percentage: number;
  threshold: number;
  canSkip: number;
  type: "warning" | "info";
}

const ATTENDANCE_THRESHOLDS = [
  { percent: 75, type: "warning" as const, message: (name: string, subj: string, pct: number, canSkip: number) =>
    `${name}, your attendance in ${subj} is now ${pct}%. You can only skip ${canSkip} more class${canSkip !== 1 ? "es" : ""} before falling below 75%.` },
  { percent: 80, type: "info" as const, message: (name: string, subj: string, pct: number) =>
    `${name}, your attendance in ${subj} has reached ${pct}%. Keep it up!` },
  { percent: 90, type: "info" as const, message: (name: string, subj: string, pct: number) =>
    `${name}, excellent! Your attendance in ${subj} is now ${pct}%.` },
];

async function checkAttendanceThresholds(
  studentId: string,
  studentName: string,
  subjectId: string,
  subjectName: string,
): Promise<AttendanceAlert[]> {
  const alerts: AttendanceAlert[] = [];
  try {
    const q = query(
      collection(db, "attendance"),
      where("studentId", "==", studentId),
      where("subjectId", "==", subjectId),
    );
    const snap = await getDocs(q);
    const records = snap.docs.map((d) => d.data());
    const total = records.length;
    if (total === 0) return alerts;
    const attended = records.filter((r) => r.status === "Present" || r.status === "DutyLeave").length;
    const percentage = Math.round((attended / total) * 100);
    const canSkip = Math.max(0, Math.floor((attended - 0.75 * total) / 0.75));
    let studentEmail = "";
    let studentPhone = "";
    try {
      const studentDoc = await getDoc(doc(db, "students", studentId));
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        studentEmail = data.email || "";
        studentPhone = data.phone || data.mobile || "";
      }
    } catch { /* ignore */ }
    for (const threshold of ATTENDANCE_THRESHOLDS) {
      const shouldNotify =
        (threshold.percent === 75 && percentage >= 75 && percentage <= 78) ||
        (threshold.percent !== 75 && percentage >= threshold.percent && percentage <= threshold.percent + 3);
      if (!shouldNotify) continue;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const existingQ = query(
        collection(db, "notifications"),
        where("targetUid", "==", studentId),
        where("thresholdKey", "==", `${subjectId}_${threshold.percent}`),
      );
      const existing = await getDocs(existingQ);
      const recentExists = existing.docs.some((d) => {
        const created = d.data().createdAt;
        if (!created) return false;
        const createdDate = typeof created === "string" ? new Date(created) : created.toDate?.() || new Date(0);
        return createdDate > weekAgo;
      });
      if (recentExists) continue;
      const title = threshold.percent === 75 ? `Attendance Warning - ${subjectName}` : `Attendance Milestone - ${subjectName}`;
      const message = threshold.percent === 75
        ? threshold.message(studentName, subjectName, percentage, canSkip)
        : threshold.message(studentName, subjectName, percentage, 0);
      await addDoc(collection(db, "notifications"), {
        title, message,
        createdAt: new Date().toISOString(),
        read: false, type: threshold.type,
        audience: ["student"], targetUid: studentId,
        thresholdKey: `${subjectId}_${threshold.percent}`,
      });
      alerts.push({ studentName, studentEmail, studentPhone, subjectName, percentage, threshold: threshold.percent, canSkip, type: threshold.type });
    }
  } catch (err) {
    console.error("Attendance threshold check failed:", err);
  }
  return alerts;
}

// ─── Calendar helpers ───────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

type AttendanceStatus = "Present" | "Absent" | "Late" | "DutyLeave" | "Holiday" | "";

interface DayRecord {
  docId: string;
  status: AttendanceStatus;
  subjectName: string;
  period: string | number;
}

// Status display config
const STATUS_CONFIG: Record<string, { label: string; short: string; bg: string; text: string; border: string }> = {
  Present:    { label: "Present",     short: "P",  bg: "bg-green-100",  text: "text-green-800",  border: "border-green-300" },
  Absent:     { label: "Absent",      short: "AB", bg: "bg-red-100",    text: "text-red-800",    border: "border-red-300" },
  Late:       { label: "Late",        short: "L",  bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
  DutyLeave:  { label: "Duty Leave",  short: "DL", bg: "bg-blue-100",   text: "text-blue-800",   border: "border-blue-300" },
  Holiday:    { label: "Holiday",     short: "H",  bg: "bg-gray-100",   text: "text-gray-500",   border: "border-gray-200" },
};

// ─── Tab types ───────────────────────────────────────────────────────────
type MainTab = "mark" | "calendar";

export default function StudentAttendancePage() {
  const [mainTab, setMainTab] = useState<MainTab>("mark");

  // ── Mark Attendance state ──────────────────────────────────────────────
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);

  // ── Calendar View state ────────────────────────────────────────────────
  const [calBatch, setCalBatch] = useState('');
  const [calStudents, setCalStudents] = useState<any[]>([]);
  const [calStudent, setCalStudent] = useState('');
  const [calSubject, setCalSubject] = useState('');
  const [calSubjects, setCalSubjects] = useState<any[]>([]);
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calRecords, setCalRecords] = useState<Record<string, DayRecord[]>>({});
  const [calLoading, setCalLoading] = useState(false);
  const [updatingDocId, setUpdatingDocId] = useState<string | null>(null);

  // ── Fetch batches + subjects on mount ────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [batchSnap, subjectSnap] = await Promise.all([
          getDocs(collection(db, 'batches')),
          getDocs(collection(db, 'subjects')),
        ]);
        setBatches(batchSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setSubjects(subjectSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load initial data");
      }
    };
    fetchData();
  }, []);

  // ── Filter subjects for mark tab ─────────────────────────────────────
  useEffect(() => {
    if (!selectedBatch) { setFilteredSubjects([]); return; }
    const currentBatch = batches.find(b => b.id === selectedBatch);
    if (!currentBatch) return;
    const relevant = subjects.filter(sub => sub.department === currentBatch.department && sub.semester === currentBatch.semester);
    setFilteredSubjects(relevant.length > 0 ? relevant : subjects.filter(sub => sub.department === currentBatch.department));
    setSelectedSubject('');
  }, [selectedBatch, batches, subjects]);

  // ── Fetch students for mark tab ───────────────────────────────────────
  useEffect(() => {
    if (!selectedBatch) { setStudents([]); return; }
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'students'), where('batchId', '==', selectedBatch));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStudents(list);
        const initial: any = {};
        list.forEach((s: any) => { initial[s.id] = 'Present'; });
        setAttendanceData(initial);
      } catch (error) {
        console.error("Error fetching students:", error);
        toast.error("Failed to load students");
      } finally { setLoading(false); }
    };
    fetchStudents();
  }, [selectedBatch]);

  // ── Fetch students + subjects for calendar tab when batch changes ──────
  useEffect(() => {
    if (!calBatch) { setCalStudents([]); setCalStudent(''); return; }
    const fetchCalStudents = async () => {
      try {
        const q = query(collection(db, 'students'), where('batchId', '==', calBatch));
        const snap = await getDocs(q);
        setCalStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setCalStudent('');
      } catch { toast.error("Failed to load students"); }
    };
    // filter subjects for calendar batch
    const batch = batches.find(b => b.id === calBatch);
    if (batch) {
      const relevant = subjects.filter(s => s.department === batch.department && s.semester === batch.semester);
      setCalSubjects(relevant.length > 0 ? relevant : subjects.filter(s => s.department === batch.department));
    }
    fetchCalStudents();
  }, [calBatch, batches, subjects]);

  // ── Fetch calendar records when student/subject/month changes ─────────
  const fetchCalendarRecords = useCallback(async () => {
    if (!calStudent || !calBatch) return;
    setCalLoading(true);
    try {
      // Build date strings for the entire month
      const firstDay = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
      const lastDay = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(getDaysInMonth(calYear, calMonth)).padStart(2, '0')}`;

      let q = query(
        collection(db, 'attendance'),
        where('studentId', '==', calStudent)
      );

      const snap = await getDocs(q);
      const byDate: Record<string, DayRecord[]> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        const dateKey = data.date as string;
        if (!dateKey) return;
        
        // Client-side filter to bypass composite index limitations
        if (dateKey < firstDay || dateKey > lastDay) return;
        if (calSubject && data.subjectId !== calSubject && (data.subjectName || data.subject) !== calSubject) return;

        if (!byDate[dateKey]) byDate[dateKey] = [];
        byDate[dateKey].push({
          docId: d.id,
          status: data.status as AttendanceStatus,
          subjectName: data.subjectName || '',
          period: data.period || '',
        });
      });
      setCalRecords(byDate);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load calendar data");
    } finally {
      setCalLoading(false);
    }
  }, [calStudent, calBatch, calSubject, calYear, calMonth]);

  useEffect(() => {
    fetchCalendarRecords();
  }, [fetchCalendarRecords]);

  // ── Convert AB → DL ──────────────────────────────────────────────────
  const handleConvertToDutyLeave = async (docId: string) => {
    setUpdatingDocId(docId);
    try {
      await updateDoc(doc(db, 'attendance', docId), {
        status: 'DutyLeave',
        updatedAt: serverTimestamp(),
        updatedBy: 'tutor',
      });
      toast.success("Marked as Duty Leave ✓");
      await fetchCalendarRecords();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update record");
    } finally {
      setUpdatingDocId(null);
    }
  };

  // ── Revert DL → AB ───────────────────────────────────────────────────
  const handleRevertToAbsent = async (docId: string) => {
    setUpdatingDocId(docId);
    try {
      await updateDoc(doc(db, 'attendance', docId), {
        status: 'Absent',
        updatedAt: serverTimestamp(),
        updatedBy: 'tutor',
      });
      toast.success("Reverted to Absent");
      await fetchCalendarRecords();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update record");
    } finally {
      setUpdatingDocId(null);
    }
  };

  // ── Mark attendance submit ────────────────────────────────────────────
  const handleAttendanceChange = (studentId: string, status: string) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = async () => {
    if (!selectedBatch || !selectedSubject || !selectedPeriod || !attendanceDate) {
      toast.error("Please fill all fields: Batch, Subject, Period, Date");
      return;
    }
    setLoading(true);
    try {
      const subject = subjects.find(s => s.id === selectedSubject);
      await Promise.all(students.map(student =>
        addDoc(collection(db, 'attendance'), {
          studentId: student.id,
          studentUid: student.uid,
          studentName: student.name,
          batchId: selectedBatch,
          subjectId: selectedSubject,
          subjectName: subject?.name || 'Unknown Subject',
          period: selectedPeriod,
          date: attendanceDate,
          status: attendanceData[student.id],
          createdAt: serverTimestamp(),
          markedBy: 'Faculty',
        })
      ));
      toast.success(`Attendance marked for Period ${selectedPeriod}!`);
      (async () => {
        try {
          const thresholdResults = await Promise.all(
            students.map(s => checkAttendanceThresholds(s.id, s.name, selectedSubject, subject?.name || "Unknown Subject"))
          );
          const allAlerts = thresholdResults.flat();
          if (allAlerts.length === 0) return;
          fetch("/api/attendance-alerts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ alerts: allAlerts }),
          }).catch(err => console.error("Alert API error:", err));
        } catch (err) { console.error("Threshold check error:", err); }
      })();
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error("Failed to save attendance");
    } finally { setLoading(false); }
  };

  const periods = [1, 2, 3, 4, 5, 6, 7];

  // ── Calendar rendering helpers ────────────────────────────────────────
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  // Aggregate status for a day: priority DutyLeave > Absent > Late > Present
  const getDayStatus = (dateKey: string): AttendanceStatus => {
    const records = calRecords[dateKey];
    if (!records || records.length === 0) return "";
    if (records.some(r => r.status === "Absent")) return "Absent";
    if (records.some(r => r.status === "DutyLeave")) return "DutyLeave";
    if (records.some(r => r.status === "Late")) return "Late";
    return "Present";
  };

  // Summary counts for selected month
  const summaryCount = { Present: 0, Absent: 0, Late: 0, DutyLeave: 0 };
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const s = getDayStatus(key);
    if (s && s in summaryCount) summaryCount[s as keyof typeof summaryCount]++;
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Student Attendance</h1>

        {/* Main tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1.5 mb-6 w-fit">
          <button
            onClick={() => setMainTab("mark")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${mainTab === "mark" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
          >
            Mark Attendance
          </button>
          <button
            onClick={() => setMainTab("calendar")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${mainTab === "calendar" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
          >
            <MdCalendarToday className="text-base" />
            Calendar View / Duty Leave
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TAB 1 — Mark Attendance (existing flow + DutyLeave option)
        ════════════════════════════════════════════════════════════════ */}
        {mainTab === "mark" && (
          <>
            {/* Controls */}
            <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-100 shadow-sm mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Batch</label>
                <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">-- Select Batch --</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Subject</label>
                <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
                  disabled={!selectedBatch}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed">
                  <option value="">-- Select Subject --</option>
                  {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">-- Period --</option>
                  {periods.map(p => <option key={p} value={p}>Period {p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            {/* Student attendance list */}
            {selectedBatch && selectedSubject && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                  <div className="p-12 text-center text-gray-500">Loading students...</div>
                ) : students.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">No students found in this batch.</div>
                ) : (
                  <>
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-700">Student List</h3>
                      <span className="text-sm text-gray-500">Total: {students.length}</span>
                    </div>

                    {/* Legend */}
                    <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-4 text-xs">
                      {[
                        { label: "Present", bg: "bg-green-500" },
                        { label: "Absent", bg: "bg-red-500" },
                        { label: "Late", bg: "bg-yellow-400" },
                        { label: "Duty Leave", bg: "bg-blue-500" },
                      ].map(s => (
                        <span key={s.label} className="flex items-center gap-1.5 text-gray-600">
                          <span className={`w-2.5 h-2.5 rounded-full ${s.bg}`} />
                          {s.label}
                        </span>
                      ))}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {students.map(student => (
                            <tr key={student.id} className="hover:bg-gray-50 transition">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.uid}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-wrap gap-3">
                                  {[
                                    { value: "Present",    color: "green",  label: "Present" },
                                    { value: "Absent",     color: "red",    label: "Absent" },
                                    { value: "Late",       color: "yellow", label: "Late" },
                                    { value: "DutyLeave",  color: "blue",   label: "Duty Leave" },
                                  ].map(opt => {
                                    const isActive = attendanceData[student.id] === opt.value;
                                    const colorMap: Record<string, string> = {
                                      green:  isActive ? "border-green-600 bg-green-600"  : "border-gray-300",
                                      red:    isActive ? "border-red-600 bg-red-600"      : "border-gray-300",
                                      yellow: isActive ? "border-yellow-500 bg-yellow-500": "border-gray-300",
                                      blue:   isActive ? "border-blue-600 bg-blue-600"    : "border-gray-300",
                                    };
                                    const textMap: Record<string, string> = {
                                      green: isActive ? "text-green-700 font-medium" : "text-gray-500",
                                      red:   isActive ? "text-red-700 font-medium"   : "text-gray-500",
                                      yellow:isActive ? "text-yellow-700 font-medium": "text-gray-500",
                                      blue:  isActive ? "text-blue-700 font-medium"  : "text-gray-500",
                                    };
                                    return (
                                      <label key={opt.value} className="flex items-center space-x-2 cursor-pointer group">
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${colorMap[opt.color]}`}>
                                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                        </div>
                                        <input type="radio" name={`attendance-${student.id}`} value={opt.value}
                                          checked={isActive}
                                          onChange={() => handleAttendanceChange(student.id, opt.value)}
                                          className="hidden" />
                                        <span className={`text-sm group-hover:text-gray-900 ${textMap[opt.color]}`}>{opt.label}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-4 md:p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                      <button onClick={handleSubmit} disabled={loading || !selectedPeriod}
                        className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? 'Saving...' : 'Submit Attendance'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 2 — Calendar View + Duty Leave Management
        ════════════════════════════════════════════════════════════════ */}
        {mainTab === "calendar" && (
          <>
            {/* Calendar Controls */}
            <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Select Student</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Batch</label>
                  <select value={calBatch} onChange={e => setCalBatch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">-- Select Batch --</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Student</label>
                  <select value={calStudent} onChange={e => setCalStudent(e.target.value)}
                    disabled={!calBatch}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed">
                    <option value="">-- Select Student --</option>
                    {calStudents.map(s => <option key={s.id} value={s.id}>{s.name} ({s.uid || s.regNumber || ''})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Subject (optional — all if blank)</label>
                  <select value={calSubject} onChange={e => setCalSubject(e.target.value)}
                    disabled={!calBatch}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed">
                    <option value="">All Subjects</option>
                    {calSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {calStudent ? (
              <>
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

                {/* Summary bar */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {(Object.entries(summaryCount) as [string, number][]).map(([status, count]) => {
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
                    Loading attendance records…
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 border-b border-gray-100">
                      {DAY_NAMES.map(d => (
                        <div key={d} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Calendar cells */}
                    <div className="grid grid-cols-7">
                      {/* Empty cells before first day */}
                      {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-gray-50 bg-gray-50/50" />
                      ))}

                      {/* Day cells */}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const records = calRecords[dateKey] || [];
                        const isToday = (
                          day === today.getDate() &&
                          calMonth === today.getMonth() &&
                          calYear === today.getFullYear()
                        );
                        const col = (firstDay + i) % 7;
                        const isWeekend = col === 0 || col === 6;

                        return (
                          <div
                            key={day}
                            className={`min-h-[80px] border-b border-r border-gray-100 p-1.5 flex flex-col gap-1 ${isWeekend ? 'bg-gray-50/60' : 'bg-white'}`}
                          >
                            {/* Day number */}
                            <div className={`self-start w-6 h-6 flex items-center justify-center text-xs font-semibold rounded-full
                              ${isToday ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>
                              {day}
                            </div>

                            {/* Records for this day */}
                            {records.length === 0 ? null : records.map(rec => {
                              const cfg = STATUS_CONFIG[rec.status] || STATUS_CONFIG.Present;
                              const isAB = rec.status === "Absent";
                              const isDL = rec.status === "DutyLeave";
                              const isBusy = updatingDocId === rec.docId;

                              return (
                                <div
                                  key={rec.docId}
                                  className={`${cfg.bg} border ${cfg.border} rounded px-1.5 py-0.5 flex items-center justify-between gap-0.5 group`}
                                >
                                  <div className="flex flex-col min-w-0">
                                    <span className={`text-[10px] font-bold leading-tight ${cfg.text}`}>{cfg.short}</span>
                                    {rec.subjectName && (
                                      <span className={`text-[9px] leading-tight truncate max-w-[56px] ${cfg.text} opacity-80`}>
                                        {rec.subjectName.split(' ')[0]}
                                      </span>
                                    )}
                                    {rec.period && (
                                      <span className={`text-[9px] ${cfg.text} opacity-70`}>P{rec.period}</span>
                                    )}
                                  </div>

                                  {/* Action buttons */}
                                  {isAB && (
                                    <button
                                      title="Mark as Duty Leave"
                                      disabled={isBusy}
                                      onClick={() => handleConvertToDutyLeave(rec.docId)}
                                      className="opacity-0 group-hover:opacity-100 ml-0.5 flex-shrink-0 bg-blue-600 text-white rounded p-0.5 hover:bg-blue-700 transition-all disabled:opacity-50"
                                    >
                                      {isBusy ? (
                                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <MdEdit className="text-[10px]" />
                                      )}
                                    </button>
                                  )}
                                  {isDL && (
                                    <button
                                      title="Revert to Absent"
                                      disabled={isBusy}
                                      onClick={() => handleRevertToAbsent(rec.docId)}
                                      className="opacity-0 group-hover:opacity-100 ml-0.5 flex-shrink-0 bg-red-500 text-white rounded p-0.5 hover:bg-red-600 transition-all disabled:opacity-50"
                                    >
                                      {isBusy ? (
                                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <MdCheckCircle className="text-[10px]" />
                                      )}
                                    </button>
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
                  <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                    <MdEdit className="text-blue-500" /> Hover AB to convert → DL
                  </span>
                </div>

                {/* Day detail: show all records for a day when there are multiple */}
                {Object.entries(calRecords).some(([, recs]) => recs.length > 1) && (
                  <div className="mt-4 bg-white rounded-xl border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Period-wise Detail</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {Object.entries(calRecords)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([dateKey, recs]) => (
                          <div key={dateKey} className="border border-gray-100 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600">
                              {new Date(dateKey + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </div>
                            <div className="divide-y divide-gray-50">
                              {recs.map(rec => {
                                const cfg = STATUS_CONFIG[rec.status] || STATUS_CONFIG.Present;
                                const isAB = rec.status === "Absent";
                                const isDL = rec.status === "DutyLeave";
                                const isBusy = updatingDocId === rec.docId;
                                return (
                                  <div key={rec.docId} className="flex items-center justify-between px-3 py-2">
                                    <div className="flex items-center gap-3 text-sm">
                                      <span className={`${cfg.bg} border ${cfg.border} ${cfg.text} text-xs font-bold px-2 py-0.5 rounded-full`}>{cfg.short}</span>
                                      <span className="text-gray-700">{rec.subjectName}</span>
                                      <span className="text-gray-400 text-xs">Period {rec.period}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      {isAB && (
                                        <button
                                          onClick={() => handleConvertToDutyLeave(rec.docId)}
                                          disabled={isBusy}
                                          className="flex items-center gap-1 text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
                                        >
                                          {isBusy ? "Updating…" : <><MdEdit className="text-sm" /> Mark DL</>}
                                        </button>
                                      )}
                                      {isDL && (
                                        <button
                                          onClick={() => handleRevertToAbsent(rec.docId)}
                                          disabled={isBusy}
                                          className="flex items-center gap-1 text-xs bg-red-50 border border-red-200 text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                                        >
                                          {isBusy ? "Updating…" : <><MdCheckCircle className="text-sm" /> Revert AB</>}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
                <MdCalendarToday className="text-5xl text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Select a batch and student to view their attendance calendar</p>
                <p className="text-gray-400 text-sm mt-1">You can then convert any AB (Absent) entry to DL (Duty Leave)</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
