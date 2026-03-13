"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  MdAssessment,
  MdDownload,
  MdSearch,
  MdCalendarToday,
  MdTrendingUp,
  MdAccountBalance,
  MdPieChart,
} from "react-icons/md";

interface PaymentRecord {
  id: string;
  studentName: string;
  regNumber: string;
  feeType: string;
  amount: number;
  paymentDate: string;
  paymentMode?: string;
  createdAt: any;
  batch?: string;
  department?: string;
}

const PRESETS = ["Today", "Yesterday", "This Week", "This Month", "Last Month", "This Quarter", "This Year", "Custom"] as const;
type Preset = typeof PRESETS[number];

function getPresetRange(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());

  switch (preset) {
    case "Today": return { from: fmt(now), to: fmt(now) };
    case "Yesterday": {
      const y = new Date(now); y.setDate(now.getDate() - 1);
      return { from: fmt(y), to: fmt(y) };
    }
    case "This Week": return { from: fmt(startOfWeek), to: fmt(now) };
    case "This Month": return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) };
    case "Last Month": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: fmt(s), to: fmt(e) };
    }
    case "This Quarter": {
      const q = Math.floor(now.getMonth() / 3);
      const s = new Date(now.getFullYear(), q * 3, 1);
      return { from: fmt(s), to: fmt(now) };
    }
    case "This Year": return { from: fmt(new Date(now.getFullYear(), 0, 1)), to: fmt(now) };
    default: return { from: fmt(now), to: fmt(now) };
  }
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>("This Month");
  const [fromDate, setFromDate] = useState(() => getPresetRange("This Month").from);
  const [toDate, setToDate] = useState(() => getPresetRange("This Month").to);
  const [feeTypeFilter, setFeeTypeFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { if (user) fetchPayments(); }, [user]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "payment_history"), orderBy("createdAt", "desc")));
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentRecord)));
    } catch (e) { toast.error("Failed to load payments"); }
    finally { setLoading(false); }
  };

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p !== "Custom") {
      const { from, to } = getPresetRange(p);
      setFromDate(from);
      setToDate(to);
    }
  };

  const inRange = (dateStr: string) => {
    if (!dateStr) return false;
    return dateStr >= fromDate && dateStr <= toDate;
  };

  const feeTypes = ["All", ...Array.from(new Set(payments.map(p => p.feeType).filter(Boolean)))];

  const filtered = payments.filter(p => {
    if (!inRange(p.paymentDate)) return false;
    if (feeTypeFilter !== "All" && p.feeType !== feeTypeFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        p.studentName?.toLowerCase().includes(q) ||
        p.regNumber?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalAmount = filtered.reduce((s, p) => s + (p.amount || 0), 0);
  const byFeeType: Record<string, number> = {};
  filtered.forEach(p => { byFeeType[p.feeType] = (byFeeType[p.feeType] || 0) + p.amount; });

  const byDate: Record<string, number> = {};
  filtered.forEach(p => {
    const d = p.paymentDate || "";
    byDate[d] = (byDate[d] || 0) + p.amount;
  });

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const formatDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  // ── Export to Excel ──
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    // Summary sheet
    const summaryData = [
      ["EduMate Fee Report"],
      [`Period: ${formatDate(fromDate)} – ${formatDate(toDate)}`],
      [`Generated: ${new Date().toLocaleString("en-IN")}`],
      [],
      ["Total Transactions", filtered.length],
      ["Total Amount", totalAmount],
      [],
      ["Fee Type Breakdown"],
      ...Object.entries(byFeeType).map(([type, amt]) => [type, amt]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Summary");

    // Detail sheet
    const detailData = filtered.map(p => ({
      "Payment Date": p.paymentDate,
      "Student Name": p.studentName,
      "Reg Number": p.regNumber,
      "Fee Type": p.feeType,
      "Amount (₹)": p.amount,
      "Mode": p.paymentMode || "cash",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailData), "Transactions");
    XLSX.writeFile(wb, `fee-report-${fromDate}-to-${toDate}.xlsx`);
    toast.success("Excel report downloaded!");
  };

  // ── Export to PDF via print ──
  const exportPDF = () => {
    const typeBreakdown = Object.entries(byFeeType)
      .map(([type, amt]) => `<tr><td>${type}</td><td style="text-align:right;font-weight:600;">${formatCurrency(amt)}</td><td style="text-align:right;color:#666;">${((amt / totalAmount) * 100).toFixed(1)}%</td></tr>`)
      .join("");

    const rows = filtered.map(p =>
      `<tr>
        <td>${formatDate(p.paymentDate)}</td>
        <td>${p.studentName || "—"}</td>
        <td>${p.regNumber || "—"}</td>
        <td>${p.feeType || "—"}</td>
        <td style="text-align:right;font-weight:600;color:#059669;">₹${(p.amount || 0).toLocaleString("en-IN")}</td>
        <td>${p.paymentMode || "cash"}</td>
      </tr>`
    ).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Fee Report ${fromDate} to ${toDate}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;color:#111;padding:40px;font-size:13px}
  .header{text-align:center;border-bottom:2px solid #2563EB;padding-bottom:16px;margin-bottom:24px}
  .header h1{color:#2563EB;font-size:24px}.header p{color:#555;margin-top:4px}
  .stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px}
  .stat-box{background:#f0f7ff;border-radius:8px;padding:16px;text-align:center}
  .stat-box .label{font-size:11px;text-transform:uppercase;color:#666;margin-bottom:4px}
  .stat-box .value{font-size:20px;font-weight:700;color:#1e3a8a}
  h2{font-size:14px;font-weight:700;color:#333;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  th{text-align:left;background:#f9fafb;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#888;border:1px solid #e5e7eb}
  td{padding:8px 10px;border:1px solid #e5e7eb;font-size:12px}
  tr:nth-child(even) td{background:#f9fafb}
  .total-row td{font-weight:700;background:#f0f7ff}
  .footer{text-align:center;font-size:10px;color:#aaa;border-top:1px solid #e5e7eb;padding-top:16px;margin-top:24px}
  @media print{body{padding:20px}}
</style>
</head>
<body>
<div class="header">
  <h1>🎓 EduMate — Fee Collection Report</h1>
  <p>Period: ${formatDate(fromDate)} – ${formatDate(toDate)} &nbsp;|&nbsp; Generated on ${new Date().toLocaleString("en-IN")}</p>
</div>
<div class="stats">
  <div class="stat-box"><div class="label">Total Transactions</div><div class="value">${filtered.length}</div></div>
  <div class="stat-box"><div class="label">Total Collected</div><div class="value">${formatCurrency(totalAmount)}</div></div>
  <div class="stat-box"><div class="label">Avg per Transaction</div><div class="value">${filtered.length > 0 ? formatCurrency(totalAmount / filtered.length) : "—"}</div></div>
</div>
<h2>Fee Type Breakdown</h2>
<table>
  <tr><th>Fee Type</th><th style="text-align:right;">Amount</th><th style="text-align:right;">% of Total</th></tr>
  ${typeBreakdown}
  <tr class="total-row"><td>Total</td><td style="text-align:right;">${formatCurrency(totalAmount)}</td><td style="text-align:right;">100%</td></tr>
</table>
<h2>Transaction Details</h2>
<table>
  <tr><th>Date</th><th>Student Name</th><th>Reg No.</th><th>Fee Type</th><th style="text-align:right;">Amount</th><th>Mode</th></tr>
  ${rows}
  <tr class="total-row"><td colspan="4">Total</td><td style="text-align:right;">${formatCurrency(totalAmount)}</td><td></td></tr>
</table>
<div class="footer">EduMate Learning Management System &bull; This is a computer-generated report</div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) w.onload = () => w.print();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast.success("PDF report opened for printing/saving");
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MdAssessment className="text-blue-600 text-3xl" />
            Fee Reports
          </h1>
          <p className="text-gray-500 text-sm mt-1">Generate and download fee collection reports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition text-sm">
            <MdDownload /> Excel
          </button>
          <button onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition text-sm">
            <MdDownload /> PDF
          </button>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PRESETS.map(p => (
          <button key={p} onClick={() => applyPreset(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              preset === p
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
            {p}
          </button>
        ))}
      </div>

      {/* Date Range + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {preset === "Custom" && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 whitespace-nowrap">From</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 whitespace-nowrap">To</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
          </>
        )}
        {preset !== "Custom" && (
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 flex items-center gap-2">
            <MdCalendarToday className="text-blue-500" />
            {formatDate(fromDate)} – {formatDate(toDate)}
          </div>
        )}
        <select value={feeTypeFilter} onChange={e => setFeeTypeFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500">
          {feeTypes.map(t => <option key={t} value={t}>{t === "All" ? "All Fee Types" : t}</option>)}
        </select>
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
          <input type="text" placeholder="Search student name or reg no..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Transactions</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium flex items-center gap-1">
            <MdTrendingUp className="text-emerald-500" /> Total Collected
          </p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium">Avg per Transaction</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {filtered.length > 0 ? formatCurrency(totalAmount / filtered.length) : "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-medium flex items-center gap-1">
            <MdPieChart className="text-blue-500" /> Fee Types
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{Object.keys(byFeeType).length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Fee Type Breakdown */}
        <div className="md:col-span-1 bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MdAccountBalance className="text-blue-500" /> Fee Type Breakdown
          </h3>
          {Object.keys(byFeeType).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(byFeeType).sort((a, b) => b[1] - a[1]).map(([type, amt]) => (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{type}</span>
                    <span className="text-gray-900 font-semibold">{formatCurrency(amt)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(amt / totalAmount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No data for this period</p>
          )}
        </div>

        {/* Daily trend */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MdTrendingUp className="text-emerald-500" /> Daily Collection
          </h3>
          {Object.keys(byDate).length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).map(([date, amt]) => (
                <div key={date} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-24 flex-shrink-0">{formatDate(date)}</span>
                  <div className="flex-1 h-6 bg-gray-50 rounded-lg overflow-hidden relative">
                    <div className="h-full bg-emerald-100 rounded-lg transition-all"
                      style={{ width: `${(amt / Math.max(...Object.values(byDate))) * 100}%` }} />
                    <span className="absolute inset-0 flex items-center pl-2 text-xs font-semibold text-emerald-700">{formatCurrency(amt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No transactions in this period</p>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-5 border-b border-gray-50">
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-50 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {["Date", "Student", "Fee Type", "Mode", "Amount"].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-gray-600">{formatDate(p.paymentDate)}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{p.studentName}</p>
                      <p className="text-xs text-gray-500">{p.regNumber}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full">{p.feeType}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.paymentMode === "razorpay" ? "bg-indigo-50 text-indigo-700" : "bg-gray-50 text-gray-700"}`}>
                        {p.paymentMode === "razorpay" ? "💳 Razorpay" : "💵 Cash"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold text-emerald-600">{formatCurrency(p.amount)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile */}
          <div className="md:hidden divide-y divide-gray-50">
            {filtered.map(p => (
              <div key={p.id} className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.studentName}</p>
                    <p className="text-xs text-gray-500">{p.regNumber} · {formatDate(p.paymentDate)}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">{formatCurrency(p.amount)}</span>
                </div>
                <span className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full">{p.feeType}</span>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-between">
            <span className="text-xs text-gray-500">{filtered.length} transactions</span>
            <span className="text-sm font-semibold">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-100">
          <MdAssessment className="text-5xl text-gray-200 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No transactions found</h3>
          <p className="text-gray-500 text-sm mt-1">Try adjusting the date range or filters</p>
        </div>
      )}
    </div>
  );
}
