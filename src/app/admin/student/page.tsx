"use client";
import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import * as XLSX from "xlsx";
import { db } from "../../../../src/config/firebaseConfig";
import Link from "next/link";
import Skeleton from "../../../common/components/Skeleton";
import toast from "react-hot-toast";
import {
  HiTrash,
  HiXCircle,
  HiMagnifyingGlass,
  HiPencil,
} from "react-icons/hi2";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function StudentPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Search ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState<
    | "all"
    | "name"
    | "regNumber"
    | "uniRegNumber"
    | "email"
    | "phone"
    | "batch"
    | "rollNumber"
  >("all");

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // --- Bulk Selection ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // --- Upload ---
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    active: boolean;
    total: number;
    done: number;
    failed: { name: string; reason: string }[];
    current: string;
  }>({ active: false, total: 0, done: 0, failed: [], current: "" });

  // ── Fetch ──
  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const studentsSnapshot = await getDocs(collection(db, "students"));
      const studentList = studentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStudents(studentList);

      const deptSnapshot = await getDocs(collection(db, "departments"));
      const deptList = deptSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      deptList.sort((a: any, b: any) =>
        (a.name || "").localeCompare(b.name || ""),
      );
      setDepartments(deptList);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message);
      toast.error("Failed to load data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) toast("Loading is slower than usual...", { icon: "⏳" });
    }, 5000);
    fetchStudents().finally(() => clearTimeout(timeoutId));
  }, []);

  // ── Filter + Search (memoized) ──
  // Coerce to String() first — Firestore may store phone/batch as numbers
  const toStr = (v: any) => String(v ?? "").toLowerCase();

  const filteredStudents = useMemo(() => {
    let list = selectedDept
      ? students.filter((s) => s.department === selectedDept)
      : students;

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((s) => {
        if (searchField === "all") {
          return (
            toStr(s.name).includes(q) ||
            toStr(s.regNumber).includes(q) ||
            toStr(s.uniRegNumber).includes(q) ||
            toStr(s.email).includes(q) ||
            toStr(s.phone).includes(q) ||
            toStr(s.batch).includes(q) ||
            toStr(s.rollNumber).includes(q)
          );
        }
        return toStr(s[searchField]).includes(q);
      });
    }
    return list;
  }, [students, selectedDept, searchQuery, searchField]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedStudents = filteredStudents.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, searchField, selectedDept, pageSize]);

  // ── Selection helpers ──
  const allPageSelected =
    pagedStudents.length > 0 &&
    pagedStudents.every((s) => selectedIds.has(s.id));

  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pagedStudents.forEach((s) => next.delete(s.id));
      } else {
        pagedStudents.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ── Individual Delete ──
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;
    try {
      await deleteDoc(doc(db, "students", id));
      toast.success("Student deleted successfully");
      setStudents((prev) => prev.filter((s) => s.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete student");
    }
  };

  // ── Bulk Delete ──
  const handleBulkDelete = async () => {
    setBulkDeleteLoading(true);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach((id) => batch.delete(doc(db, "students", id)));
      await batch.commit();
      const count = selectedIds.size;
      setStudents((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
      toast.success(
        `${count} student${count > 1 ? "s" : ""} deleted successfully`,
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete selected students");
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // ── Status toggle ──
  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "withdrawn" : "active";
    try {
      await updateDoc(doc(db, "students", id), { status: newStatus });
      toast.success(`Student status updated to ${newStatus}`);
      setStudents((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s)),
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  // ── Export ──
  const handleExport = () => {
    const toExport = someSelected
      ? students.filter((s) => selectedIds.has(s.id))
      : filteredStudents;
    if (toExport.length === 0) {
      toast.error("No data to export");
      return;
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      toExport.map((s) => ({
        Name: s.name,
        "Reg Number": s.regNumber,
        "Uni Reg No": s.uniRegNumber,
        "Roll Number": s.rollNumber,
        Email: s.email,
        Phone: s.phone,
        Department: s.department,
        Batch: s.batch,
        Attendance: s.attendance,
        Status: s.status,
      })),
    );
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "students_data.xlsx");
    toast.success(
      someSelected
        ? `Exported ${toExport.length} selected records`
        : "Export successful!",
    );
  };

  // ── Bulk Upload ──
  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];
        if (data.length === 0) {
          toast.error("File is empty");
          return;
        }
        const first = data[0];
        if (
          !("Email" in first || "email" in first) ||
          !("Password" in first || "password" in first)
        ) {
          toast.error("File must have 'Email' and 'Password' columns");
          return;
        }
        setShowUploadModal(false);
        setUploadProgress({
          active: true,
          total: data.length,
          done: 0,
          failed: [],
          current: "",
        });
        const nextIdMap: { [key: string]: number } = {};
        let successCount = 0;
        for (const student of data) {
          const name = student.Name || student.name || "Unknown";
          const email = student.Email || student.email || "";
          const password = student.Password || student.password || "";
          const studentDept = student.Department || student.department || "";
          const batchRaw = student.Batch || student.batch || "";
          setUploadProgress((p) => ({ ...p, current: name }));
          if (!email || !password) {
            setUploadProgress((p) => ({
              ...p,
              done: p.done + 1,
              failed: [
                ...p.failed,
                { name, reason: "Missing email or password" },
              ],
            }));
            continue;
          }
          if (password.length < 6) {
            setUploadProgress((p) => ({
              ...p,
              done: p.done + 1,
              failed: [
                ...p.failed,
                { name, reason: "Password too short (min 6)" },
              ],
            }));
            continue;
          }
          let regNumber =
            student["Admission No"] ||
            student["Admission Number"] ||
            student.AdmissionNo ||
            student.RegNumber ||
            student.regNumber ||
            student["Register Number"];
          if (!regNumber) {
            let deptCode = studentDept.substring(0, 3).toUpperCase();
            if (studentDept.toLowerCase().includes("computer")) deptCode = "CS";
            if (studentDept.toLowerCase().includes("mechanical"))
              deptCode = "ME";
            if (studentDept.toLowerCase().includes("civil")) deptCode = "CE";
            if (studentDept.toLowerCase().includes("electrical"))
              deptCode = "EEE";
            if (studentDept.toLowerCase().includes("electronics"))
              deptCode = "ECE";
            const yearMatch = String(batchRaw).match(/\d{4}/);
            const year = yearMatch
              ? yearMatch[0]
              : new Date().getFullYear().toString();
            const mapKey = `${deptCode}_${year}`;
            if (nextIdMap[mapKey] === undefined) {
              nextIdMap[mapKey] = 1000;
              students.forEach((s) => {
                const r = s.regNumber || "";
                if (r.includes(deptCode) && r.includes(year)) {
                  const parts = r.split("/");
                  if (parts.length > 0 && !isNaN(parseInt(parts[0])))
                    nextIdMap[mapKey] = Math.max(
                      nextIdMap[mapKey],
                      parseInt(parts[0]),
                    );
                }
              });
            }
            nextIdMap[mapKey]++;
            regNumber = `${nextIdMap[mapKey]}/${deptCode}/${year}`;
          }
          try {
            const res = await fetch("/api/create-student-account", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password }),
            });
            const result = await res.json();
            if (!res.ok)
              throw new Error(result.error || "Account creation failed");
            const uid: string = result.uid;
            const { setDoc, doc: fsDoc } = await import("firebase/firestore");
            await setDoc(fsDoc(db, "students", uid), {
              name,
              regNumber,
              uniRegNumber:
                student["University Reg No"] ||
                student.uniRegNumber ||
                student.UniRegNumber ||
                "",
              rollNumber: student["Roll Number"] || student.rollNumber || "",
              email,
              phone: student.Phone || student.phone || "",
              department: studentDept,
              batch: batchRaw,
              status: "active",
              attendance: "0%",
              role: "student",
              uid,
              createdAt: new Date().toISOString(),
            });
            await setDoc(fsDoc(db, "parents", uid), {
              studentId: uid,
              studentName: name,
              email,
              phone: student.Phone || student.phone || "",
              role: "parent",
              createdAt: new Date().toISOString(),
            });
            successCount++;
            setUploadProgress((p) => ({ ...p, done: p.done + 1 }));
          } catch (err: any) {
            setUploadProgress((p) => ({
              ...p,
              done: p.done + 1,
              failed: [
                ...p.failed,
                { name, reason: err.message || "Unknown error" },
              ],
            }));
          }
        }
        setUploadProgress((p) => ({ ...p, active: false, current: "" }));
        if (successCount > 0) {
          toast.success(
            `✅ ${successCount} student account${successCount > 1 ? "s" : ""} created!`,
          );
          fetchStudents();
        }
        if (data.length - successCount > 0 && successCount < data.length)
          toast.error(
            `⚠️ ${data.length - successCount} failed — check summary.`,
          );
      } catch (error: any) {
        toast.error("Failed to process file: " + error.message);
        setUploadProgress((p) => ({ ...p, active: false }));
      }
    };
    reader.readAsBinaryString(file);
  };

  const getStatusColor = (status: string) =>
    status === "active"
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-red-100 text-red-800 border-red-200";

  const totalActive = filteredStudents.filter(
    (s) => s.status === "active",
  ).length;
  const totalAttendanceAvg =
    filteredStudents.length > 0
      ? filteredStudents.reduce(
          (sum, s) => sum + (parseFloat(s.attendance) || 0),
          0,
        ) / filteredStudents.length
      : 0;

  // ── Pagination page range helper ──
  const getPageRange = () => {
    const delta = 2;
    const range: (number | "...")[] = [];
    for (
      let i = Math.max(2, safePage - delta);
      i <= Math.min(totalPages - 1, safePage + delta);
      i++
    )
      range.push(i);
    if (safePage - delta > 2) range.unshift("...");
    if (safePage + delta < totalPages - 1) range.push("...");
    if (totalPages > 1) range.unshift(1);
    if (totalPages > 1) range.push(totalPages);
    return Array.from(new Set(range));
  };

  const searchFieldLabels: Record<string, string> = {
    all: "All Fields",
    name: "Name",
    regNumber: "Admission No.",
    uniRegNumber: "University Reg No.",
    email: "Email",
    phone: "Phone",
    batch: "Batch",
    rollNumber: "Roll Number",
  };

  // ── Loading ──
  if (loading)
    return (
      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
        <div className="w-full">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-4" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-40 rounded-lg" />
            ))}
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="p-4 border-b border-gray-100 flex justify-between items-center"
              >
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="p-6 bg-white rounded-lg shadow-md text-center max-w-md">
          <h3 className="text-red-500 text-lg font-bold mb-2">
            Error Loading Data
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchStudents}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Manage Students</h1>
          <p className="text-gray-600 mt-1">
            Records and academic profiles for enrolled students.
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Link href="/admin/student/add">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              + Add Student
            </button>
          </Link>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            Upload CSV/Excel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            {someSelected
              ? `Export Selected (${selectedIds.size})`
              : "Export Data"}
          </button>
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              clearSelection();
            }}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm cursor-pointer min-w-[200px]"
          >
            <option value="">All Departments</option>
            {departments.map((dept: any) => (
              <option key={dept.id} value={dept.name}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* ── Search Bar ── */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Field selector */}
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 bg-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 cursor-pointer"
          >
            {Object.entries(searchFieldLabels).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>

          {/* Search input */}
          <div className="relative flex-1 min-w-[220px]">
            <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search by ${searchFieldLabels[searchField].toLowerCase()}…`}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <HiXCircle className="text-lg" />
              </button>
            )}
          </div>

          {/* Result count badge */}
          {searchQuery && (
            <div className="flex items-center px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 font-medium">
              {filteredStudents.length} result
              {filteredStudents.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Bulk Action Bar */}
        {someSelected && (
          <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {selectedIds.size}
                </span>
              </div>
              <span className="text-sm font-semibold text-blue-900">
                {selectedIds.size === 1
                  ? "1 student"
                  : `${selectedIds.size} students`}{" "}
                selected
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 text-sm text-blue-700 hover:text-blue-900 font-medium rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
              >
                <HiXCircle className="text-base" /> Clear
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-1.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <HiTrash className="text-base" />
                Delete Selected ({selectedIds.size})
              </button>
            </div>
          </div>
        )}

        {/* Students Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {pagedStudents.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-xl text-gray-500 mb-2">No students found</p>
              <p className="text-sm text-gray-400 mb-5">
                {searchQuery
                  ? `No results for "${searchQuery}" in ${searchFieldLabels[searchField]}`
                  : "No students match the current filters"}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                        title={
                          allPageSelected ? "Deselect page" : "Select page"
                        }
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Reg No &amp; Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Department / Batch
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Attendance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {pagedStudents.map((student) => {
                    const isChecked = selectedIds.has(student.id);
                    return (
                      <tr
                        key={student.id}
                        className={`transition-colors ${isChecked ? "bg-blue-50/60" : "hover:bg-gray-50/60"}`}
                      >
                        <td className="px-4 py-4 w-10">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(student.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                          />
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {student.name}
                          </div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">
                            {student.regNumber}
                          </div>
                          {student.uniRegNumber && (
                            <div className="text-xs text-blue-600 font-mono mt-0.5 font-medium">
                              {student.uniRegNumber}
                            </div>
                          )}
                          {student.rollNumber && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              Roll: {student.rollNumber}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900">
                            {student.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            {student.phone}
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {student.department}
                          </div>
                          <div className="text-sm text-gray-500">
                            {student.batch}
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-blue-600">
                            {student.attendance || "0%"}
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(student.status || "active")}`}
                          >
                            {(student.status || "active").toUpperCase()}
                          </span>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Link href={`/admin/student/edit/${student.id}`}>
                              <button className="text-xs font-medium px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1">
                                <HiPencil className="text-sm" /> Edit
                              </button>
                            </Link>
                            <button
                              onClick={() =>
                                toggleStatus(
                                  student.id,
                                  student.status || "active",
                                )
                              }
                              className={`text-xs font-medium px-2 py-1 rounded border transition-colors ${
                                (student.status || "active") === "active"
                                  ? "text-red-600 border-red-100 hover:bg-red-50"
                                  : "text-green-600 border-green-100 hover:bg-green-50"
                              }`}
                            >
                              {(student.status || "active") === "active"
                                ? "Withdraw"
                                : "Re-enroll"}
                            </button>
                            <button
                              onClick={() => handleDelete(student.id)}
                              className="p-1 rounded border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <HiTrash className="text-sm" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {filteredStudents.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {/* Left: info + page size */}
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>
                Showing{" "}
                <strong className="text-gray-700">
                  {(safePage - 1) * pageSize + 1}–
                  {Math.min(safePage * pageSize, filteredStudents.length)}
                </strong>{" "}
                of{" "}
                <strong className="text-gray-700">
                  {filteredStudents.length}
                </strong>
                {selectedDept || searchQuery ? " (filtered)" : ""}
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
              {someSelected && (
                <span className="font-medium text-blue-600">
                  {selectedIds.size} selected
                </span>
              )}
            </div>

            {/* Right: page buttons */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ‹ Prev
                </button>

                {getPageRange().map((page, i) =>
                  page === "..." ? (
                    <span
                      key={`ellipsis-${i}`}
                      className="px-2 text-gray-400 text-sm select-none"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page as number)}
                      className={`min-w-[36px] px-2.5 py-1.5 text-sm rounded-lg border transition-colors ${
                        safePage === page
                          ? "bg-blue-600 text-white border-blue-600 font-semibold shadow-sm"
                          : "border-gray-300 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={safePage === totalPages}
                  className="px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next ›
                </button>
              </div>
            )}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            {
              label: "Total Students",
              value: filteredStudents.length,
              color: "border-l-blue-500",
            },
            {
              label: "Active Students",
              value: totalActive,
              color: "border-l-green-500",
            },
            {
              label: "Avg Attendance",
              value: `${totalAttendanceAvg.toFixed(1)}%`,
              color: "border-l-purple-500",
            },
            {
              label: "Departments",
              value: new Set(filteredStudents.map((s) => s.department)).size,
              color: "border-l-orange-500",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`bg-white p-4 rounded-lg border border-gray-200 border-l-4 ${stat.color}`}
            >
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {stat.label}
              </h3>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bulk Delete Confirmation Modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !bulkDeleteLoading && setShowDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-5 flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <HiTrash className="text-white text-xl" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg leading-tight">
                  Delete Students
                </h3>
                <p className="text-red-100 text-sm mt-0.5">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700 text-sm leading-relaxed">
                You are about to permanently delete{" "}
                <strong className="text-red-700">
                  {selectedIds.size} student record
                  {selectedIds.size > 1 ? "s" : ""}
                </strong>{" "}
                from the database. All associated data will be lost.
              </p>
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-red-700 text-xs font-semibold">
                  ⚠️ Are you absolutely sure you want to proceed?
                </p>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={bulkDeleteLoading}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleteLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {bulkDeleteLoading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <HiTrash className="text-base" /> Delete {selectedIds.size}{" "}
                    Record{selectedIds.size > 1 ? "s" : ""}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Progress Modal ── */}
      {uploadProgress.active && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
              <h3 className="text-white font-bold text-lg">
                Creating Student Accounts
              </h3>
              <p className="text-blue-100 text-sm mt-0.5">
                Processing {uploadProgress.total} student
                {uploadProgress.total > 1 ? "s" : ""}…
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div
                  className="absolute inset-y-0 left-0 bg-blue-600 rounded-full transition-all duration-300"
                  style={{
                    width: `${uploadProgress.total ? Math.round((uploadProgress.done / uploadProgress.total) * 100) : 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mb-4">
                <span>
                  {uploadProgress.done} / {uploadProgress.total} processed
                </span>
                <span>
                  {uploadProgress.total
                    ? Math.round(
                        (uploadProgress.done / uploadProgress.total) * 100,
                      )
                    : 0}
                  %
                </span>
              </div>
              {uploadProgress.current && (
                <div className="text-sm text-gray-600 flex items-center gap-2 mb-3">
                  <svg
                    className="animate-spin h-4 w-4 text-blue-500 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Creating account for{" "}
                  <strong className="ml-1">{uploadProgress.current}</strong>…
                </div>
              )}
              {uploadProgress.failed.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-700 mb-1.5">
                    ⚠️ Failed so far ({uploadProgress.failed.length}):
                  </p>
                  {uploadProgress.failed.map((f, i) => (
                    <p key={i} className="text-xs text-red-600 leading-snug">
                      <strong>{f.name}</strong>: {f.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Failure Summary ── */}
      {!uploadProgress.active &&
        uploadProgress.total > 0 &&
        uploadProgress.failed.length > 0 && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() =>
                setUploadProgress({
                  active: false,
                  total: 0,
                  done: 0,
                  failed: [],
                  current: "",
                })
              }
            />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5">
                <h3 className="text-white font-bold text-lg">Upload Summary</h3>
                <p className="text-amber-100 text-sm mt-0.5">
                  {uploadProgress.done - uploadProgress.failed.length} succeeded
                  · {uploadProgress.failed.length} failed
                </p>
              </div>
              <div className="px-6 py-5">
                <p className="text-sm text-gray-600 mb-3">
                  The following students could not be added:
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-52 overflow-y-auto space-y-1.5">
                  {uploadProgress.failed.map((f, i) => (
                    <div
                      key={i}
                      className="text-xs border-b border-red-100 pb-1 last:border-0 last:pb-0"
                    >
                      <span className="font-semibold text-red-800">
                        {f.name}
                      </span>
                      <span className="text-red-600"> — {f.reason}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() =>
                    setUploadProgress({
                      active: false,
                      total: 0,
                      done: 0,
                      failed: [],
                      current: "",
                    })
                  }
                  className="mt-5 w-full px-4 py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-700 transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ── Upload Modal ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={() => setShowUploadModal(false)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <h2 className="text-xl font-bold text-gray-800">
                Bulk Upload Students
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh] bg-gray-50/50">
              <p className="text-gray-600 mb-4 text-sm">
                Upload a CSV or Excel file. A{" "}
                <strong className="text-blue-700">Firebase Auth account</strong>{" "}
                will be created for each student, along with a linked parent
                profile.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5 text-xs text-blue-800 leading-relaxed">
                <strong>🔐 Account Creation:</strong> Each row must have an{" "}
                <strong>Email</strong> and <strong>Password</strong> column.
                Passwords must be at least 6 characters.
              </div>
              <div className="bg-white border text-sm border-gray-200 rounded-lg overflow-hidden mb-5">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700">
                  Expected File Structure
                </div>
                <div className="p-4 space-y-2 font-mono text-xs text-gray-600">
                  {[
                    {
                      col: "Name",
                      desc: "(Required) Full name",
                      highlight: false,
                      opt: false,
                    },
                    {
                      col: "Email",
                      desc: "(Required) Login email",
                      highlight: false,
                      opt: false,
                    },
                    {
                      col: "Password",
                      desc: "(Required) Min 6 chars",
                      highlight: true,
                      opt: false,
                    },
                    {
                      col: "Department",
                      desc: "(Required) e.g., Computer Science",
                      highlight: false,
                      opt: false,
                    },
                    {
                      col: "Batch",
                      desc: "(Required) e.g., 2024-2028",
                      highlight: false,
                      opt: false,
                    },
                    {
                      col: "University Reg No",
                      desc: "(Optional) e.g., CMA22CS003",
                      highlight: false,
                      opt: true,
                    },
                    {
                      col: "Roll Number",
                      desc: "(Optional) Internal class roll",
                      highlight: false,
                      opt: true,
                    },
                    {
                      col: "Admission No.",
                      desc: "(Optional) Auto-generated if blank",
                      highlight: false,
                      opt: true,
                    },
                    {
                      col: "Phone",
                      desc: "(Optional) Contact number",
                      highlight: false,
                      opt: true,
                    },
                  ].map(({ col, desc, highlight, opt }) => (
                    <div
                      key={col}
                      className={`flex gap-2 rounded px-2 py-0.5 -mx-2 ${highlight ? "bg-amber-50" : ""}`}
                    >
                      <span
                        className={`font-bold min-w-[150px] ${highlight ? "text-amber-700" : "text-gray-900"}`}
                      >
                        {col}
                      </span>
                      <span
                        className={
                          highlight
                            ? "text-amber-600 font-medium"
                            : opt
                              ? "text-blue-600"
                              : ""
                        }
                      >
                        {desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 flex flex-col items-center justify-center border-dashed relative hover:bg-blue-100/50 transition-colors">
                <svg
                  className="w-10 h-10 text-blue-500 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="text-blue-700 font-semibold mb-1">
                  Click to browse files
                </span>
                <span className="text-blue-500/80 text-xs">
                  Supports .xlsx, .xls, .csv
                </span>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleBulkUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
