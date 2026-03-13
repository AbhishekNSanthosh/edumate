"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import {
  MdGroups,
  MdSearch,
  MdAdd,
  MdClose,
  MdExpandMore,
  MdExpandLess,
  MdDownload,
  MdPayment,
  MdCheckCircle,
  MdAccessTime,
  MdWarning,
  MdReceipt,
  MdDiscount,
  MdSchool,
} from "react-icons/md";

interface Student {
  id: string;
  name: string;
  regNumber: string;
  email: string;
  department: string;
  batch: string;
  phone?: string;
}

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
  semester: string;
  academicYear: string;
  createdAt: any;
  discountAmount?: number;
  scholarshipAmount?: number;
  netAmount?: number;
  razorpayPaymentId?: string;
}

// Only main/mandatory fee types — Hostel & Transport are optional per-student (managed via student_services)
const FEE_TYPES = ["Tuition", "Lab", "Exam", "Library", "Sports", "Other"];
const STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  overdue: "bg-red-50 text-red-700",
  partial: "bg-blue-50 text-blue-700",
};

declare global {
  interface Window { Razorpay: any; }
}

export default function BatchFeesPage() {
  const { user } = useAuth();

  // ─── Unique Transaction ID ────────────────────────────────────────────────
  const generateTxnId = () => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, "");
    const time = now.toTimeString().slice(0, 8).replace(/:/g, "");
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TXN-${date}-${time}-${rand}`;
  };
  // ─────────────────────────────────────────────────────────────────────────

  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  // Batch fee assignment modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [batchForm, setBatchForm] = useState({
    feeType: "Tuition",
    amount: "",
    dueDate: "",
    semester: "",
    academicYear: "",
  });
  const [assigning, setAssigning] = useState(false);

  // Individual override modal
  const [overrideFor, setOverrideFor] = useState<{
    fee: FeeRecord; student: Student;
  } | null>(null);
  const [overrideForm, setOverrideForm] = useState({
    discountAmount: "",
    scholarshipAmount: "",
    reason: "",
  });

  // Payment modal
  const [paymentFee, setPaymentFee] = useState<FeeRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"cash" | "razorpay">("cash");
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [studSnap, feesSnap] = await Promise.all([
        getDocs(collection(db, "students")),
        getDocs(collection(db, "fees")),
      ]);
      setStudents(studSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
      setFees(feesSnap.docs.map(d => ({ id: d.id, ...d.data() } as FeeRecord)));
    } catch (e) { console.error(e); toast.error("Failed to load data"); }
    finally { setLoading(false); }
  };

  // Group students by batch
  const batches: Record<string, Student[]> = {};
  students.forEach(s => {
    const b = s.batch || "Unassigned";
    if (!batches[b]) batches[b] = [];
    batches[b].push(s);
  });

  const batchNames = Object.keys(batches).sort();

  const filteredBatches = searchTerm
    ? batchNames.filter(b =>
        b.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batches[b].some(s =>
          s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.regNumber?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : batchNames;

  const getStudentFees = (studentId: string) =>
    fees.filter(f => f.studentId === studentId);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  // Assign batch‑wide fees
  const handleAssignBatchFee = async () => {
    if (!batchForm.amount || !batchForm.dueDate) {
      toast.error("Amount and due date are required");
      return;
    }
    const batchStudents = batches[selectedBatch] || [];
    if (batchStudents.length === 0) { toast.error("No students in this batch"); return; }

    setAssigning(true);
    try {
      const newFees: FeeRecord[] = [];
      for (const s of batchStudents) {
        const amount = parseFloat(batchForm.amount);
        const feeData = {
          studentId: s.id,
          studentName: s.name,
          regNumber: s.regNumber || "",
          batch: s.batch,
          department: s.department || "",
          feeType: batchForm.feeType,
          amount,
          netAmount: amount,
          dueDate: batchForm.dueDate,
          status: "pending" as const,
          paidAmount: 0,
          semester: batchForm.semester,
          academicYear: batchForm.academicYear,
          discountAmount: 0,
          scholarshipAmount: 0,
          createdAt: serverTimestamp(),
        };
        const ref = await addDoc(collection(db, "fees"), feeData);
        newFees.push({ id: ref.id, ...feeData, createdAt: new Date() });
      }
      setFees(prev => [...prev, ...newFees]);
      toast.success(`Fee assigned to ${batchStudents.length} students in ${selectedBatch}`);
      setShowBatchModal(false);
      setBatchForm({ feeType: "Tuition", amount: "", dueDate: "", semester: "", academicYear: "" });
    } catch (e) {
      console.error(e);
      toast.error("Failed to assign fees");
    } finally { setAssigning(false); }
  };

  // Apply individual discount/scholarship override
  const handleApplyOverride = async () => {
    if (!overrideFor) return;
    const { fee } = overrideFor;
    const discount = parseFloat(overrideForm.discountAmount) || 0;
    const scholarship = parseFloat(overrideForm.scholarshipAmount) || 0;
    const net = Math.max(0, fee.amount - discount - scholarship);
    try {
      await updateDoc(doc(db, "fees", fee.id), {
        discountAmount: discount,
        scholarshipAmount: scholarship,
        netAmount: net,
        overrideReason: overrideForm.reason,
      });
      setFees(prev => prev.map(f => f.id === fee.id
        ? { ...f, discountAmount: discount, scholarshipAmount: scholarship, netAmount: net }
        : f
      ));
      toast.success("Override applied");
      setOverrideFor(null);
    } catch (e) { toast.error("Failed to apply override"); }
  };

  // Cash payment
  const handleCashPayment = async () => {
    if (!paymentFee) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setPayLoading(true);
    try {
      const newPaid = (paymentFee.paidAmount || 0) + amount;
      const netAmt = paymentFee.netAmount ?? paymentFee.amount;
      const status = newPaid >= netAmt ? "paid" : "partial";
      await updateDoc(doc(db, "fees", paymentFee.id), {
        paidAmount: newPaid, status, paidDate: new Date().toISOString().split("T")[0],
      });
      await addDoc(collection(db, "payment_history"), {
        feeId: paymentFee.id,
        studentName: paymentFee.studentName,
        regNumber: paymentFee.regNumber,
        feeType: paymentFee.feeType,
        amount,
        paymentDate: new Date().toISOString().split("T")[0],
        paymentMode: "cash",
        transactionId: generateTxnId(),
        createdAt: serverTimestamp(),
      });
      setFees(prev => prev.map(f => f.id === paymentFee!.id ? { ...f, paidAmount: newPaid, status } : f));
      toast.success(`Payment of ${formatCurrency(amount)} recorded`);
      setPaymentFee(null);
      setPaymentAmount("");
    } catch (e) { toast.error("Payment failed"); }
    finally { setPayLoading(false); }
  };

  // Razorpay payment
  const handleRazorpayPayment = async () => {
    if (!paymentFee) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setPayLoading(true);
    try {
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, feeId: paymentFee.id, studentId: paymentFee.studentId }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "EduMate",
        description: `${paymentFee.feeType} Fee`,
        order_id: order.orderId,
        prefill: { name: paymentFee.studentName },
        handler: async (response: any) => {
          try {
            const verRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...response, feeId: paymentFee.id }),
            });
            const verData = await verRes.json();
            if (!verRes.ok || !verData.verified) throw new Error("Verification failed");
            const newPaid = (paymentFee.paidAmount || 0) + amount;
            const netAmt = paymentFee.netAmount ?? paymentFee.amount;
            const status = newPaid >= netAmt ? "paid" : "partial";
            await updateDoc(doc(db, "fees", paymentFee.id), {
              paidAmount: newPaid, status,
              paidDate: new Date().toISOString().split("T")[0],
              razorpayPaymentId: response.razorpay_payment_id,
            });
            await addDoc(collection(db, "payment_history"), {
              feeId: paymentFee.id,
              studentName: paymentFee.studentName,
              regNumber: paymentFee.regNumber,
              feeType: paymentFee.feeType,
              amount,
              paymentDate: new Date().toISOString().split("T")[0],
              paymentMode: "razorpay",
              razorpayPaymentId: response.razorpay_payment_id,
              transactionId: response.razorpay_payment_id,
              createdAt: serverTimestamp(),
            });
            setFees(prev => prev.map(f => f.id === paymentFee!.id ? { ...f, paidAmount: newPaid, status } : f));
            toast.success("✅ Payment verified and recorded!");
            setPaymentFee(null);
            setPaymentAmount("");
          } catch (e: any) { toast.error(e.message || "Verification failed"); }
        },
        modal: { ondismiss: () => setPayLoading(false) },
        theme: { color: "#2563EB" },
      };

      if (typeof window.Razorpay === "undefined") {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Razorpay SDK failed to load"));
          document.body.appendChild(script);
        });
      }
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e: any) {
      toast.error(e.message || "Payment initiation failed");
      setPayLoading(false);
    }
  };

  // Download individual receipt as printable HTML
  const downloadReceipt = (fee: FeeRecord, student: Student) => {
    const net = fee.netAmount ?? fee.amount;
    const balance = net - (fee.paidAmount || 0);
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Fee Receipt – ${student.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; color: #1a1a1a; padding: 40px; }
  .header { text-align: center; border-bottom: 2px solid #2563EB; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { color: #2563EB; font-size: 28px; }
  .header p { color: #555; font-size: 13px; margin-top: 4px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;
    background: ${fee.status === 'paid' ? '#d1fae5' : fee.status === 'partial' ? '#dbeafe' : '#fef3c7'};
    color: ${fee.status === 'paid' ? '#065f46' : fee.status === 'partial' ? '#1e40af' : '#92400e'}; }
  .section { margin-bottom: 20px; }
  .section h3 { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.05em; margin-bottom: 10px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .field label { font-size: 11px; color: #888; display: block; margin-bottom: 2px; }
  .field span { font-size: 14px; font-weight: 600; color: #111; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; color: #888; padding: 8px 10px; background: #f9fafb; border: 1px solid #e5e7eb; }
  td { padding: 10px; border: 1px solid #e5e7eb; font-size: 14px; }
  .total-row td { font-weight: 700; background: #f0f7ff; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #e5e7eb; padding-top: 16px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <h1>🎓 EduMate</h1>
  <p>Fee Receipt — ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
</div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
  <div>
    <p style="font-size:12px;color:#888;">Receipt No.</p>
    <p style="font-size:16px;font-weight:700;color:#2563EB;">#${fee.id.slice(-8).toUpperCase()}</p>
  </div>
  <span class="badge">${fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}</span>
</div>
<div class="section">
  <h3>Student Information</h3>
  <div class="grid2">
    <div class="field"><label>Name</label><span>${student.name}</span></div>
    <div class="field"><label>Reg Number</label><span>${student.regNumber}</span></div>
    <div class="field"><label>Department</label><span>${student.department}</span></div>
    <div class="field"><label>Batch</label><span>${student.batch}</span></div>
  </div>
</div>
<div class="section">
  <h3>Fee Details</h3>
  <table>
    <tr>
      <th>Description</th><th>Fee Type</th><th>Semester</th><th>Due Date</th>
    </tr>
    <tr>
      <td>${fee.feeType} Fee</td><td>${fee.feeType}</td>
      <td>${fee.semester || "—"}</td><td>${fee.dueDate}</td>
    </tr>
  </table>
</div>
<div class="section">
  <h3>Payment Summary</h3>
  <table>
    <tr><th>Item</th><th style="text-align:right;">Amount</th></tr>
    <tr><td>Gross Fee Amount</td><td style="text-align:right;">₹${fee.amount.toLocaleString("en-IN")}</td></tr>
    ${(fee.discountAmount || 0) > 0 ? `<tr><td>Discount Applied</td><td style="text-align:right;color:#dc2626;">− ₹${(fee.discountAmount || 0).toLocaleString("en-IN")}</td></tr>` : ""}
    ${(fee.scholarshipAmount || 0) > 0 ? `<tr><td>Scholarship Applied</td><td style="text-align:right;color:#7c3aed;">− ₹${(fee.scholarshipAmount || 0).toLocaleString("en-IN")}</td></tr>` : ""}
    <tr class="total-row"><td>Net Payable Amount</td><td style="text-align:right;">₹${net.toLocaleString("en-IN")}</td></tr>
    <tr><td>Amount Paid</td><td style="text-align:right;color:#059669;">₹${(fee.paidAmount || 0).toLocaleString("en-IN")}</td></tr>
    <tr class="total-row"><td>Balance Due</td><td style="text-align:right;color:${balance > 0 ? "#dc2626" : "#059669"};">₹${balance.toLocaleString("en-IN")}</td></tr>
  </table>
</div>
${fee.razorpayPaymentId ? `<p style="font-size:12px;color:#888;margin-top:8px;">Razorpay Payment ID: ${fee.razorpayPaymentId}</p>` : ""}
<div class="footer">
  <p>This is a computer-generated receipt. No signature required.</p>
  <p>EduMate Learning Management System • Generated on ${new Date().toLocaleString("en-IN")}</p>
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) {
      w.onload = () => { w.print(); };
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 min-h-screen bg-gray-50">
        <div className="h-8 w-56 bg-gray-200 rounded mb-2 animate-pulse" />
        <div className="h-4 w-80 bg-gray-100 rounded mb-8 animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 mb-4 animate-pulse">
            <div className="h-5 bg-gray-100 rounded w-1/3 mb-3" />
            <div className="h-3 bg-gray-50 rounded w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MdGroups className="text-blue-600 text-3xl" />
            Batch Fee Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Assign fees per batch, apply individual discounts/scholarships, collect payments
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Students</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{students.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Batches</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{batchNames.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Fees Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {fees.filter(f => f.status === "pending" || f.status === "overdue").length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Collected</p>
          <p className="text-lg font-bold text-emerald-600 mt-1">
            {formatCurrency(fees.reduce((s, f) => s + (f.paidAmount || 0), 0))}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
          <input
            type="text"
            placeholder="Search by batch, student name, or reg number..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Batch List */}
      <div className="space-y-4">
        {filteredBatches.map(batchName => {
          const batchStudents = batches[batchName];
          const isExpanded = expandedBatch === batchName;
          const batchFees = batchStudents.flatMap(s => getStudentFees(s.id));
          const totalBatchFees = batchFees.reduce((s, f) => s + (f.netAmount ?? f.amount), 0);
          const totalCollected = batchFees.reduce((s, f) => s + (f.paidAmount || 0), 0);
          const pendingCount = batchFees.filter(f => f.status !== "paid").length;

          return (
            <div key={batchName} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Batch Header */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => setExpandedBatch(isExpanded ? null : batchName)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <MdGroups className="text-blue-600 text-xl" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{batchName}</h3>
                    <p className="text-xs text-gray-500">{batchStudents.length} students</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="hidden md:flex gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Total Fees</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(totalBatchFees)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Collected</p>
                      <p className="font-semibold text-emerald-600">{formatCurrency(totalCollected)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Pending</p>
                      <p className="font-semibold text-amber-600">{pendingCount}</p>
                    </div>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedBatch(batchName);
                      setShowBatchModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                  >
                    <MdAdd className="text-sm" /> Assign Fee
                  </button>
                  {isExpanded ? <MdExpandLess className="text-gray-400 text-xl flex-shrink-0" /> : <MdExpandMore className="text-gray-400 text-xl flex-shrink-0" />}
                </div>
              </div>

              {/* Students Table */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  {batchStudents.map(student => {
                    const stuFees = getStudentFees(student.id);
                    return (
                      <div key={student.id} className="border-b border-gray-50 last:border-b-0">
                        {/* Student row */}
                        <div className="flex items-center gap-4 px-5 py-3 bg-gray-50/30">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                            {student.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{student.name}</p>
                            <p className="text-xs text-gray-500">{student.regNumber}</p>
                          </div>
                          <p className="text-xs text-gray-500 hidden sm:block">{student.department}</p>
                        </div>

                        {/* Fee rows for this student */}
                        {stuFees.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-white">
                                  <th className="text-left text-xs text-gray-400 font-medium px-5 py-2">Type</th>
                                  <th className="text-left text-xs text-gray-400 font-medium px-5 py-2">Gross</th>
                                  <th className="text-left text-xs text-gray-400 font-medium px-5 py-2">Discount/Scholar</th>
                                  <th className="text-left text-xs text-gray-400 font-medium px-5 py-2">Net</th>
                                  <th className="text-left text-xs text-gray-400 font-medium px-5 py-2">Paid</th>
                                  <th className="text-left text-xs text-gray-400 font-medium px-5 py-2">Due</th>
                                  <th className="text-left text-xs text-gray-400 font-medium px-5 py-2">Status</th>
                                  <th className="text-right text-xs text-gray-400 font-medium px-5 py-2">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stuFees.map(fee => {
                                  const net = fee.netAmount ?? fee.amount;
                                  const discSch = (fee.discountAmount || 0) + (fee.scholarshipAmount || 0);
                                  return (
                                    <tr key={fee.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                                      <td className="px-5 py-2.5">
                                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{fee.feeType}</span>
                                      </td>
                                      <td className="px-5 py-2.5 text-gray-700">{formatCurrency(fee.amount)}</td>
                                      <td className="px-5 py-2.5 text-purple-600 text-xs">
                                        {discSch > 0 ? `−${formatCurrency(discSch)}` : "—"}
                                      </td>
                                      <td className="px-5 py-2.5 font-semibold text-gray-900">{formatCurrency(net)}</td>
                                      <td className="px-5 py-2.5 text-emerald-600">{formatCurrency(fee.paidAmount || 0)}</td>
                                      <td className="px-5 py-2.5 text-gray-500 text-xs">{fee.dueDate}</td>
                                      <td className="px-5 py-2.5">
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[fee.status]}`}>
                                          {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
                                        </span>
                                      </td>
                                      <td className="px-5 py-2.5">
                                        <div className="flex items-center justify-end gap-1.5">
                                          {/* Override discount/scholarship */}
                                          <button
                                            onClick={() => {
                                              setOverrideFor({ fee, student });
                                              setOverrideForm({
                                                discountAmount: (fee.discountAmount || 0).toString(),
                                                scholarshipAmount: (fee.scholarshipAmount || 0).toString(),
                                                reason: "",
                                              });
                                            }}
                                            title="Apply Discount / Scholarship"
                                            className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition"
                                          >
                                            <MdDiscount className="text-base" />
                                          </button>
                                          {/* Record Payment */}
                                          {fee.status !== "paid" && (
                                            <button
                                              onClick={() => { setPaymentFee(fee); setPaymentAmount(""); setPaymentMode("cash"); }}
                                              title="Record Payment"
                                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                            >
                                              <MdPayment className="text-base" />
                                            </button>
                                          )}
                                          {/* Receipt */}
                                          <button
                                            onClick={() => downloadReceipt(fee, student)}
                                            title="Download Receipt"
                                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                                          >
                                            <MdReceipt className="text-base" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="px-5 py-3 text-xs text-gray-400 italic">No fees assigned yet</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {filteredBatches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-100">
            <MdGroups className="text-5xl text-gray-200 mb-4" />
            <p className="text-gray-500 text-sm">No batches found</p>
          </div>
        )}
      </div>

      {/* ── Assign Batch Fee Modal ── */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Assign Fee to Batch</h2>
                <p className="text-xs text-gray-500 mt-0.5">{selectedBatch} · {batches[selectedBatch]?.length || 0} students</p>
              </div>
              <button onClick={() => setShowBatchModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <MdClose className="text-xl text-gray-500" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fee Type</label>
                <select value={batchForm.feeType} onChange={e => setBatchForm(p => ({ ...p, feeType: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  {FEE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input type="number" value={batchForm.amount} onChange={e => setBatchForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="e.g. 50000"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                <input type="date" value={batchForm.dueDate} onChange={e => setBatchForm(p => ({ ...p, dueDate: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                <input type="text" value={batchForm.semester} onChange={e => setBatchForm(p => ({ ...p, semester: e.target.value }))}
                  placeholder="e.g. Sem 4"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                <input type="text" value={batchForm.academicYear} onChange={e => setBatchForm(p => ({ ...p, academicYear: e.target.value }))}
                  placeholder="e.g. 2025-26"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="p-5 pt-0 flex gap-3">
              <button onClick={() => setShowBatchModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleAssignBatchFee} disabled={assigning}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {assigning ? "Assigning..." : `Assign to ${batches[selectedBatch]?.length || 0} Students`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Override Discount/Scholarship Modal ── */}
      {overrideFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Apply Discount / Scholarship</h2>
                <p className="text-xs text-gray-500 mt-0.5">{overrideFor.student.name} · {overrideFor.fee.feeType}</p>
              </div>
              <button onClick={() => setOverrideFor(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <MdClose className="text-xl text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3 flex justify-between text-sm">
                <span className="text-gray-500">Gross Amount</span>
                <span className="font-semibold">{formatCurrency(overrideFor.fee.amount)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount (₹)</label>
                <input type="number" value={overrideForm.discountAmount}
                  onChange={e => setOverrideForm(p => ({ ...p, discountAmount: e.target.value }))}
                  placeholder="0"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scholarship Amount (₹)</label>
                <input type="number" value={overrideForm.scholarshipAmount}
                  onChange={e => setOverrideForm(p => ({ ...p, scholarshipAmount: e.target.value }))}
                  placeholder="0"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="bg-blue-50 rounded-xl p-3 flex justify-between text-sm">
                <span className="text-gray-600 font-medium">Net Payable</span>
                <span className="font-bold text-blue-700">
                  {formatCurrency(Math.max(0, overrideFor.fee.amount - (parseFloat(overrideForm.discountAmount) || 0) - (parseFloat(overrideForm.scholarshipAmount) || 0)))}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <textarea value={overrideForm.reason} onChange={e => setOverrideForm(p => ({ ...p, reason: e.target.value }))}
                  rows={2} placeholder="Merit, need-based, etc."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="p-5 pt-0 flex gap-3">
              <button onClick={() => setOverrideFor(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleApplyOverride}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700">
                Apply Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Modal ── */}
      {paymentFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
              <button onClick={() => setPaymentFee(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <MdClose className="text-xl text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Student</span><span className="font-medium">{paymentFee.studentName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Fee Type</span><span className="font-medium">{paymentFee.feeType}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Net Amount</span><span className="font-medium">{formatCurrency(paymentFee.netAmount ?? paymentFee.amount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Already Paid</span><span className="font-medium text-emerald-600">{formatCurrency(paymentFee.paidAmount || 0)}</span></div>
                <div className="flex justify-between border-t border-gray-200 pt-2"><span className="font-medium">Balance</span><span className="font-bold">{formatCurrency((paymentFee.netAmount ?? paymentFee.amount) - (paymentFee.paidAmount || 0))}</span></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (₹) *</label>
                <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
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
              <button onClick={() => setPaymentFee(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={paymentMode === "razorpay" ? handleRazorpayPayment : handleCashPayment}
                disabled={payLoading}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                {payLoading ? "Processing..." : paymentMode === "razorpay" ? "Pay via Razorpay" : "Record Cash Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
