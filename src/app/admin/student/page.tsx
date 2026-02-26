"use client";
import React, { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import * as XLSX from "xlsx";
import { db } from "../../../../src/config/firebaseConfig";
import Link from "next/link";
import Skeleton from "../../../common/components/Skeleton";
import toast from "react-hot-toast";

export default function page() {
  const [students, setStudents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Attempting to fetch students...");
      // Fetch Students
      const studentsSnapshot = await getDocs(collection(db, "students"));
      const studentList = studentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStudents(studentList);

      // Fetch Departments for Filter
      const deptSnapshot = await getDocs(collection(db, "departments"));
      const deptList = deptSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Sort departments alphabetically
      deptList.sort((a: any, b: any) =>
        (a.name || "").localeCompare(b.name || ""),
      );
      setDepartments(deptList);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message);
      toast.error("Failed to load data: " + err.message);

      if (err.code === "permission-denied") {
        toast.error("Check your Firestore Security Rules!");
      } else if (err.code === "unavailable") {
        toast.error("Network unavailable or Firestore offline");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Timeout detection
    const timeoutId = setTimeout(() => {
      if (loading) {
        toast("Loading is slower than usual...", {
          icon: "⏳",
        });
      }
    }, 5000);

    fetchStudents().finally(() => clearTimeout(timeoutId));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;
    try {
      await deleteDoc(doc(db, "students", id));
      toast.success("Student deleted successfully");
      // Update local state without refetching for speed
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete student");
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "withdrawn" : "active";
    try {
      await updateDoc(doc(db, "students", id), { status: newStatus });
      toast.success(`Student status updated to ${newStatus}`);
      // Update local state
      setStudents((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s)),
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  const getStatusColor = (status: string) => {
    return status === "active"
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast.error("File is empty");
          return;
        }

        // Batch write
        const batch = writeBatch(db);
        const studentRef = collection(db, "students");

        let count = 0;

        // Let's create a map to keep track of highest sequence numbers by dept and year to allow bulk inserts smoothly
        const nextIdMap: { [key: string]: number } = {};

        for (const student of data as any[]) {
          let regNumber =
            student["Admission No"] ||
            student["Admission Number"] ||
            student.AdmissionNo ||
            student.RegNumber ||
            student.regNumber ||
            student["Register Number"];

          if (!regNumber) {
            const studentDept = student.Department || student.department || "";
            let deptCode = studentDept.substring(0, 3).toUpperCase();
            if (studentDept.toLowerCase().includes("computer")) deptCode = "CS";
            if (studentDept.toLowerCase().includes("mechanical"))
              deptCode = "ME";
            if (studentDept.toLowerCase().includes("civil")) deptCode = "CE";
            if (studentDept.toLowerCase().includes("electrical"))
              deptCode = "EEE";
            if (studentDept.toLowerCase().includes("electronics"))
              deptCode = "ECE";

            const batchRaw = student.Batch || student.batch || "";
            const yearMatch = String(batchRaw).match(/\d{4}/);
            const year = yearMatch
              ? yearMatch[0]
              : new Date().getFullYear().toString();

            const mapKey = `${deptCode}_${year}`;

            // Only fetch max once per deptCode+year pair during upload
            if (nextIdMap[mapKey] === undefined) {
              nextIdMap[mapKey] = 1000;
              const q = query(
                collection(db, "students"),
                orderBy("createdAt", "desc"),
              );
              // In a simple system we just loop the whole state to find the max - `students` is stored in state!
              students.forEach((s) => {
                const r = s.regNumber || "";
                if (r.includes(deptCode) && r.includes(year)) {
                  const parts = r.split("/");
                  if (parts.length > 0 && !isNaN(parseInt(parts[0]))) {
                    nextIdMap[mapKey] = Math.max(
                      nextIdMap[mapKey],
                      parseInt(parts[0]),
                    );
                  }
                }
              });
            }

            nextIdMap[mapKey]++;
            regNumber = `${nextIdMap[mapKey]}/${deptCode}/${year}`;
          }

          const newDocRef = doc(studentRef); // Auto-ID
          batch.set(newDocRef, {
            name: student.Name || student.name,
            regNumber: regNumber,
            uniRegNumber:
              student["University Reg No"] ||
              student.uniRegNumber ||
              student.UniRegNumber ||
              "",
            email: student.Email || student.email,
            department: student.Department || student.department,
            status: "active",
            attendance: "0%",
            createdAt: new Date().toISOString(),
          });
          count++;
        }

        await batch.commit();
        toast.success(`Successfully added ${count} students`);
        fetchStudents(); // Refresh list
      } catch (error: any) {
        console.error("Bulk upload error:", error);
        toast.error("Failed to process file: " + error.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const [showUploadModal, setShowUploadModal] = useState(false);

  // Filter students based on selected department
  const filteredStudents = selectedDept
    ? students.filter((student) => student.department === selectedDept)
    : students;

  const QuickActions = () => (
    <div className="flex flex-wrap items-center gap-4 mb-6">
      <Link href="/admin/student/add">
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          Add New Student
        </button>
      </Link>

      <button
        onClick={() => setShowUploadModal(true)}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        Upload CSV/Excel
      </button>

      <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
        Export Data
      </button>

      {/* Department Filter Dropdown */}
      <select
        value={selectedDept}
        onChange={(e) => setSelectedDept(e.target.value)}
        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer min-w-[200px]"
      >
        <option value="">All Departments</option>
        {departments.map((dept: any) => (
          <option key={dept.id} value={dept.name}>
            {dept.name}
          </option>
        ))}
      </select>
    </div>
  );

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

  if (loading)
    return (
      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
        <div className="w-full">
          {/* Header Skeleton */}
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-4" />
            <Skeleton className="h-6 w-96" />
          </div>

          {/* Quick Actions Skeleton */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Skeleton className="h-10 w-40 rounded-lg" />
            <Skeleton className="h-10 w-40 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-56 rounded-lg" />
          </div>

          {/* Table Skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div className="flex space-x-6 w-full">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-4 w-24" />
                ))}
              </div>
            </div>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="p-4 border-b border-gray-100 flex justify-between items-center"
              >
                <div className="space-y-1">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-5 w-12 text-blue-600" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <div className="flex space-x-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            ))}
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-lg border border-gray-200 border-l-4 border-l-gray-300"
              >
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-8 w-16" />
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Students</h1>
          <p className="text-gray-600 mt-2">
            Records and academic profiles for enrolled students.
          </p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Students Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-xl text-gray-500 mb-4">
                No students found matching current filters
              </p>
              <Link href="/admin/student/add">
                <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  Add Your First Student
                </button>
              </Link>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reg No & Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Personal Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department / Batch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attendance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
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
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {student.email}
                      </div>
                      <div className="text-sm text-gray-500">
                        {student.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {student.department}
                      </div>
                      <div className="text-sm text-gray-500">
                        {student.batch}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-600">
                        {student.attendance || "0%"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(student.status || "active")}`}
                      >
                        {(student.status || "active").toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() =>
                          toggleStatus(student.id, student.status || "active")
                        }
                        className={`text-${(student.status || "active") === "active" ? "red" : "green"}-600 hover:underline`}
                      >
                        {(student.status || "active") === "active"
                          ? "Withdraw"
                          : "Re-enroll"}
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 border-l-4 border-l-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Total Students
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {filteredStudents.length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 border-l-4 border-l-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Active Students
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {totalActive}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 border-l-4 border-l-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Avg Attendance
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {totalAttendanceAvg.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 border-l-4 border-l-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Departments
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {new Set(filteredStudents.map((s) => s.department)).size}
            </p>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={() => setShowUploadModal(false)}
          />
          {/* Modal Body */}
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
              <p className="text-gray-600 mb-6 text-sm">
                Upload a CSV or Excel file containing your student records. The
                file should have a header row with the following column names.
                The system will automatically generate standard{" "}
                <strong>Register Numbers</strong> if left blank based on
                Department and Batch.
              </p>

              <div className="bg-white border text-sm border-gray-200 rounded-lg overflow-hidden mb-6">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700">
                  Expected File Structure
                </div>
                <div className="p-4 space-y-3 font-mono text-xs text-gray-600">
                  <div className="flex gap-2">
                    <span className="font-bold text-gray-900 min-w-[150px]">
                      Name
                    </span>
                    <span>(Required) Full name of the student</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-gray-900 min-w-[150px]">
                      Email
                    </span>
                    <span>(Required) Primary email address</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-gray-900 min-w-[150px]">
                      Department
                    </span>
                    <span>(Required) e.g., Computer Science, Mechanical</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-gray-900 min-w-[150px]">
                      Batch
                    </span>
                    <span>(Required) e.g., 2024-2028</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-gray-900 min-w-[150px]">
                      University Reg No
                    </span>
                    <span className="text-blue-600">
                      (Optional) e.g., CMA22CS003
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-gray-900 min-w-[150px]">
                      Roll Number
                    </span>
                    <span className="text-blue-600">
                      (Optional) Internal class roll
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-gray-900 min-w-[150px]">
                      Admission No.
                    </span>
                    <span className="text-blue-600">
                      (Optional) Auto-generated if blank
                    </span>
                  </div>
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
                  id="file-upload"
                  accept=".csv, .xlsx, .xls"
                  onChange={(e) => {
                    handleBulkUpload(e);
                    setShowUploadModal(false);
                  }}
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
