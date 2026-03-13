"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import { MdHome, MdDirectionsBus, MdPayment, MdCheckCircle, MdSchedule, MdPhone, MdLocationOn } from "react-icons/md";

interface HostelDetails {
  block: string;
  roomNumber: string;
  type: string;
  wardenName: string;
  wardenContact: string;
  feeStatus: "Paid" | "Due";
  amountDue: number;
  dueDate: string;
}

interface TransportDetails {
  route: string;
  busNumber: string;
  pickupPoint: string;
  pickupTime: string;
  driverName: string;
  driverContact: string;
  feeStatus: "Paid" | "Due";
  amountDue: number;
  dueDate: string;
}

interface StudentServices {
  hostel?: HostelDetails;
  transport?: TransportDetails;
}

declare global { interface Window { Razorpay: any; } }

const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof window.Razorpay !== "undefined") return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

export default function HostelTransportPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"hostel" | "transport">("hostel");
  const [services, setServices] = useState<StudentServices | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<"hostel" | "transport" | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "student_services", user.uid));
        setServices(snap.exists() ? (snap.data() as StudentServices) : null);
      } catch {
        toast.error("Failed to load details");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleRazorpayPayment = async (type: "hostel" | "transport") => {
    if (!user || !services) return;
    const detail = services[type];
    if (!detail || detail.feeStatus === "Paid") return;
    const amount = detail.amountDue;

    setPaying(type);
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast.error("Razorpay SDK failed to load. Check your connection.");
      setPaying(null);
      return;
    }

    try {
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, feeId: `${type}_${user.uid}`, studentId: user.uid }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error || "Order creation failed");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "EduMate",
        description: `${type === "hostel" ? "Hostel" : "Transport"} Fee Payment`,
        order_id: order.orderId,
        prefill: { email: user.email || "" },
        handler: async (response: any) => {
          try {
            const verRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...response, feeId: `${type}_${user.uid}` }),
            });
            const verData = await verRes.json();
            if (!verRes.ok || !verData.verified) throw new Error("Verification failed");

            // Update student_services
            const updateKey = type === "hostel"
              ? { "hostel.feeStatus": "Paid", "hostel.amountDue": 0 }
              : { "transport.feeStatus": "Paid", "transport.amountDue": 0 };
            await updateDoc(doc(db, "student_services", user.uid), updateKey);

            // Generate transaction ID and write to payment_history
            const now = new Date();
            const txnId = `TXN-${now.toISOString().slice(0,10).replace(/-/g,"")}` +
              `-${now.toTimeString().slice(0,8).replace(/:/g,"")}` +
              `-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
            await addDoc(collection(db, "payment_history"), {
              studentId: user.uid,
              feeType: type === "hostel" ? "Hostel" : "Transport",
              amount,
              paymentDate: now.toISOString().split("T")[0],
              paymentMode: "razorpay",
              razorpayPaymentId: response.razorpay_payment_id,
              transactionId: response.razorpay_payment_id,
              createdAt: serverTimestamp(),
            });

            setServices((prev) =>
              prev ? { ...prev, [type]: { ...prev[type]!, feeStatus: "Paid", amountDue: 0 } } : prev
            );
            toast.success("✅ Payment successful!");
          } catch (e: any) {
            toast.error(e.message || "Payment verification failed");
          } finally {
            setPaying(null);
          }
        },
        modal: { ondismiss: () => setPaying(null) },
        theme: { color: "#2563EB" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (r: any) => {
        toast.error(`Payment failed: ${r.error.description || "Unknown error"}`);
        setPaying(null);
      });
      rzp.open();
    } catch (e: any) {
      toast.error(e.message || "Failed to initiate payment");
      setPaying(null);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return "—";
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen animate-pulse">
        <div className="h-7 w-52 bg-gray-200 rounded mb-6" />
        <div className="h-12 bg-white rounded-xl border border-gray-200 mb-4 w-64" />
        <div className="h-64 bg-white rounded-xl border border-gray-200" />
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!services) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Hostel & Transport</h1>
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center max-w-lg mx-auto">
          <div className="flex justify-center mb-4 gap-3">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <MdHome className="text-blue-500 text-2xl" />
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <MdDirectionsBus className="text-amber-500 text-2xl" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Services Allocated</h2>
          <p className="text-sm text-gray-500">
            You have not been allocated hostel or transport services yet.<br />
            Please contact the administration office to request an allocation.
          </p>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-left">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Contact Office</p>
            <p className="text-sm text-gray-700 flex items-center gap-2"><MdPhone className="text-gray-400" /> office@edumate.app</p>
          </div>
        </div>
      </div>
    );
  }

  const tabBtn = (tab: "hostel" | "transport", label: string, Icon: any) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
        activeTab === tab
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      <Icon className="text-base" />
      {label}
    </button>
  );

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || "—"}</p>
    </div>
  );

  // ── Hostel content ───────────────────────────────────────────────────────────
  const hostelContent = () => {
    const h = services?.hostel;
    if (!h) {
      return (
        <div className="py-12 text-center text-gray-400 text-sm">
          No hostel allocation found. Contact the office.
        </div>
      );
    }
    const isPaid = h.feeStatus === "Paid";
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 border border-gray-200 rounded-xl p-5 bg-white">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <MdHome className="text-blue-600 text-lg" />
            </div>
            <h3 className="font-semibold text-gray-900">Hostel Information</h3>
          </div>
          <div className="grid grid-cols-2 gap-y-5 gap-x-8">
            <InfoRow label="Block & Room" value={`${h.block}, Room ${h.roomNumber}`} />
            <InfoRow label="Accommodation Type" value={h.type} />
            <InfoRow label="Warden Name" value={h.wardenName} />
            <InfoRow label="Warden Contact" value={h.wardenContact} />
          </div>
        </div>
        <div className="border border-gray-200 rounded-xl p-5 bg-white flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Fee Status</p>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-500">Amount Due</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPaid ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                {h.feeStatus}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              ₹{isPaid ? "0" : h.amountDue.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <MdSchedule /> Due: {formatDate(h.dueDate)}
            </p>
          </div>
          {isPaid ? (
            <div className="mt-6 flex items-center gap-2 text-emerald-600 text-sm font-medium">
              <MdCheckCircle className="text-lg" /> Payment complete
            </div>
          ) : (
            <button
              onClick={() => handleRazorpayPayment("hostel")}
              disabled={paying === "hostel"}
              className="mt-6 w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {paying === "hostel" ? (
                <><div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent" /> Processing...</>
              ) : (
                <><MdPayment className="text-lg" /> Pay ₹{h.amountDue.toLocaleString("en-IN")}</>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  // ── Transport content ────────────────────────────────────────────────────────
  const transportContent = () => {
    const t = services?.transport;
    if (!t) {
      return (
        <div className="py-12 text-center text-gray-400 text-sm">
          No transport subscription found. Contact the office.
        </div>
      );
    }
    const isPaid = t.feeStatus === "Paid";
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 border border-gray-200 rounded-xl p-5 bg-white">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <MdDirectionsBus className="text-amber-500 text-lg" />
            </div>
            <h3 className="font-semibold text-gray-900">Transport Information</h3>
          </div>
          <div className="grid grid-cols-2 gap-y-5 gap-x-8">
            <InfoRow label="Bus Route" value={t.route} />
            <InfoRow label="Bus Number" value={t.busNumber} />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Pickup Point</p>
              <p className="text-sm font-medium text-gray-900 flex items-start gap-1">
                <MdLocationOn className="text-gray-400 mt-0.5 flex-shrink-0" />{t.pickupPoint}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 pl-5">{t.pickupTime}</p>
            </div>
            <InfoRow label="Driver Info" value={`${t.driverName} · ${t.driverContact}`} />
          </div>
        </div>
        <div className="border border-gray-200 rounded-xl p-5 bg-white flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Fee Status</p>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-500">Amount Due</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPaid ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                {t.feeStatus}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              ₹{isPaid ? "0" : t.amountDue.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <MdSchedule /> Due: {formatDate(t.dueDate)}
            </p>
          </div>
          {isPaid ? (
            <div className="mt-6 flex items-center gap-2 text-emerald-600 text-sm font-medium">
              <MdCheckCircle className="text-lg" /> Payment complete
            </div>
          ) : (
            <button
              onClick={() => handleRazorpayPayment("transport")}
              disabled={paying === "transport"}
              className="mt-6 w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {paying === "transport" ? (
                <><div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent" /> Processing...</>
              ) : (
                <><MdPayment className="text-lg" /> Pay ₹{t.amountDue.toLocaleString("en-IN")}</>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hostel & Transport</h1>
        <p className="text-gray-500 text-sm mt-1">View your accommodation and commute details</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200 flex px-4">
          {tabBtn("hostel", "Hostel", MdHome)}
          {tabBtn("transport", "Transport", MdDirectionsBus)}
        </div>

        {/* Content */}
        <div className="p-5">
          {activeTab === "hostel" ? hostelContent() : transportContent()}
        </div>
      </div>
    </div>
  );
}