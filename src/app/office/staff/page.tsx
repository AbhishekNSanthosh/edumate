"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import {
  MdBadge,
  MdSearch,
  MdEmail,
  MdPhone,
  MdFilterList,
} from "react-icons/md";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  role: string;
  accessStatus: string;
}

export default function StaffDirectoryPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("All");

  useEffect(() => {
    if (!user) return;
    fetchStaff();
  }, [user]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "faculty"));
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as StaffMember));
      data.sort((a, b) => a.name.localeCompare(b.name));
      setStaff(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  const departments = ["All", ...Array.from(new Set(staff.map((s) => s.department).filter(Boolean)))];

  const filtered = staff.filter((s) => {
    const matchSearch =
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.designation?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = filterDept === "All" || s.department === filterDept;
    return matchSearch && matchDept;
  });

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case "hod":
        return "bg-purple-50 text-purple-700";
      case "principal":
        return "bg-amber-50 text-amber-700";
      case "director":
        return "bg-red-50 text-red-700";
      case "tutor":
        return "bg-blue-50 text-blue-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MdBadge className="text-blue-600 text-3xl" />
          Staff Directory
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          View faculty and staff details across departments
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Staff</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{staff.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Departments</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {new Set(staff.map((s) => s.department).filter(Boolean)).size}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 hidden md:block">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Active</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {staff.filter((s) => s.accessStatus === "active").length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
          <input
            type="text"
            placeholder="Search by name, email, or designation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 bg-gray-100 rounded-full" />
                <div>
                  <div className="h-4 bg-gray-100 rounded w-32 mb-1" />
                  <div className="h-3 bg-gray-50 rounded w-24" />
                </div>
              </div>
              <div className="h-3 bg-gray-50 rounded w-40 mb-2" />
              <div className="h-3 bg-gray-50 rounded w-36" />
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                  {member.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{member.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{member.designation || "Faculty"}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${getRoleColor(member.role)}`}>
                  {member.role || "Faculty"}
                </span>
              </div>

              <div className="space-y-2">
                {member.department && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MdFilterList className="text-sm flex-shrink-0" />
                    <span className="truncate">{member.department}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MdEmail className="text-sm flex-shrink-0" />
                  <span className="truncate">{member.email}</span>
                </div>
                {member.phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MdPhone className="text-sm flex-shrink-0" />
                    <span>{member.phone}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  member.accessStatus === "active"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {member.accessStatus === "active" ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <MdBadge className="text-3xl text-gray-300" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No staff found</h3>
          <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filter</p>
        </div>
      )}
    </div>
  );
}
