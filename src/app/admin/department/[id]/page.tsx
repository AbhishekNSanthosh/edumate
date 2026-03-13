"use client";
import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../../../config/firebaseConfig";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import Skeleton from "../../../../common/components/Skeleton";

type Tab = "students" | "faculty" | "batches" | "subjects";

export default function DepartmentDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [dept, setDept] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("students");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      try {
        const deptDoc = await getDoc(doc(db, "departments", id as string));
        if (!deptDoc.exists()) {
          toast.error("Department not found");
          router.push("/admin/department");
          return;
        }
        const deptData = { id: deptDoc.id, ...deptDoc.data() };
        setDept(deptData);

        const deptName = deptData.name;
        const [studSnap, facSnap, batchSnap, subSnap] = await Promise.all([
          getDocs(query(collection(db, "students"), where("department", "==", deptName))),
          getDocs(query(collection(db, "faculty"), where("department", "==", deptName))),
          getDocs(query(collection(db, "batches"), where("department", "==", deptName))),
          getDocs(query(collection(db, "subjects"), where("department", "==", deptName))),
        ]);

        setStudents(studSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setFaculty(facSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setBatches(batchSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setSubjects(subSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
        toast.error("Failed to load department data");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id, router]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSearch("");
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "students", label: "Students", count: students.length },
    { key: "faculty", label: "Faculty", count: faculty.length },
    { key: "batches", label: "Batches", count: batches.length },
    { key: "subjects", label: "Subjects", count: subjects.length },
  ];

  // Filtered lists
  const filteredStudents = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.regNumber?.toLowerCase().includes(search.toLowerCase()) ||
      s.batch?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredFaculty = faculty.filter(
    (f) =>
      f.name?.toLowerCase().includes(search.toLowerCase()) ||
      f.designation?.toLowerCase().includes(search.toLowerCase()) ||
      f.email?.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredBatches = batches.filter(
    (b) =>
      b.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.semester?.toLowerCase().includes(search.toLowerCase()) ||
      b.tutor?.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.code?.toLowerCase().includes(search.toLowerCase()) ||
      s.semester?.toLowerCase().includes(search.toLowerCase()) ||
      s.type?.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading)
    return (
      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <Skeleton className="h-7 w-64 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9 w-28 rounded-lg" />)}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white border-b border-gray-100 p-4 flex gap-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    );

  if (!dept) return null;

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Back */}
      <Link
        href="/admin/department"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Departments
      </Link>

      {/* Department Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{dept.name}</h1>
            <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              {dept.code}
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                (dept.status || "active") === "active"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {(dept.status || "active").toUpperCase()}
            </span>
          </div>
          {dept.hod && (
            <p className="text-sm text-gray-500 mt-1">
              HOD: <span className="font-medium text-gray-700">{dept.hod}</span>
            </p>
          )}
        </div>
        <Link href={`/admin/department/edit/${dept.id}`}>
          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shrink-0">
            Edit Department
          </button>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`p-4 rounded-lg border text-left transition-colors ${
              activeTab === t.key
                ? "bg-blue-50 border-blue-300"
                : "bg-white border-gray-200 hover:bg-gray-50"
            }`}
          >
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t.label}
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{t.count}</p>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Tab Bar + Search */}
        <div className="border-b border-gray-200 px-4 pt-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex gap-1 flex-wrap">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === t.key
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
                <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {t.count}
                </span>
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto pb-2">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            />
          </div>
        </div>

        {/* Students Tab */}
        {activeTab === "students" && (
          filteredStudents.length === 0 ? (
            <EmptyState label={search ? "No students match your search." : "No students enrolled in this department."} />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {["Name", "Reg Number", "Batch", "Email", "Status", "Attendance"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{s.name}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">{s.regNumber || "—"}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600">{s.batch || "—"}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600">{s.email || "—"}</td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <StatusBadge status={s.status || "active"} />
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600">{s.attendance || "0%"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Faculty Tab */}
        {activeTab === "faculty" && (
          filteredFaculty.length === 0 ? (
            <EmptyState label={search ? "No faculty match your search." : "No faculty assigned to this department."} />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {["Name", "Faculty ID", "Designation", "Role", "Email", "Status"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredFaculty.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{f.name}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">{f.uid || "—"}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600">{f.designation || "—"}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600">{f.role || "—"}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600">{f.email || "—"}</td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <StatusBadge status={f.accessStatus || "active"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Batches Tab */}
        {activeTab === "batches" && (
          filteredBatches.length === 0 ? (
            <EmptyState label={search ? "No batches match your search." : "No batches found for this department."} />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {["Batch Name", "Semester", "Academic Year", "Tutor", "Status"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBatches.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{b.name}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600">{b.semester || "—"}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600">{b.academicYear || "—"}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600">{b.tutor || <span className="text-gray-400 italic">Not assigned</span>}</td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <StatusBadge
                          status={b.status || "active"}
                          variants={{ active: "bg-green-100 text-green-800", completed: "bg-blue-100 text-blue-800", inactive: "bg-red-100 text-red-800" }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Subjects Tab */}
        {activeTab === "subjects" && (
          filteredSubjects.length === 0 ? (
            <EmptyState label={search ? "No subjects match your search." : "No subjects found for this department."} />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {["Subject Name", "Code", "Semester", "Credits", "Type", "Status"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSubjects.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{s.name}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">{s.code || "—"}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600">{s.semester || "—"}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600">{s.credits ?? "—"}</td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <TypeBadge type={s.type} />
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <StatusBadge status={s.status || "active"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Row count footer */}
        {(
          (activeTab === "students" && filteredStudents.length > 0) ||
          (activeTab === "faculty" && filteredFaculty.length > 0) ||
          (activeTab === "batches" && filteredBatches.length > 0) ||
          (activeTab === "subjects" && filteredSubjects.length > 0)
        ) && (
          <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 text-right">
            {activeTab === "students" && `${filteredStudents.length} of ${students.length} student${students.length !== 1 ? "s" : ""}`}
            {activeTab === "faculty" && `${filteredFaculty.length} of ${faculty.length} faculty`}
            {activeTab === "batches" && `${filteredBatches.length} of ${batches.length} batch${batches.length !== 1 ? "es" : ""}`}
            {activeTab === "subjects" && `${filteredSubjects.length} of ${subjects.length} subject${subjects.length !== 1 ? "s" : ""}`}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="p-10 text-center text-gray-400 text-sm">{label}</div>
  );
}

function StatusBadge({
  status,
  variants,
}: {
  status: string;
  variants?: Record<string, string>;
}) {
  const defaultVariants: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-red-100 text-red-800",
    withdrawn: "bg-gray-100 text-gray-600",
  };
  const map = variants || defaultVariants;
  const cls = map[status] || "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function TypeBadge({ type }: { type?: string }) {
  const map: Record<string, string> = {
    Core: "bg-blue-100 text-blue-800",
    Elective: "bg-purple-100 text-purple-800",
    Lab: "bg-orange-100 text-orange-800",
  };
  const t = type || "Core";
  return (
    <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${map[t] || "bg-gray-100 text-gray-600"}`}>
      {t}
    </span>
  );
}
