"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import {
  MdPayment,
  MdSearch,
  MdFilterList,
  MdDownload,
  MdCalendarToday,
  MdTrendingUp,
  MdReceiptLong,
} from "react-icons/md";

interface PaymentRecord {
  id: string;
  feeId: string;
  studentName: string;
  regNumber: string;
  feeType: string;
  amount: number;
  paymentDate: string;
  createdAt: any;
  department?: string;
  batch?: string;
  paymentMode?: string;
  receiptNumber?: string;
  transactionId?: string;
}


const DATE_FILTERS = ["All Time", "Today", "This Week", "This Month", "Last Month"];

export default function PaymentHistoryPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFeeType, setFilterFeeType] = useState("All");
  const [filterDate, setFilterDate] = useState("All Time");

  useEffect(() => {
    if (!user) return;
    fetchPayments();
  }, [user]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(
        query(collection(db, "payment_history"), orderBy("createdAt", "desc"))
      );
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord));
      setPayments(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load payment history");
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getDateFilterRange = (filter: string): { from: Date | null; to: Date | null } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (filter) {
      case "Today":
        return { from: today, to: new Date(today.getTime() + 86400000) };
      case "This Week": {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return { from: startOfWeek, to: new Date() };
      }
      case "This Month":
        return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date() };
      case "Last Month": {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return { from: start, to: end };
      }
      default:
        return { from: null, to: null };
    }
  };

  const feeTypes = ["All", ...Array.from(new Set(payments.map((p) => p.feeType).filter(Boolean)))];

  const filtered = payments.filter((p) => {
    const matchSearch =
      p.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.regNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.feeType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.transactionId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterFeeType === "All" || p.feeType === filterFeeType;

    let matchDate = true;
    if (filterDate !== "All Time") {
      const { from, to } = getDateFilterRange(filterDate);
      if (from && to && p.paymentDate) {
        const payDate = new Date(p.paymentDate);
        matchDate = payDate >= from && payDate <= to;
      }
    }

    return matchSearch && matchType && matchDate;
  });

  // Stats
  const totalCollected = filtered.reduce((s, p) => s + (p.amount || 0), 0);
  const todayPayments = payments.filter((p) => {
    const today = new Date().toISOString().split("T")[0];
    return p.paymentDate === today;
  });
  const todayTotal = todayPayments.reduce((s, p) => s + (p.amount || 0), 0);

  const thisMonthPayments = payments.filter((p) => {
    const now = new Date();
    if (!p.paymentDate) return false;
    const d = new Date(p.paymentDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthTotal = thisMonthPayments.reduce((s, p) => s + (p.amount || 0), 0);

  const exportCSV = () => {
    const headers = ["Student Name", "Reg Number", "Fee Type", "Amount", "Date"];
    const rows = filtered.map((p) => [
      p.studentName,
      p.regNumber,
      p.feeType,
      p.amount,
      p.paymentDate,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported successfully");
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MdPayment className="text-blue-600 text-3xl" />
            Payment History
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track all fee payment transactions
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition text-sm"
        >
          <MdDownload className="text-xl" />
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Transactions</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{payments.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <MdCalendarToday className="text-blue-500 text-sm" />
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Today</p>
          </div>
          <p className="text-xl font-bold text-blue-600 mt-0">{formatCurrency(todayTotal)}</p>
          <p className="text-xs text-gray-400">{todayPayments.length} transactions</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <MdTrendingUp className="text-emerald-500 text-sm" />
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">This Month</p>
          </div>
          <p className="text-xl font-bold text-emerald-600 mt-0">{formatCurrency(monthTotal)}</p>
          <p className="text-xs text-gray-400">{thisMonthPayments.length} transactions</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Filtered Total</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalCollected)}</p>
          <p className="text-xs text-gray-400">{filtered.length} records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
          <input
            type="text"
            placeholder="Search by student name or reg number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterFeeType}
          onChange={(e) => setFilterFeeType(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          {feeTypes.map((t) => (
            <option key={t} value={t}>{t === "All" ? "All Fee Types" : t}</option>
          ))}
        </select>
        <select
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          {DATE_FILTERS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-5 border-b border-gray-50">
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-50 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">
                    Transaction ID
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">
                    Student
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">
                    Fee Type
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">
                    Amount Paid
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">
                    Payment Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span
                        className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full cursor-pointer hover:bg-blue-100 transition"
                        title="Click to copy"
                        onClick={() => { navigator.clipboard.writeText(payment.transactionId || payment.id); toast.success("Copied!"); }}
                      >
                        {payment.transactionId
                          ? payment.transactionId.length > 20
                            ? payment.transactionId.slice(-12)
                            : payment.transactionId
                          : `#${payment.id.slice(-8).toUpperCase()}`}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{payment.studentName}</p>
                      <p className="text-xs text-gray-500">{payment.regNumber}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full">
                        {payment.feeType || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold text-emerald-600">
                        {formatCurrency(payment.amount || 0)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {formatDate(payment.paymentDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {filtered.map((payment) => (
              <div key={payment.id} className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{payment.studentName}</p>
                    <p className="text-xs text-gray-500">{payment.regNumber}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">
                    {formatCurrency(payment.amount || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full">
                    {payment.feeType || "—"}
                  </span>
                  <span className="text-xs text-gray-500">{formatDate(payment.paymentDate)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer summary */}
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Showing {filtered.length} of {payments.length} transactions
            </span>
            <span className="text-sm font-semibold text-gray-900">
              Total: {formatCurrency(totalCollected)}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <MdReceiptLong className="text-3xl text-gray-300" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No payment records found</h3>
          <p className="text-gray-500 text-sm mt-1">
            {searchTerm || filterFeeType !== "All" || filterDate !== "All Time"
              ? "Try adjusting your filters"
              : "Payment records will appear here once fees are collected"}
          </p>
        </div>
      )}
    </div>
  );
}
