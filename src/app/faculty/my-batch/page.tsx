"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection, query, where, getDocs, doc, getDoc,
  updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import {
  MdPeople, MdCalendarToday, MdChevronLeft, MdChevronRight,
  MdEdit, MdCheckCircle, MdDownload, MdBarChart, MdSearch,
  MdClose, MdOutlineAssignment, MdListAlt,
} from "react-icons/md";

// ── Types ─────────────────────────────────────────────────────────────────
interface BatchStudent {
  id: string;
  name: string;
  uid?: string;
  regNumber?: string;
  email?: string;
  phone?: string;
  department?: string;
  photoUrl?: string;
  batchId?: string;   // some records store batch doc id here
  batch?: string;     // most records store academic year string e.g. "2024-2028"
}

interface AttendanceRecord {
  docId: string;
  status: "Present" | "Absent" | "Late" | "DutyLeave";
  subjectName: string;
  period: string | number;
  date: string;
}

interface EvalReport {
  student: string;
  regNumber?: string;
  subject: string;
  overallGrade: string;
  cgpa: number;
  percentage?: number;
  status: string;
}

// Status config
const SC: Record<string, { label: string; short: string; bg: string; text: string; border: string }> = {
  Present:   { label: "Present",    short: "P",  bg: "bg-green-100",  text: "text-green-800",  border: "border-green-300" },
  Absent:    { label: "Absent",     short: "AB", bg: "bg-red-100",    text: "text-red-800",    border: "border-red-300" },
  Late:      { label: "Late",       short: "L",  bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
  DutyLeave: { label: "Duty Leave", short: "DL", bg: "bg-blue-100",   text: "text-blue-800",   border: "border-blue-300" },
};

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y: number, m: number)    { return new Date(y, m, 1).getDay(); }

function initials(name: string) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

type MainTab = "students" | "attendance" | "marks" | "performance";

export default function MyBatchPage() {
  const { user } = useAuth();

  // ── Faculty / Batch resolution ────────────────────────────────────────
  const [isTutor, setIsTutor] = useState<boolean | null>(null);  // null = loading
  const [batchId, setBatchId] = useState<string>("");
  const [batchName, setBatchName] = useState<string>("");
  const [batchDept, setBatchDept] = useState<string>("");  // batch.department
  const [batchYear, setBatchYear] = useState<string>("");  // batch.academicYear
  const [facultyName, setFacultyName] = useState<string>("");

  // ── Students ──────────────────────────────────────────────────────────
  const [students, setStudents] = useState<BatchStudent[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentsLoading, setStudentsLoading] = useState(false); // false until batch resolves

  // ── Tabs & selected student (for calendar + marks) ────────────────────
  const [tab, setTab] = useState<MainTab>("students");
  const [selectedStudent, setSelectedStudent] = useState<BatchStudent | null>(null);

  // ── Calendar attendance ────────────────────────────────────────────────
  const today = new Date();
  const [calYear, setCalYear]   = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calRecords, setCalRecords] = useState<Record<string, AttendanceRecord[]>>({});
  const [calLoading, setCalLoading] = useState(false);
  const [updatingDocId, setUpdatingDocId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [calSubject, setCalSubject] = useState("");

  // ── Marks / Eval ──────────────────────────────────────────────────────
  const [evalReports, setEvalReports] = useState<EvalReport[]>([]);
  const [marksLoading, setMarksLoading] = useState(false);

  // ── Step 1: Resolve logged-in faculty & find their tutor batch ────────
  useEffect(() => {
    if (!user) return;

    const resolve = async () => {
      try {
        // --- Find the faculty document ---
        let facultyDoc = (await getDocs(query(collection(db, "faculty"), where("authUid", "==", user.uid)))).docs[0];
        if (!facultyDoc)
          facultyDoc = (await getDocs(query(collection(db, "faculty"), where("email", "==", user.email)))).docs[0];
        if (!facultyDoc) { setIsTutor(false); return; }

        const fData  = facultyDoc.data();
        const fDocId = facultyDoc.id;
        const fName  = fData.name || "";
        const fDept  = fData.department || "";   // faculty's own department
        setFacultyName(fName || user.displayName || "");

        // --- Find the batch where this faculty is the tutor ---
        const allBatches = await getDocs(collection(db, "batches"));
        const tutorBatch = allBatches.docs.find(d => {
          const b = d.data();
          return (
            b.tutor === fName ||
            b.tutorId === user.uid ||
            b.tutorId === fDocId ||
            (Array.isArray(b.tutors) && b.tutors.some((t: any) => t.id === fDocId || t.name === fName))
          );
        });

        if (!tutorBatch) { setIsTutor(false); return; }

        const bData = tutorBatch.data();
        // Use batch.department if available, fall back to faculty's department
        const resolvedDept = bData.department || fDept;
        const resolvedYear = bData.academicYear || "";

        setIsTutor(true);
        setBatchId(tutorBatch.id);
        setBatchName(bData.name || "My Batch");
        setBatchDept(resolvedDept);
        setBatchYear(resolvedYear);
      } catch (err) {
        console.error("Tutor resolution error:", err);
        setIsTutor(false);
      }
    };

    resolve();
  }, [user]);

  // ── normalizeDept: treats "and" / "&" / "&amp;" as equivalent, ignores case ─
  const normalizeDept = (d: string) =>
    d.toLowerCase()
     .replace(/\s*&amp;\s*/g, " and ")
     .replace(/\s*&\s*/g, " and ")
     .replace(/\s+/g, " ")
     .trim();

  // ── Step 2: Load students ──────────────────────────────────────────
  // Uses fuzzy department matching so "CS and Eng" == "CS & Eng".
  // Triggered once batchDept + batchYear are known (set in Step 1).
  useEffect(() => {
    if (!batchId || !batchYear || !batchDept) return;

    const normTarget = normalizeDept(batchDept);
    const deptMatch = (s: BatchStudent) =>
      !s.department || normalizeDept(s.department) === normTarget;

    const fetchStudents = async () => {
      setStudentsLoading(true);
      try {
        // Primary: batch == academicYear, then filter dept client-side
        const snap = await getDocs(
          query(collection(db, "students"), where("batch", "==", batchYear))
        );
        let list: BatchStudent[] = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as BatchStudent))
          .filter(deptMatch);

        // Fallback A: batch stored as full batch name ("CSE 2024-2028")
        if (list.length === 0) {
          const snapA = await getDocs(
            query(collection(db, "students"), where("batch", "==", batchName))
          );
          list = snapA.docs
            .map(d => ({ id: d.id, ...d.data() } as BatchStudent))
            .filter(deptMatch);
        }

        // Fallback B: batchId field on student doc
        if (list.length === 0) {
          const snapB = await getDocs(
            query(collection(db, "students"), where("batchId", "==", batchId))
          );
          list = snapB.docs.map(d => ({ id: d.id, ...d.data() } as BatchStudent));
        }

        // Fallback C: full collection scan, dept-only fuzzy match
        if (list.length === 0) {
          const all = await getDocs(collection(db, "students"));
          list = all.docs
            .map(d => ({ id: d.id, ...d.data() } as BatchStudent))
            .filter(deptMatch);
        }

        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        console.log(
          `[MyBatch] ${list.length} students | dept="${batchDept}" (→"${normTarget}") | year="${batchYear}"`
        );
        setStudents(list);
      } catch (err) {
        console.error("Student fetch error:", err);
        toast.error("Failed to load students");
      } finally {
        setStudentsLoading(false);
      }
    };
    fetchStudents();
  }, [batchId, batchDept, batchYear, batchName]);


  // ── Step 3: Load subjects for current batch on mount ─────────────────
  useEffect(() => {
    if (!batchId) return;
    const fetchSubjects = async () => {
      try {
        const bDoc = await getDoc(doc(db, "batches", batchId));
        if (!bDoc.exists()) return;
        const { department, semester } = bDoc.data();
        const snap = await getDocs(
          query(collection(db, "subjects"), where("department", "==", department), where("semester", "==", semester))
        );
        setSubjects(snap.docs.map(d => ({ id: d.id, name: d.data().name || "" })));
      } catch { /* ignore */ }
    };
    fetchSubjects();
  }, [batchId]);

  // ── Calendar fetch ────────────────────────────────────────────────────
  const fetchCalendar = useCallback(async () => {
    if (!selectedStudent) return;
    setCalLoading(true);
    try {
      const firstDay = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-01`;
      const lastDay  = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(getDaysInMonth(calYear, calMonth)).padStart(2, "0")}`;

      // To avoid composite index Missing Index errors, we'll fetch all attendance for the student
      // and filter locally by date and subject.
      const snap = await getDocs(
        query(collection(db, "attendance"), where("studentId", "==", selectedStudent.id))
      );
      
      const byDate: Record<string, AttendanceRecord[]> = {};
      
      snap.docs.forEach(d => {
        const data = d.data();
        if (!data.date) return;
        
        // Local filtering
        if (data.date < firstDay || data.date > lastDay) return;
        if (calSubject && data.subjectName !== calSubject && data.subjectId !== calSubject) return;

        if (!byDate[data.date]) byDate[data.date] = [];
        byDate[data.date].push({
          docId: d.id,
          status: data.status,
          subjectName: data.subjectName || "",
          period: data.period || "",
          date: data.date,
        });
      });
      setCalRecords(byDate);
    } catch (error: any) {
      console.error("Attendance fetch error:", error);
      toast.error("Failed to load attendance");
    } finally { 
      setCalLoading(false); 
    }
  }, [selectedStudent, calYear, calMonth, calSubject]);

  useEffect(() => {
    if (tab === "attendance" && selectedStudent) fetchCalendar();
  }, [tab, fetchCalendar]);

  // ── Marks fetch ───────────────────────────────────────────────────────
  const fetchMarks = useCallback(async () => {
    if (!selectedStudent) return;
    setMarksLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "evaluation_reports"), where("studentId", "==", selectedStudent.id))
      );
      const list = snap.docs.map(d => d.data() as EvalReport);
      // Fallback: also try by name
      if (list.length === 0 && selectedStudent.name) {
        const snap2 = await getDocs(
          query(collection(db, "evaluation_reports"), where("student", "==", selectedStudent.name))
        );
        setEvalReports(snap2.docs.map(d => d.data() as EvalReport));
      } else {
        setEvalReports(list);
      }
    } catch { toast.error("Failed to load marks"); }
    finally { setMarksLoading(false); }
  }, [selectedStudent]);

  useEffect(() => {
    if ((tab === "marks" || tab === "performance") && selectedStudent) fetchMarks();
  }, [tab, fetchMarks]);

  // ── DL conversion ─────────────────────────────────────────────────────
  const convertToDL = async (docId: string) => {
    setUpdatingDocId(docId);
    try {
      await updateDoc(doc(db, "attendance", docId), { status: "DutyLeave", updatedAt: serverTimestamp(), updatedBy: "tutor" });
      toast.success("Marked as Duty Leave ✓");
      fetchCalendar();
    } catch { toast.error("Failed to update"); }
    finally { setUpdatingDocId(null); }
  };

  const revertToAbsent = async (docId: string) => {
    setUpdatingDocId(docId);
    try {
      await updateDoc(doc(db, "attendance", docId), { status: "Absent", updatedAt: serverTimestamp(), updatedBy: "tutor" });
      toast.success("Reverted to Absent");
      fetchCalendar();
    } catch { toast.error("Failed to update"); }
    finally { setUpdatingDocId(null); }
  };

  // ── CSV Download ──────────────────────────────────────────────────────
  const downloadStudentList = () => {
    if (!students.length) { toast.error("No students to download"); return; }
    const rows = [
      ["Name", "Reg Number", "Email", "Phone", "Department"],
      ...students.map(s => [s.name, s.regNumber || "", s.email || "", s.phone || "", s.department || ""]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${batchName}_students.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  };

  const downloadMarks = () => {
    if (!evalReports.length) { toast.error("No marks to download"); return; }
    const rows = [
      ["Student", "Reg Number", "Subject", "Grade", "CGPA", "Status"],
      ...evalReports.map(r => [r.student, r.regNumber || "", r.subject, r.overallGrade, String(r.cgpa), r.status]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${selectedStudent?.name}_marks.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Calendar helpers ───────────────────────────────────────────────────
  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay    = getFirstDay(calYear, calMonth);

  // Monthly counts
  const mCount = { Present: 0, Absent: 0, Late: 0, DutyLeave: 0 };
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    (calRecords[key] || []).forEach(r => { if (r.status in mCount) mCount[r.status as keyof typeof mCount]++; });
  }

  // ── Grade color ────────────────────────────────────────────────────────
  const gradeColor = (grade: string) => {
    if (!grade) return "bg-gray-100 text-gray-600";
    const g = grade.toUpperCase();
    if (g === "S" || g === "A+" || g >= "A") return "bg-green-100 text-green-800";
    if (g >= "B")  return "bg-blue-100 text-blue-800";
    if (g >= "C")  return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  // GPA average from evalReports
  const avgCGPA = evalReports.length
    ? (evalReports.reduce((a, r) => a + (r.cgpa || 0), 0) / evalReports.length).toFixed(2)
    : null;

  // ── Filtered students ─────────────────────────────────────────────────
  const filteredStudents = students.filter(s =>
    !studentSearch ||
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.regNumber || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(studentSearch.toLowerCase())
  );

  // ── State: not a tutor ────────────────────────────────────────────────
  if (isTutor === null) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">Loading batch data…</p>
        </div>
      </div>
    );
  }

  if (isTutor === false) {
    return (
      <div className="p-8 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-md">
          <MdPeople className="text-6xl text-gray-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Batch Assigned</h2>
          <p className="text-gray-500 text-sm">
            You are not currently assigned as a tutor for any batch. Please contact the administrator to assign you as a batch tutor.
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Class Tutor</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{batchName}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{students.length} students enrolled</p>
          </div>
          <button onClick={downloadStudentList}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm">
            <MdDownload /> Download Student List
          </button>
        </div>

        {/* Main tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1.5 mb-6 overflow-x-auto w-fit">
          {([
            { key: "students",    icon: MdPeople,           label: "Students" },
            { key: "attendance",  icon: MdCalendarToday,    label: "Attendance / DL" },
            { key: "marks",       icon: MdListAlt,          label: "Marks" },
            { key: "performance", icon: MdBarChart,         label: "Performance" },
          ] as { key: MainTab; icon: any; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.key ? "bg-blue-600 text-white shadow" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
              <t.icon className="text-base" />{t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TAB: STUDENTS
        ═══════════════════════════════════════════════════════════════ */}
        {tab === "students" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                  placeholder="Search by name, reg number or email…"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
              </div>
              {studentSearch && (
                <button onClick={() => setStudentSearch("")}
                  className="p-2 text-gray-400 hover:text-gray-600">
                  <MdClose />
                </button>
              )}
              <span className="text-xs text-gray-400 ml-auto">{filteredStudents.length} of {students.length}</span>
            </div>

            {studentsLoading ? (
              <div className="p-12 text-center text-gray-400 animate-pulse">Loading students…</div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                {students.length === 0 ? "No students in this batch yet." : "No students match your search."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left py-3 px-4 font-semibold text-gray-600 uppercase text-xs tracking-wide">#</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600 uppercase text-xs tracking-wide">Student</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600 uppercase text-xs tracking-wide">Reg Number</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600 uppercase text-xs tracking-wide">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600 uppercase text-xs tracking-wide">Phone</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600 uppercase text-xs tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s, idx) => (
                      <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="py-3 px-4 text-gray-400">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {initials(s.name)}
                            </div>
                            <span className="font-medium text-gray-900">{s.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{s.regNumber || "—"}</td>
                        <td className="py-3 px-4 text-gray-600 text-sm">{s.email || "—"}</td>
                        <td className="py-3 px-4 text-gray-600">{s.phone || "—"}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button onClick={() => { setSelectedStudent(s); setTab("attendance"); }}
                              className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition">
                              Attendance
                            </button>
                            <button onClick={() => { setSelectedStudent(s); setTab("marks"); }}
                              className="text-xs px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition">
                              Marks
                            </button>
                            <button onClick={() => { setSelectedStudent(s); setTab("performance"); }}
                              className="text-xs px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition">
                              Performance
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: ATTENDANCE / DL CALENDAR
        ═══════════════════════════════════════════════════════════════ */}
        {tab === "attendance" && (
          <>
            {/* Student Selector */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Select Student</label>
                <select value={selectedStudent?.id || ""} onChange={e => {
                    const s = students.find(st => st.id === e.target.value) || null;
                    setSelectedStudent(s);
                    setCalRecords({});
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">— Pick a student —</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} {s.regNumber ? `(${s.regNumber})` : ""}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Subject (optional)</label>
                <select value={calSubject} onChange={e => setCalSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">All Subjects</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {selectedStudent && (
                <button onClick={fetchCalendar}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition self-end">
                  Refresh
                </button>
              )}
            </div>

            {selectedStudent ? (
              <>
                {/* Month nav */}
                <div className="flex items-center justify-between mb-4">
                  <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white border border-gray-200 hover:shadow-sm transition">
                    <MdChevronLeft className="text-xl text-gray-600" />
                  </button>
                  <div className="text-center">
                    <h2 className="text-lg font-bold text-gray-900">{MONTH_NAMES[calMonth]} {calYear}</h2>
                    <p className="text-sm text-gray-500">{selectedStudent.name}</p>
                  </div>
                  <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white border border-gray-200 hover:shadow-sm transition">
                    <MdChevronRight className="text-xl text-gray-600" />
                  </button>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {(Object.entries(mCount) as [string, number][]).map(([status, count]) => {
                    const cfg = SC[status];
                    return (
                      <div key={status} className={`${cfg.bg} border ${cfg.border} rounded-xl p-3 text-center`}>
                        <p className={`text-2xl font-bold ${cfg.text}`}>{count}</p>
                        <p className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Calendar */}
                {calLoading ? (
                  <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 animate-pulse">Loading…</div>
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
                      {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`e-${i}`} className="min-h-[80px] border-b border-r border-gray-50 bg-gray-50/50" />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const records = calRecords[dateKey] || [];
                        const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
                        const col = (firstDay + i) % 7;
                        const isWeekend = col === 0 || col === 6;

                        return (
                          <div key={day} className={`min-h-[80px] border-b border-r border-gray-100 p-1.5 flex flex-col gap-1 ${isWeekend ? "bg-gray-50/50" : "bg-white"}`}>
                            <div className={`self-start w-6 h-6 flex items-center justify-center text-xs font-semibold rounded-full ${isToday ? "bg-blue-600 text-white" : "text-gray-600"}`}>
                              {day}
                            </div>
                            {records.map(rec => {
                              const cfg = SC[rec.status] || SC.Present;
                              const isAB = rec.status === "Absent";
                              const isDL = rec.status === "DutyLeave";
                              const isBusy = updatingDocId === rec.docId;
                              return (
                                <div key={rec.docId} className={`${cfg.bg} border ${cfg.border} rounded px-1.5 py-0.5 flex items-center justify-between gap-0.5 group`}>
                                  <div className="flex flex-col min-w-0">
                                    <span className={`text-[10px] font-bold leading-tight ${cfg.text}`}>{cfg.short}</span>
                                    {rec.subjectName && (
                                      <span className={`text-[9px] leading-tight truncate max-w-[52px] ${cfg.text} opacity-80`}>{rec.subjectName.split(" ")[0]}</span>
                                    )}
                                    {rec.period && <span className={`text-[9px] ${cfg.text} opacity-70`}>P{rec.period}</span>}
                                  </div>
                                  {isAB && (
                                    <button title="Mark as Duty Leave" disabled={isBusy} onClick={() => convertToDL(rec.docId)}
                                      className="opacity-0 group-hover:opacity-100 ml-0.5 flex-shrink-0 bg-blue-600 text-white rounded p-0.5 hover:bg-blue-700 transition-all disabled:opacity-50">
                                      {isBusy ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <MdEdit className="text-[10px]" />}
                                    </button>
                                  )}
                                  {isDL && (
                                    <button title="Revert to Absent" disabled={isBusy} onClick={() => revertToAbsent(rec.docId)}
                                      className="opacity-0 group-hover:opacity-100 ml-0.5 flex-shrink-0 bg-red-500 text-white rounded p-0.5 hover:bg-red-600 transition-all disabled:opacity-50">
                                      {isBusy ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <MdCheckCircle className="text-[10px]" />}
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
                  {Object.entries(SC).map(([key, cfg]) => (
                    <span key={key} className="flex items-center gap-1.5 text-xs">
                      <span className={`${cfg.bg} border ${cfg.border} ${cfg.text} font-bold px-1.5 py-0.5 rounded text-[10px]`}>{cfg.short}</span>
                      <span className="text-gray-600">{cfg.label}</span>
                    </span>
                  ))}
                  <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                    <MdEdit className="text-blue-500" /> Hover AB to convert → DL
                  </span>
                </div>

                {/* Period-wise detail */}
                {Object.keys(calRecords).length > 0 && (
                  <div className="mt-4 bg-white rounded-xl border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Period-wise Detail</h3>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {Object.entries(calRecords).sort(([a], [b]) => b.localeCompare(a)).map(([dateKey, recs]) => (
                        <div key={dateKey} className="border border-gray-100 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600">
                            {new Date(dateKey + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                          </div>
                          <div className="divide-y divide-gray-50">
                            {recs.map(rec => {
                              const cfg = SC[rec.status] || SC.Present;
                              const isBusy = updatingDocId === rec.docId;
                              return (
                                <div key={rec.docId} className="flex items-center justify-between px-3 py-2">
                                  <div className="flex items-center gap-3 text-sm">
                                    <span className={`${cfg.bg} border ${cfg.border} ${cfg.text} text-xs font-bold px-2 py-0.5 rounded-full`}>{cfg.short}</span>
                                    <span className="text-gray-700">{rec.subjectName}</span>
                                    <span className="text-gray-400 text-xs">Period {rec.period}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    {rec.status === "Absent" && (
                                      <button onClick={() => convertToDL(rec.docId)} disabled={isBusy}
                                        className="flex items-center gap-1 text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition disabled:opacity-50">
                                        {isBusy ? "Updating…" : <><MdEdit className="text-sm" /> Mark DL</>}
                                      </button>
                                    )}
                                    {rec.status === "DutyLeave" && (
                                      <button onClick={() => revertToAbsent(rec.docId)} disabled={isBusy}
                                        className="flex items-center gap-1 text-xs bg-red-50 border border-red-200 text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-100 transition disabled:opacity-50">
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
                <p className="text-gray-500 font-medium">Select a student to view their attendance calendar</p>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: MARKS
        ═══════════════════════════════════════════════════════════════ */}
        {tab === "marks" && (
          <>
            {/* Student selector */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Select Student</label>
                <select value={selectedStudent?.id || ""} onChange={e => {
                    setSelectedStudent(students.find(s => s.id === e.target.value) || null);
                    setEvalReports([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">— Pick a student —</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} {s.regNumber ? `(${s.regNumber})` : ""}</option>)}
                </select>
              </div>
              {selectedStudent && evalReports.length > 0 && (
                <button onClick={downloadMarks}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm self-end">
                  <MdDownload /> Download CSV
                </button>
              )}
            </div>

            {selectedStudent ? (
              marksLoading ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 animate-pulse">Loading marks…</div>
              ) : evalReports.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                  <MdOutlineAssignment className="text-5xl text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500">No evaluation records found for <strong>{selectedStudent.name}</strong>.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-gray-900">{selectedStudent.name}</h2>
                      <p className="text-xs text-gray-500">{evalReports.length} subjects · CGPA avg: <strong>{avgCGPA}</strong></p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          {["Subject", "Grade", "CGPA", "Status"].map(h => (
                            <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {evalReports.map((r, i) => (
                          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition">
                            <td className="py-3 px-4 font-medium text-gray-900">{r.subject}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${gradeColor(r.overallGrade)}`}>{r.overallGrade || "—"}</span>
                            </td>
                            <td className="py-3 px-4 font-medium text-gray-800">{r.cgpa?.toFixed(2) || "—"}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${r.status === "passed" ? "bg-green-100 text-green-800" : r.status === "failed" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-600"}`}>
                                {r.status?.charAt(0).toUpperCase() + r.status?.slice(1) || "—"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
                <MdListAlt className="text-5xl text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Select a student to view their marks</p>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: PERFORMANCE
        ═══════════════════════════════════════════════════════════════ */}
        {tab === "performance" && (
          <>
            {/* Student selector */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5">
              <label className="block text-xs font-medium text-gray-500 mb-1">Select Student</label>
              <select value={selectedStudent?.id || ""} onChange={e => {
                  setSelectedStudent(students.find(s => s.id === e.target.value) || null);
                  setEvalReports([]);
                }}
                className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">— Pick a student —</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} {s.regNumber ? `(${s.regNumber})` : ""}</option>)}
              </select>
            </div>

            {selectedStudent ? (
              marksLoading ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 animate-pulse">Loading performance data…</div>
              ) : (
                <>
                  {/* Stats row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                    {[
                      { label: "Avg CGPA", value: avgCGPA || "N/A", color: "text-blue-600" },
                      { label: "Subjects", value: evalReports.length, color: "text-indigo-600" },
                      { label: "Passed", value: evalReports.filter(r => r.status === "passed").length, color: "text-green-600" },
                      { label: "Failed", value: evalReports.filter(r => r.status === "failed").length, color: "text-red-600" },
                    ].map(stat => (
                      <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-5 text-center shadow-sm">
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Subject performance bars */}
                  {evalReports.length > 0 ? (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                      <h3 className="font-semibold text-gray-900 mb-5">Subject Performance</h3>
                      <div className="space-y-4">
                        {evalReports.map((r, i) => {
                          const pct = r.percentage ?? (r.cgpa ? r.cgpa / 10 * 100 : 0);
                          const barColor = pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-yellow-400" : "bg-red-500";
                          return (
                            <div key={i}>
                              <div className="flex justify-between mb-1.5">
                                <span className="text-sm font-medium text-gray-800">{r.subject}</span>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${gradeColor(r.overallGrade)}`}>{r.overallGrade}</span>
                                  <span className="text-sm text-gray-500">{pct.toFixed(1)}%</span>
                                </div>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                      <MdBarChart className="text-5xl text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500">No performance data available yet.</p>
                    </div>
                  )}
                </>
              )
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
                <MdBarChart className="text-5xl text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Select a student to trace their performance</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
