"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  MdReceiptLong,
  MdHome,
  MdDirectionsBus,
  MdCheckCircle,
  MdArrowForward,
  MdSchedule,
} from "react-icons/md";

// Unified fee shape — handles both old (item) and new (feeType) schemas
interface Fee {
  id: string;
  // Office-assigned fields
  feeType?: string;
  studentName?: string;
  regNumber?: string;
  batch?: string;
  department?: string;
  semester?: string;
  academicYear?: string;
  paidAmount?: number;
  // Old seeded fields
  item?: string;
  paidAt?: any;
  razorpayPaymentId?: string;
  // Common
  studentId: string;
  amount: number;
  dueDate: any;
  status: "paid" | "pending" | "overdue" | "partial";
  createdAt?: any;
}

// Fee types that belong to "main" (batch-assigned, mandatory)
const MAIN_FEE_TYPES = ["Tuition", "Lab", "Library", "Exam", "Sports", "Other"];
// Fee types that are optional per-student — handled via hostel-and-trans page
const OPTIONAL_FEE_TYPES = ["Hostel", "Transport"];

declare global { interface Window { Razorpay: any; } }

export default function FeesPage() {
  const { user } = useAuth();
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Parse dueDate regardless of format
  const toDate = (d: any): Date => {
    if (!d) return new Date();
    if (d.seconds) return new Date(d.seconds * 1000);
    if (typeof d === "string" || typeof d === "number") return new Date(d);
    if (d instanceof Date) return d;
    return new Date();
  };

  const fmtDate = (d: any) =>
    toDate(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  // Label for display (works with both old "item" and new "feeType" schema)
  const feeLabel = (f: Fee) =>
    f.feeType
      ? `${f.feeType} Fee${f.semester ? ` · ${f.semester}` : ""}${f.academicYear ? ` (${f.academicYear})` : ""}`
      : f.item || "Fee";

  // Effective amount a student owes (net after discount/scholarship if set)
  const netAmount = (f: Fee): number => (f as any).netAmount ?? f.amount;
  const paidAmount = (f: Fee): number => f.paidAmount ?? 0;
  const balanceAmount = (f: Fee): number => Math.max(0, netAmount(f) - paidAmount(f));

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch {} };
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "fees"), where("studentId", "==", user.uid)));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Fee));
        data.sort((a, b) => {
          const ms = (d: any) => d?.seconds ? d.seconds * 1000 : d ? new Date(d).getTime() : 0;
          return ms(b.dueDate) - ms(a.dueDate);
        });
        setFees(data);
      } catch {
        toast.error("Failed to load fee details.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Separate main fees from optional (hostel/transport)
  const isOptional = (f: Fee) => {
    const type = (f.feeType || f.item || "").toLowerCase();
    return type === "hostel" || type === "transport";
  };
  const mainFees = fees.filter((f) => !isOptional(f));
  const optionalFees = fees.filter(isOptional); // these may still exist if legacy data

  const totalOutstanding = mainFees
    .filter((f) => f.status !== "paid")
    .reduce((s, f) => s + balanceAmount(f), 0);

  const nextDue = mainFees
    .filter((f) => f.status === "pending" || f.status === "overdue")
    .map((f) => ({ ...f, _d: toDate(f.dueDate) }))
    .sort((a, b) => a._d.getTime() - b._d.getTime())[0]?._d;

  const handlePay = async (fee: Fee) => {
    if (processingId || !user) return;
    setProcessingId(fee.id);
    const amount = balanceAmount(fee);
    try {
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, feeId: fee.id, studentId: user.uid }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Order creation failed"); }
      const { orderId, amount: rzpAmt, currency } = await res.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: rzpAmt, currency,
        name: "EduMate",
        description: feeLabel(fee),
        order_id: orderId,
        prefill: { email: user.email || "" },
        handler: async (response: any) => {
          try {
            const vRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...response, feeId: fee.id }),
            });
            if (!vRes.ok) throw new Error("Verification failed");
            const newPaid = paidAmount(fee) + amount;
            const isFullyPaid = newPaid >= netAmount(fee);
            await updateDoc(doc(db, "fees", fee.id), {
              paidAmount: newPaid,
              status: isFullyPaid ? "paid" : "partial",
              paidAt: new Date(),
              razorpayPaymentId: response.razorpay_payment_id,
            });
            setFees((prev) =>
              prev.map((f) =>
                f.id === fee.id
                  ? { ...f, paidAmount: newPaid, status: isFullyPaid ? "paid" : "partial", paidAt: new Date() }
                  : f
              )
            );
            toast.success("Payment successful!");
          } catch (e: any) { toast.error(e.message || "Verification failed"); }
          finally { setProcessingId(null); }
        },
        modal: { ondismiss: () => { setProcessingId(null); toast.error("Payment cancelled."); } },
        theme: { color: "#2563EB" },
      };
      if (typeof window.Razorpay === "undefined") throw new Error("Razorpay SDK not loaded.");
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (r: any) => {
        toast.error(`Payment failed: ${r.error.description || "Unknown"}`);
        setProcessingId(null);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate payment.");
      setProcessingId(null);
    }
  };

  const statusBadge = (status: string) => {
    const cls =
      status === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
      status === "overdue" ? "bg-red-50 text-red-700 border-red-100" :
      status === "partial" ? "bg-blue-50 text-blue-700 border-blue-100" :
      "bg-amber-50 text-amber-700 border-amber-100";
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen animate-pulse">
        <div className="h-7 w-36 bg-gray-200 rounded mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-white rounded-xl border border-gray-200" />)}
        </div>
        <div className="h-72 bg-white rounded-xl border border-gray-200" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Fees</h1>
        <p className="text-gray-500 text-sm mt-1">Track your financial status and payment history.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Outstanding */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Main Fees Outstanding</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{fmtCurrency(totalOutstanding)}</p>
          <div className="mt-3 w-full bg-gray-100 rounded-full h-1">
            <div className="bg-red-400 h-1 rounded-full" style={{ width: totalOutstanding > 0 ? "60%" : "0%" }} />
          </div>
        </div>

        {/* Next due */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Next Due Date</p>
          <p className="text-xl font-bold text-gray-900 mt-2">
            {nextDue
              ? nextDue.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
              : "No pending dues"}
          </p>
          {nextDue && (
            <p className="text-xs text-red-500 font-medium mt-2 flex items-center gap-1">
              <MdSchedule /> Action required
            </p>
          )}
        </div>

        {/* Hostel/Transport shortcut */}
        <Link
          href="/student/hostel-and-trans"
          className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col justify-between hover:border-blue-300 hover:bg-blue-50/30 transition group"
        >
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Optional Services</p>
            <div className="flex items-center gap-2 mt-3">
              <MdHome className="text-blue-500 text-lg" />
              <span className="text-sm font-medium text-gray-700">Hostel</span>
              <span className="text-gray-300">·</span>
              <MdDirectionsBus className="text-amber-500 text-lg" />
              <span className="text-sm font-medium text-gray-700">Transport</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Separate optional fees</p>
          </div>
          <div className="mt-3 text-blue-600 text-xs font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
            View details <MdArrowForward />
          </div>
        </Link>
      </div>

      {/* Main Fee Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <MdReceiptLong className="text-blue-600 text-xl" />
          <h2 className="font-semibold text-gray-900">Main Fees Breakdown</h2>
          <span className="text-xs text-gray-400 ml-1">(Tuition, Lab, Library, Exam & more)</span>
        </div>

        {mainFees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3">Fee Description</th>
                  <th className="px-5 py-3">Due Date</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Paid</th>
                  <th className="px-5 py-3">Balance</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {mainFees.map((fee) => {
                  const net = netAmount(fee);
                  const paid = paidAmount(fee);
                  const balance = balanceAmount(fee);
                  const isDue = fee.status !== "paid";
                  return (
                    <tr key={fee.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        {feeLabel(fee)}
                        {(fee as any).discountAmount > 0 || (fee as any).scholarshipAmount > 0 ? (
                          <span className="ml-2 text-xs text-purple-600 font-normal">
                            (discount applied)
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{fmtDate(fee.dueDate)}</td>
                      <td className="px-5 py-3.5 text-gray-700">{fmtCurrency(net)}</td>
                      <td className="px-5 py-3.5 text-emerald-600 font-medium">{fmtCurrency(paid)}</td>
                      <td className="px-5 py-3.5 font-semibold text-gray-900">{fmtCurrency(balance)}</td>
                      <td className="px-5 py-3.5">{statusBadge(fee.status)}</td>
                      <td className="px-5 py-3.5 text-right">
                        {isDue && balance > 0 ? (
                          <button
                            onClick={() => handlePay(fee)}
                            disabled={!!processingId}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-60"
                          >
                            {processingId === fee.id ? "Processing..." : `Pay ${fmtCurrency(balance)}`}
                          </button>
                        ) : fee.status === "paid" ? (
                          <span className="text-emerald-600 text-xs flex items-center justify-end gap-1">
                            <MdCheckCircle /> Paid
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Summary row */}
              {mainFees.length > 1 && (
                <tfoot className="bg-gray-50 text-sm font-semibold text-gray-700 border-t border-gray-200">
                  <tr>
                    <td className="px-5 py-3" colSpan={2}>Total</td>
                    <td className="px-5 py-3">{fmtCurrency(mainFees.reduce((s, f) => s + netAmount(f), 0))}</td>
                    <td className="px-5 py-3 text-emerald-600">{fmtCurrency(mainFees.reduce((s, f) => s + paidAmount(f), 0))}</td>
                    <td className="px-5 py-3 text-red-600">{fmtCurrency(totalOutstanding)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-400 text-sm">
            No main fee records found. Contact the office if this seems incorrect.
          </div>
        )}
      </div>

      {/* Legacy optional fees that may have been assigned to fees collection */}
      {optionalFees.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-500">ℹ️</span>
              <h2 className="font-semibold text-gray-900">Hostel / Transport Fees</h2>
            </div>
            <Link
              href="/student/hostel-and-trans"
              className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline"
            >
              Manage on Hostel & Transport page <MdArrowForward />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3">Fee</th>
                  <th className="px-5 py-3">Due Date</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {optionalFees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-900">{feeLabel(fee)}</td>
                    <td className="px-5 py-3 text-gray-500">{fmtDate(fee.dueDate)}</td>
                    <td className="px-5 py-3 text-gray-700">{fmtCurrency(netAmount(fee))}</td>
                    <td className="px-5 py-3">{statusBadge(fee.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction history */}
      {fees.some((f) => f.status === "paid" || (f.paidAmount && f.paidAmount > 0)) && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Payment History</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {fees
              .filter((f) => f.status === "paid" || (f.paidAmount && f.paidAmount > 0))
              .map((fee) => (
                <div key={fee.id} className="px-6 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-sm">
                      ✓
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{feeLabel(fee)}</p>
                      <p className="text-xs text-gray-400">
                        {fee.razorpayPaymentId ? "Razorpay" : "Cash"} ·{" "}
                        {fee.paidAt?.toDate
                          ? fee.paidAt.toDate().toLocaleDateString("en-IN")
                          : fee.paidAt
                          ? new Date(fee.paidAt).toLocaleDateString("en-IN")
                          : fmtDate(fee.dueDate)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {fmtCurrency(paidAmount(fee) || netAmount(fee))}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
