"use client";
import {
  collection,
  getCountFromServer,
  query,
  getDocs,
  limit,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MdPeopleAlt,
  MdSchool,
  MdOutlineAccountBalance,
  MdGroupWork,
  MdNotificationsActive,
  MdMenuBook,
  MdOutlineCalendarMonth,
  MdTrendingUp,
  MdOutlineHotel,
  MdOutlineDirectionsBus,
  MdReceiptLong,
  MdAssignmentTurnedIn,
  MdCheckCircle,
  MdPending,
  MdCancel,
} from "react-icons/md";
import { FiArrowRight, FiUserPlus, FiUsers, FiBriefcase, FiBook, FiCalendar, FiBell, FiTrendingUp } from "react-icons/fi";

// ── types ──────────────────────────────────────────────────────────
interface Stats {
  students: number;
  faculty: number;
  departments: number;
  subjects: number;
  batches: number;
  notifications: number;
}

interface RecentStudent {
  id: string;
  name: string;
  regNumber: string;
  department: string;
  batch: string;
  createdAt: any;
}

interface RecentFaculty {
  id: string;
  name: string;
  department: string;
  designation: string;
}

interface LeaveStats {
  pending: number;
  approved: number;
  rejected: number;
}

interface AttendanceStat {
  subject: string;
  total: number;
  present: number;
}

// ── helpers ────────────────────────────────────────────────────────
function formatDate(val: any): string {
  if (!val) return "—";
  try {
    const d = val?.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch { return "—"; }
}

function initials(name: string): string {
  return (name || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
}

const DEPT_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];
function deptColor(dept: string): string {
  let hash = 0;
  for (const c of dept) hash = (hash * 31 + c.charCodeAt(0)) % DEPT_COLORS.length;
  return DEPT_COLORS[hash];
}

// ── Skeleton ───────────────────────────────────────────────────────
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

// ── Stat Card ──────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  link,
  sub,
}: {
  label: string;
  value: number | string;
  icon: any;
  color: string;
  link: string;
  sub?: string;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(link)}
      className="group bg-white rounded-2xl border border-gray-100 p-5 text-left transition-all hover:border-gray-200 w-full"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <FiArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </button>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    students: 0, faculty: 0, departments: 0, subjects: 0, batches: 0, notifications: 0,
  });
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([]);
  const [recentFaculty, setRecentFaculty] = useState<RecentFaculty[]>([]);
  const [leaveStats, setLeaveStats] = useState<LeaveStats>({ pending: 0, approved: 0, rejected: 0 });
  const [topAttendance, setTopAttendance] = useState<AttendanceStat[]>([]);
  const [recentNotifs, setRecentNotifs] = useState<any[]>([]);
  const [deptBreakdown, setDeptBreakdown] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        // ── parallel counts ──────────────────────────────────────
        const [studSnap, facSnap, deptSnap, subSnap, batchSnap, notifSnap] = await Promise.all([
          getCountFromServer(collection(db, "students")),
          getCountFromServer(collection(db, "faculty")),
          getCountFromServer(collection(db, "departments")),
          getCountFromServer(collection(db, "subjects")),
          getCountFromServer(collection(db, "batches")),
          getCountFromServer(collection(db, "notifications")),
        ]);

        setStats({
          students: studSnap.data().count,
          faculty: facSnap.data().count,
          departments: deptSnap.data().count,
          subjects: subSnap.data().count,
          batches: batchSnap.data().count,
          notifications: notifSnap.data().count,
        });

        // ── recent students ──────────────────────────────────────
        try {
          const studDocs = await getDocs(query(collection(db, "students"), orderBy("createdAt", "desc"), limit(6)));
          setRecentStudents(studDocs.docs.map(d => ({ id: d.id, ...d.data() } as RecentStudent)));
        } catch {
          const studDocs = await getDocs(query(collection(db, "students"), limit(6)));
          setRecentStudents(studDocs.docs.map(d => ({ id: d.id, ...d.data() } as RecentStudent)));
        }

        // ── recent faculty ───────────────────────────────────────
        const facDocs = await getDocs(query(collection(db, "faculty"), limit(5)));
        setRecentFaculty(facDocs.docs.map(d => ({ id: d.id, ...d.data() } as RecentFaculty)));

        // ── leave stats ──────────────────────────────────────────
        const [pendLeave, appLeave, rejLeave] = await Promise.all([
          getCountFromServer(query(collection(db, "student_leaves"), where("status", "==", "pending"))),
          getCountFromServer(query(collection(db, "student_leaves"), where("status", "==", "approved"))),
          getCountFromServer(query(collection(db, "student_leaves"), where("status", "==", "rejected"))),
        ]);
        setLeaveStats({
          pending: pendLeave.data().count,
          approved: appLeave.data().count,
          rejected: rejLeave.data().count,
        });

        // ── dept breakdown ───────────────────────────────────────
        const deptDocs = await getDocs(collection(db, "departments"));
        const deptList = deptDocs.docs.map(d => ({ id: d.id, name: d.data().name || d.id }));
        // count students per dept
        const deptCounts = await Promise.all(
          deptList.slice(0, 6).map(async (dept) => {
            try {
              const snap = await getCountFromServer(query(collection(db, "students"), where("department", "==", dept.name)));
              return { name: dept.name, count: snap.data().count };
            } catch { return { name: dept.name, count: 0 }; }
          })
        );
        setDeptBreakdown(deptCounts.filter(d => d.count > 0));

        // ── recent notifications ─────────────────────────────────
        try {
          const notifDocs = await getDocs(query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(5)));
          setRecentNotifs(notifDocs.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch {
          const notifDocs = await getDocs(query(collection(db, "notifications"), limit(5)));
          setRecentNotifs(notifDocs.docs.map(d => ({ id: d.id, ...d.data() })));
        }

        // ── top attendance by subject ─────────────────────────────
        try {
          const attDocs = await getDocs(query(collection(db, "attendance"), limit(200)));
          const bySubject: Record<string, { total: number; present: number }> = {};
          attDocs.docs.forEach(d => {
            const data = d.data();
            const subj = data.subjectName || data.subject || "Unknown";
            if (!bySubject[subj]) bySubject[subj] = { total: 0, present: 0 };
            bySubject[subj].total += 1;
            if (["Present", "present", "Late", "DutyLeave"].includes(data.status)) {
              bySubject[subj].present += 1;
            }
          });
          const sorted = Object.entries(bySubject)
            .map(([subject, v]) => ({ subject, ...v }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
          setTopAttendance(sorted);
        } catch { /* skip */ }

      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const quickActions = [
    { label: "Add Student",    icon: FiUserPlus, path: "/admin/student/add",   color: "bg-blue-50 text-blue-700 border-blue-100" },
    { label: "Add Faculty",    icon: FiUsers,    path: "/admin/faculty/add",    color: "bg-violet-50 text-violet-700 border-violet-100" },
    { label: "Manage Batches", icon: FiBriefcase,path: "/admin/batches",        color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    { label: "Subjects",       icon: FiBook,     path: "/admin/subject",        color: "bg-amber-50 text-amber-700 border-amber-100" },
    { label: "Timetable",      icon: FiCalendar, path: "/admin/timetable",      color: "bg-rose-50 text-rose-700 border-rose-100" },
    { label: "Notifications",  icon: FiBell,     path: "/admin/notifications",  color: "bg-cyan-50 text-cyan-700 border-cyan-100" },
    { label: "Hostel",         icon: MdOutlineHotel, path: "/admin/hostel",     color: "bg-orange-50 text-orange-700 border-orange-100" },
    { label: "Transport",      icon: MdOutlineDirectionsBus, path: "/admin/transportation", color: "bg-teal-50 text-teal-700 border-teal-100" },
  ];

  if (loading) {
    return (
      <div className="p-4 sm:p-6 bg-gray-50/60 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 animate-pulse">
            <div className="h-7 w-48 bg-gray-100 rounded-lg mb-2" />
            <div className="h-4 w-64 bg-gray-100 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Skeleton className="lg:col-span-2 h-72" />
            <Skeleton className="h-72" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  const maxStudents = Math.max(...deptBreakdown.map(d => d.count), 1);

  return (
    <div className="p-4 sm:p-6 bg-gray-50/60 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <Link
            href="/admin/reports"
            className="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <FiTrendingUp className="w-4 h-4" /> View Reports
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Students"    value={stats.students}    icon={MdSchool}               color="bg-blue-50 text-blue-600"   link="/admin/student" />
          <StatCard label="Faculty"     value={stats.faculty}     icon={MdPeopleAlt}             color="bg-violet-50 text-violet-600" link="/admin/faculty" />
          <StatCard label="Departments" value={stats.departments} icon={MdOutlineAccountBalance} color="bg-emerald-50 text-emerald-600" link="/admin/department" />
          <StatCard label="Batches"     value={stats.batches}     icon={MdGroupWork}             color="bg-amber-50 text-amber-600"    link="/admin/batches" />
          <StatCard label="Subjects"    value={stats.subjects}    icon={MdMenuBook}              color="bg-rose-50 text-rose-600"      link="/admin/subject" />
          <StatCard label="Notices"     value={stats.notifications} icon={MdNotificationsActive} color="bg-cyan-50 text-cyan-600"     link="/admin/notifications" />
        </div>

        {/* Row 2: Recent Students + Dept Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          {/* Recent Students */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-900">Recent Students</h2>
              <Link href="/admin/student" className="text-xs font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1">
                View all <FiArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentStudents.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-400">No students added yet</p>
              ) : (
                recentStudents.map((s) => (
                  <div key={s.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${deptColor(s.department || "")}`}>
                      {initials(s.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.regNumber} · {s.department || s.batch || "—"}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{formatDate(s.createdAt)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dept Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Students by Dept.</h2>
              <Link href="/admin/department" className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                Manage <FiArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {deptBreakdown.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No data yet</p>
            ) : (
              <div className="space-y-3">
                {deptBreakdown.map((d) => (
                  <div key={d.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 font-medium truncate max-w-[70%]">{d.name}</span>
                      <span className="text-xs font-semibold text-gray-900">{d.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${(d.count / maxStudents) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Leave Stats + Attendance + Faculty */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

          {/* Leave Requests */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Leave Requests</h2>
              <Link href="/admin/student" className="text-xs text-gray-400 hover:text-gray-600">View</Link>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-center gap-2">
                  <MdPending className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Pending</span>
                </div>
                <span className="text-lg font-bold text-amber-700">{leaveStats.pending}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2">
                  <MdCheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-800">Approved</span>
                </div>
                <span className="text-lg font-bold text-emerald-700">{leaveStats.approved}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                <div className="flex items-center gap-2">
                  <MdCancel className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700">Rejected</span>
                </div>
                <span className="text-lg font-bold text-red-600">{leaveStats.rejected}</span>
              </div>
            </div>
          </div>

          {/* Attendance Overview */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Attendance / Subject</h2>
            </div>
            {topAttendance.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No attendance data yet</p>
            ) : (
              <div className="space-y-3">
                {topAttendance.map((a) => {
                  const pct = a.total > 0 ? Math.round((a.present / a.total) * 100) : 0;
                  return (
                    <div key={a.subject}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 truncate max-w-[70%]">{a.subject}</span>
                        <span className={`text-xs font-semibold ${pct >= 75 ? "text-emerald-600" : "text-amber-600"}`}>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 75 ? "bg-emerald-500" : "bg-amber-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Faculty List */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-900">Faculty</h2>
              <Link href="/admin/faculty" className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                All <FiArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentFaculty.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-400">No faculty added</p>
              ) : (
                recentFaculty.map((f) => (
                  <div key={f.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${deptColor(f.department || "")}`}>
                      {initials(f.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                      <p className="text-xs text-gray-400 truncate">{f.designation || f.department || "—"}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Row 4: Notifications + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Notifications */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-900">Recent Notices</h2>
              <Link href="/admin/notifications" className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                Manage <FiArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentNotifs.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-400">No notifications yet</p>
              ) : (
                recentNotifs.map((n) => (
                  <div key={n.id} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
                    <p className="text-sm font-medium text-gray-900 truncate">{n.title || n.message || "Untitled"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {n.audience && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 font-medium px-1.5 py-0.5 rounded-full">
                          {Array.isArray(n.audience) ? n.audience.join(", ") : n.audience}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{formatDate(n.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => router.push(a.path)}
                  className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${a.color}`}
                >
                  <a.icon className="w-5 h-5" />
                  <span className="text-xs font-semibold text-center leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
