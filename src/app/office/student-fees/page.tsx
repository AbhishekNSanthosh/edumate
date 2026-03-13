"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import {
  MdReceiptLong,
  MdSearch,
  MdAdd,
  MdClose,
  MdCheckCircle,
  MdAccessTime,
  MdWarning,
  MdEdit,
  MdDelete,
  MdFilterList,
} from "react-icons/md";

declare global { interface Window { Razorpay: any; } }

interface FeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  regNumber: string;
  batch: string;
  department: string;
  feeType: string;
  amount: number;
  dueDate: string;
  status: "paid" | "pending" | "overdue" | "partial";
  paidAmount: number;
  paidDate?: string;
  semester: string;
  academicYear: string;
  createdAt: any;
}

// Main/mandatory fee types only — Hostel & Transport are optional per-student (student_services collection)
const FEE_TYPES = ["Tuition", "Lab", "Exam", "Library", "Sports", "Other"];

export default function StudentFeesPage() {
  const { user } = useAuth();

  // ─── Unique Transaction ID ────────────────────────────────────────────────
  const generateTxnId = () => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, "");        // YYYYMMDD
    const time = now.toTimeString().slice(0, 8).replace(/:/g, "");        // HHMMSS
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 random chars
    return `TXN-${date}-${time}-${rand}`;
  };
  // ─────────────────────────────────────────────────────────────────────────

  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeRecord | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<FeeRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"cash" | "razorpay">("cash");
  const [payLoading, setPayLoading] = useState(false);

  const [form, setForm] = useState({
    studentName: "",
    regNumber: "",
    batch: "",
    department: "",
    feeType: "Tuition",
    amount: "",
    dueDate: "",
    semester: "",
    academicYear: "",
  });

  useEffect(() => {
    if (!user) return;
    fetchFees();
  }, [user]);

  const fetchFees = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "fees"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FeeRecord));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setFees(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load fees");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFee = async () => {
    if (!form.studentName || !form.regNumber || !form.amount || !form.dueDate) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const feeData = {
        studentId: "",
        studentName: form.studentName,
        regNumber: form.regNumber,
        batch: form.batch,
        department: form.department,
        feeType: form.feeType,
        amount: parseFloat(form.amount),
        dueDate: form.dueDate,
        status: "pending" as const,
        paidAmount: 0,
        semester: form.semester,
        academicYear: form.academicYear,
        createdAt: serverTimestamp(),
      };

      if (editingFee) {
        await updateDoc(doc(db, "fees", editingFee.id), feeData);
        toast.success("Fee record updated");
      } else {
        await addDoc(collection(db, "fees"), feeData);
        toast.success("Fee record added");
      }
      closeModal();
      fetchFees();
    } catch (e) {
      console.error(e);
      toast.error("Operation failed");
    }
  };

  const handleRecordPayment = async () => {
    if (!showPaymentModal || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setPayLoading(true);
    try {
      const newPaidAmount = (showPaymentModal.paidAmount || 0) + amount;
      const isFullyPaid = newPaidAmount >= showPaymentModal.amount;
      await updateDoc(doc(db, "fees", showPaymentModal.id), {
        paidAmount: newPaidAmount,
        status: isFullyPaid ? "paid" : "partial",
        paidDate: new Date().toISOString().split("T")[0],
      });
      await addDoc(collection(db, "payment_history"), {
        feeId: showPaymentModal.id,
        studentName: showPaymentModal.studentName,
        regNumber: showPaymentModal.regNumber,
        feeType: showPaymentModal.feeType,
        amount,
        paymentDate: new Date().toISOString().split("T")[0],
        paymentMode: "cash",
        transactionId: generateTxnId(),
        createdAt: serverTimestamp(),
      });
      toast.success(`Payment of ${formatCurrency(amount)} recorded`);
      setShowPaymentModal(null); setPaymentAmount("");
      fetchFees();
    } catch (e) { console.error(e); toast.error("Payment recording failed"); }
    finally { setPayLoading(false); }
  };

  const handleRazorpayPayment = async () => {
    if (!showPaymentModal || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setPayLoading(true);
    try {
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, feeId: showPaymentModal.id, studentId: showPaymentModal.studentId }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error);
      if (typeof window.Razorpay === "undefined") {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = () => resolve(); s.onerror = () => reject(new Error("SDK failed"));
          document.body.appendChild(s);
        });
      }
      const fee = showPaymentModal;
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount, currency: order.currency,
        name: "EduMate", description: `${fee.feeType} Fee`,
        order_id: order.orderId,
        prefill: { name: fee.studentName },
        handler: async (response: any) => {
          try {
            const vRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...response, feeId: fee.id }),
            });
            const vData = await vRes.json();
            if (!vRes.ok || !vData.verified) throw new Error("Verification failed");
            const newPaid = (fee.paidAmount || 0) + amount;
            const isFullyPaid = newPaid >= fee.amount;
            await updateDoc(doc(db, "fees", fee.id), {
              paidAmount: newPaid, status: isFullyPaid ? "paid" : "partial",
              paidDate: new Date().toISOString().split("T")[0],
              razorpayPaymentId: response.razorpay_payment_id,
            });
            await addDoc(collection(db, "payment_history"), {
              feeId: fee.id, studentName: fee.studentName, regNumber: fee.regNumber,
              feeType: fee.feeType, amount,
              paymentDate: new Date().toISOString().split("T")[0],
              paymentMode: "razorpay", razorpayPaymentId: response.razorpay_payment_id,
              transactionId: response.razorpay_payment_id, // Razorpay ID doubles as txn ID
              createdAt: serverTimestamp(),
            });
            toast.success("✅ Razorpay payment verified!");
            setShowPaymentModal(null); setPaymentAmount("");
            fetchFees();
          } catch (e: any) { toast.error(e.message || "Verification failed"); }
        },
        modal: { ondismiss: () => setPayLoading(false) },
        theme: { color: "#2563EB" },
      };
      const rzp = new window.Razorpay(options); rzp.open();
    } catch (e: any) { toast.error(e.message || "Payment failed"); setPayLoading(false); }
  };

  const handleDelete = async (fee: FeeRecord) => {
    if (!confirm("Delete this fee record? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "fees", fee.id));
      toast.success("Fee record deleted");
      fetchFees();
    } catch (e) {
      console.error(e);
      toast.error("Delete failed");
    }
  };

  const openEdit = (fee: FeeRecord) => {
    setEditingFee(fee);
    setForm({
      studentName: fee.studentName,
      regNumber: fee.regNumber,
      batch: fee.batch,
      department: fee.department,
      feeType: fee.feeType,
      amount: fee.amount.toString(),
      dueDate: fee.dueDate,
      semester: fee.semester,
      academicYear: fee.academicYear,
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingFee(null);
    setForm({
      studentName: "",
      regNumber: "",
      batch: "",
      department: "",
      feeType: "Tuition",
      amount: "",
      dueDate: "",
      semester: "",
      academicYear: "",
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-emerald-50 text-emerald-700";
      case "pending":
        return "bg-amber-50 text-amber-700";
      case "overdue":
        return "bg-red-50 text-red-700";
      case "partial":
        return "bg-blue-50 text-blue-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <MdCheckCircle className="text-xs" />;
      case "overdue":
        return <MdWarning className="text-xs" />;
      default:
        return <MdAccessTime className="text-xs" />;
    }
  };

  const filtered = fees.filter((f) => {
    const matchSearch =
      f.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.regNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "All" || f.status === filterStatus.toLowerCase();
    const matchType = filterType === "All" || f.feeType === filterType;
    return matchSearch && matchStatus && matchType;
  });

  // Stats
  const totalAmount = fees.reduce((s, f) => s + f.amount, 0);
  const totalCollected = fees.reduce((s, f) => s + (f.paidAmount || 0), 0);
  const pendingCount = fees.filter((f) => f.status === "pending" || f.status === "overdue").length;

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MdReceiptLong className="text-blue-600 text-3xl" />
            Student Fees
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage fee records, payments, and outstanding dues
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition text-sm"
        >
          <MdAdd className="text-xl" />
          Add Fee Record
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Records</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fees.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Amount</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Collected</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(totalCollected)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
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
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
          <option value="Partial">Partial</option>
          <option value="Overdue">Overdue</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">All Types</option>
          {FEE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Table */}
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
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">Student</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">Paid</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">Due Date</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((fee) => (
                  <tr key={fee.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{fee.studentName}</p>
                      <p className="text-xs text-gray-500">{fee.regNumber}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full">
                        {fee.feeType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">
                      {formatCurrency(fee.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {formatCurrency(fee.paidAmount || 0)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{fee.dueDate}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${getStatusStyle(fee.status)}`}>
                        {getStatusIcon(fee.status)}
                        {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {fee.status !== "paid" && (
                          <button
                            onClick={() => setShowPaymentModal(fee)}
                            className="px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition"
                          >
                            Record Payment
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(fee)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <MdEdit className="text-base" />
                        </button>
                        <button
                          onClick={() => handleDelete(fee)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <MdDelete className="text-base" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {filtered.map((fee) => (
              <div key={fee.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{fee.studentName}</p>
                    <p className="text-xs text-gray-500">{fee.regNumber} · {fee.feeType}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${getStatusStyle(fee.status)}`}>
                    {getStatusIcon(fee.status)}
                    {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Due: {fee.dueDate}</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(fee.amount)}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  {fee.status !== "paid" && (
                    <button
                      onClick={() => setShowPaymentModal(fee)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg"
                    >
                      Record Payment
                    </button>
                  )}
                  <button onClick={() => openEdit(fee)} className="px-3 py-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg">Edit</button>
                  <button onClick={() => handleDelete(fee)} className="px-3 py-1.5 text-xs text-red-600 bg-red-50 rounded-lg">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <MdReceiptLong className="text-3xl text-gray-300" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No fee records found</h3>
          <p className="text-gray-500 text-sm mt-1">
            {searchTerm || filterStatus !== "All" || filterType !== "All"
              ? "Try adjusting your filters"
              : "Add your first fee record to get started"}
          </p>
        </div>
      )}

      {/* Add/Edit Fee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">
                {editingFee ? "Edit Fee Record" : "Add Fee Record"}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <MdClose className="text-xl text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.studentName}
                    onChange={(e) => setForm((p) => ({ ...p, studentName: e.target.value }))}
                    placeholder="Full name"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reg Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.regNumber}
                    onChange={(e) => setForm((p) => ({ ...p, regNumber: e.target.value }))}
                    placeholder="e.g. REG2024001"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                  <input
                    type="text"
                    value={form.batch}
                    onChange={(e) => setForm((p) => ({ ...p, batch: e.target.value }))}
                    placeholder="e.g. CSE 2024"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                    placeholder="e.g. CSE"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fee Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.feeType}
                    onChange={(e) => setForm((p) => ({ ...p, feeType: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {FEE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    placeholder="e.g. 50000"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                  <input
                    type="text"
                    value={form.semester}
                    onChange={(e) => setForm((p) => ({ ...p, semester: e.target.value }))}
                    placeholder="e.g. Sem 4"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={form.academicYear}
                    onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))}
                    placeholder="e.g. 2025-26"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFee}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
              >
                {editingFee ? "Update" : "Add Fee Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
              <button
                onClick={() => { setShowPaymentModal(null); setPaymentAmount(""); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <MdClose className="text-xl text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Student</span>
                  <span className="font-medium text-gray-900">{showPaymentModal.studentName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Fee Type</span>
                  <span className="font-medium text-gray-900">{showPaymentModal.feeType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Amount</span>
                  <span className="font-medium text-gray-900">{formatCurrency(showPaymentModal.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Already Paid</span>
                  <span className="font-medium text-emerald-600">{formatCurrency(showPaymentModal.paidAmount || 0)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                  <span className="text-gray-500 font-medium">Balance</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(showPaymentModal.amount - (showPaymentModal.paidAmount || 0))}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
                <div className="flex gap-2">
                  <button onClick={() => setPaymentMode("cash")}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition ${paymentMode === "cash" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                    💵 Cash
                  </button>
                  <button onClick={() => setPaymentMode("razorpay")}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition ${paymentMode === "razorpay" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                    💳 Razorpay
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={() => { setShowPaymentModal(null); setPaymentAmount(""); }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={paymentMode === "razorpay" ? handleRazorpayPayment : handleRecordPayment}
                disabled={payLoading}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {payLoading ? "Processing..." : paymentMode === "razorpay" ? "Pay via Razorpay" : "Record Cash Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
