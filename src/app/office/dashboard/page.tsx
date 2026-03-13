"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import {
  MdReceiptLong,
  MdPeople,
  MdTrendingUp,
  MdSchool,
  MdWarning,
  MdCheckCircle,
  MdAccessTime,
} from "react-icons/md";
import Link from "next/link";

export default function OfficeDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    totalFeesPending: 0,
    totalFeesCollected: 0,
    activeScholarships: 0,
    activeDiscounts: 0,
  });
  const [recentFees, setRecentFees] = useState<any[]>([]);
  const [recentScholarships, setRecentScholarships] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch counts
      const [studentsCount, facultyCount] = await Promise.all([
        getCountFromServer(collection(db, "students")),
        getCountFromServer(collection(db, "faculty")),
      ]);

      // Fetch fees data
      let totalPending = 0;
      let totalCollected = 0;
      const feesSnap = await getDocs(collection(db, "fees"));
      const recentFeesData: any[] = [];
      feesSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.status === "paid") {
          totalCollected += data.paidAmount || data.amount || 0;
        } else {
          totalPending += (data.amount || 0) - (data.paidAmount || 0);
        }
        recentFeesData.push({ id: d.id, ...data });
      });
      recentFeesData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      // Fetch scholarships count
      let activeScholarships = 0;
      const scholarshipsSnap = await getDocs(collection(db, "scholarships"));
      scholarshipsSnap.docs.forEach((d) => {
        if (d.data().status === "active") activeScholarships++;
      });

      // Fetch discounts count
      let activeDiscounts = 0;
      const discountsSnap = await getDocs(collection(db, "fee_discounts"));
      discountsSnap.docs.forEach((d) => {
        if (d.data().status === "active") activeDiscounts++;
      });

      setStats({
        totalStudents: studentsCount.data().count,
        totalFaculty: facultyCount.data().count,
        totalFeesPending: totalPending,
        totalFeesCollected: totalCollected,
        activeScholarships,
        activeDiscounts,
      });
      setRecentFees(recentFeesData.slice(0, 5));
      setRecentScholarships(
        scholarshipsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s: any) => s.status === "active")
          .slice(0, 4)
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  if (loading) {
    return (
      <div className="p-4 md:p-6 min-h-screen bg-gray-50 animate-pulse">
        <div className="h-8 w-56 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-80 bg-gray-100 rounded mb-8"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-gray-100"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-white rounded-xl border border-gray-100"></div>
          <div className="h-64 bg-white rounded-xl border border-gray-100"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Office Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Overview of fees, scholarships, and staff management
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <MdPeople className="text-xl text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Students</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <MdTrendingUp className="text-xl text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.totalFeesCollected)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Fees Collected</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <MdReceiptLong className="text-xl text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.totalFeesPending)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Fees Pending</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <MdSchool className="text-xl text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.activeScholarships}</p>
          <p className="text-xs text-gray-500 mt-0.5">Active Scholarships</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Student Fees", href: "/office/student-fees", icon: MdReceiptLong, color: "blue" },
          { label: "Fee Discounts", href: "/office/fee-discounts", icon: MdWarning, color: "amber" },
          { label: "Scholarships", href: "/office/scholarships", icon: MdSchool, color: "purple" },
          { label: "Staff Directory", href: "/office/staff", icon: MdPeople, color: "emerald" },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="bg-white rounded-xl p-4 border border-gray-100 hover:border-gray-200 transition-colors flex items-center gap-3"
          >
            <action.icon className={`text-xl text-${action.color}-600`} />
            <span className="text-sm font-medium text-gray-700">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Fee Records */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Recent Fee Records</h2>
            <Link
              href="/office/student-fees"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentFees.length > 0 ? (
              recentFees.map((fee: any) => (
                <div key={fee.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {fee.studentName || "Student"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {fee.feeType || "Tuition"} · {fee.semester || ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(fee.amount || 0)}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
                        fee.status === "paid"
                          ? "bg-emerald-50 text-emerald-700"
                          : fee.status === "overdue"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {fee.status === "paid" ? (
                        <MdCheckCircle className="text-xs" />
                      ) : (
                        <MdAccessTime className="text-xs" />
                      )}
                      {fee.status?.charAt(0).toUpperCase() + fee.status?.slice(1)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-gray-400 text-sm">
                No fee records yet
              </div>
            )}
          </div>
        </div>

        {/* Active Scholarships */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Active Scholarships</h2>
            <Link
              href="/office/scholarships"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentScholarships.length > 0 ? (
              recentScholarships.map((s: any) => (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500">
                      {s.provider} · {s.recipientCount || 0} recipients
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-purple-600">
                    {formatCurrency(s.amount || 0)}
                  </p>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-gray-400 text-sm">
                No active scholarships
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Active Discounts
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeDiscounts}</p>
          <Link
            href="/office/fee-discounts"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block"
          >
            Manage Discounts
          </Link>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Total Faculty
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalFaculty}</p>
          <Link
            href="/office/staff"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block"
          >
            View Directory
          </Link>
        </div>
      </div>
    </div>
  );
}
