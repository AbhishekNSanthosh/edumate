"use client";
import React, { useState, useEffect } from "react";
import { collection, onSnapshot, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import Link from "next/link";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import Skeleton from "../../../common/components/Skeleton";

export default function DepartmentInternalPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [facultyCounts, setFacultyCounts] = useState<Record<string, number>>({});
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch real faculty and student counts per department name
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [facultySnap, studentSnap] = await Promise.all([
          getDocs(collection(db, "faculty")),
          getDocs(collection(db, "students")),
        ]);

        const fc: Record<string, number> = {};
        facultySnap.docs.forEach((d) => {
          const dept = d.data().department || "";
          if (dept) fc[dept] = (fc[dept] || 0) + 1;
        });

        const sc: Record<string, number> = {};
        studentSnap.docs.forEach((d) => {
          const dept = d.data().department || "";
          if (dept) sc[dept] = (sc[dept] || 0) + 1;
        });

        setFacultyCounts(fc);
        setStudentCounts(sc);
      } catch (err) {
        console.error("Failed to fetch counts", err);
      }
    };
    fetchCounts();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "departments"),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setDepartments(list);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        toast.error("Failed to load departments");
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete department "${name}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "departments", id));
      toast.success("Department deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleExport = () => {
    if (departments.length === 0) { toast.error("No data to export"); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      departments.map((d) => ({
        Name: d.name,
        Code: d.code,
        HOD: d.hod || "N/A",
        Status: d.status || "active",
        Faculty: facultyCounts[d.name] ?? 0,
        Students: studentCounts[d.name] ?? 0,
        Courses: (d.courses || []).length,
      })),
    );
    XLSX.utils.book_append_sheet(wb, ws, "Departments");
    XLSX.writeFile(wb, "departments_data.xlsx");
    toast.success("Exported successfully!");
  };

  const filtered = departments.filter((d) => {
    const matchesSearch =
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.code?.toLowerCase().includes(search.toLowerCase()) ||
      (d.hod || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || (d.status || "active") === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalFaculty = Object.values(facultyCounts).reduce((s, v) => s + v, 0);
  const totalStudents = Object.values(studentCounts).reduce((s, v) => s + v, 0);
  const activeDepts = departments.filter((d) => (d.status || "active") === "active").length;

  if (loading)
    return (
      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="flex space-x-4 mb-6">
          <Skeleton className="h-10 w-48 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex space-x-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-4 w-24" />)}
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 border-b border-gray-100 flex justify-between items-center">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <div className="flex space-x-2">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg border border-gray-200 border-l-4 border-l-gray-300">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Departments</h1>
            <p className="text-gray-600 mt-1">
              Overview and management of academic departments.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/department/add">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                + Add Department
              </button>
            </Link>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Export
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code, or HOD…"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Departments Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              {departments.length === 0
                ? "No departments found. Create one to get started."
                : "No departments match your search."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name & Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HOD</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Courses</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((dept) => (
                    <tr key={dept.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{dept.name}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">{dept.code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {dept.hod || <span className="text-gray-400 italic">Not assigned</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {(dept.courses || []).length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {facultyCounts[dept.name] ?? 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {(studentCounts[dept.name] ?? 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                            (dept.status || "active") === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {(dept.status || "active").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                        <Link href={`/admin/department/${dept.id}`}>
                          <button className="text-gray-600 hover:text-gray-900 transition-colors">View</button>
                        </Link>
                        <Link href={`/admin/department/edit/${dept.id}`}>
                          <button className="text-blue-600 hover:text-blue-800 transition-colors">Edit</button>
                        </Link>
                        <button
                          onClick={() => handleDelete(dept.id, dept.name)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <p className="text-xs text-gray-400 mt-2 text-right">
            Showing {filtered.length} of {departments.length} department{departments.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          {[
            { label: "Total Departments", value: departments.length, color: "border-l-blue-500" },
            { label: "Active Departments", value: activeDepts, color: "border-l-green-500" },
            { label: "Total Faculty", value: totalFaculty, color: "border-l-purple-500" },
            { label: "Total Students", value: totalStudents.toLocaleString(), color: "border-l-orange-500" },
          ].map((stat) => (
            <div key={stat.label} className={`bg-white p-5 rounded-lg border border-gray-200 border-l-4 ${stat.color}`}>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
