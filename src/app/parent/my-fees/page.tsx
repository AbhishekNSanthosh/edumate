"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import { FiDollarSign, FiCalendar, FiCreditCard } from "react-icons/fi";
import toast from "react-hot-toast";

export default function FeesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);

  useEffect(() => {
    const fetchFees = async () => {
      if (!user) return;
      try {
        setLoading(true);

        // 1. Fetch Fees (Pending & Paid)
        // Assuming 'fees' collection contains records of fees assigned to student
        const feesQuery = query(collection(db, "fees"), where("studentId", "==", user.uid));
        const feesSnap = await getDocs(feesQuery);
        const feesData = feesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        // Sort manually if needed or use orderBy in query if index exists
        feesData.sort((a, b) => (b.dueDate?.seconds || 0) - (a.dueDate?.seconds || 0));

        setFees(feesData);

        // Calculate Outstanding
        const outstanding = feesData
            .filter(f => f.status === 'pending' || f.status === 'overdue')
            .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        setTotalOutstanding(outstanding);

        // 2. Fetch Payments (History)
        // If you have a separate 'payments' collection, fetch it. 
        // enhancing logic: often payments are linked to fees or are separate transaction records.
        // For now, I will simulate Payment History from "Paid" fees + a separate 'payments' collection if it exists.
        // Let's try to fetch from 'payments' collection
        // REMOVED orderBy to avoid index error: const paymentsQuery = query(collection(db, "payments"), where("studentId", "==", user.uid), orderBy("date", "desc"));
        const paymentsQuery = query(collection(db, "payments"), where("studentId", "==", user.uid));
        const paymentsSnap = await getDocs(paymentsQuery);
        const paymentsData = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        // Client-side sort
        paymentsData.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));

        setPayments(paymentsData);

      } catch (error) {
        console.error("Error fetching fees", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFees();
  }, [user]);

  const handleMakePayment = () => {
      toast("Payment Gateway Coming Soon!", {
          icon: '💳',
          style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
          },
      });
  }

  if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen mt-[80px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
  }

  // Helper to format currency
  const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  }

  // Helper to format date
  const formatDate = (timestamp: any) => {
      if (!timestamp) return "N/A";
      return new Date(timestamp.seconds * 1000).toLocaleDateString();
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen mt-[80px] mb-[60px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Fee Details</h1>
            <p className="text-sm text-gray-500">Manage and track your ward's fee payments.</p>
        </div>
        <button 
            onClick={handleMakePayment}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <FiCreditCard/>
          Make Payment
        </button>
      </div>

      {/* Top Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-red-50 rounded-lg text-red-600">
                   <FiDollarSign className="w-5 h-5"/>
               </div>
               <h2 className="text-gray-600 text-sm font-medium">Total Outstanding</h2>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalOutstanding)}</p>
          <p className="text-xs text-red-500 mt-1 font-medium">Due Immediately</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                   <FiCalendar className="w-5 h-5"/>
               </div>
               <h2 className="text-gray-600 text-sm font-medium">Next Due Date</h2>
          </div>
          {fees.filter(f => f.status === 'pending').length > 0 ? (
               <>
                <p className="text-xl font-semibold mt-2 text-gray-900">
                    {formatDate(fees.filter(f => f.status === 'pending')[0]?.dueDate)}
                </p>
                <p className="text-sm text-gray-500">Plan payments to avoid fines.</p>
               </>
          ) : (
                <>
                <p className="text-xl font-semibold mt-2 text-green-600">No Dues</p>
                <p className="text-sm text-gray-500">All caught up!</p>
                </>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-green-50 rounded-lg text-green-600">
                   <FiCreditCard className="w-5 h-5"/>
               </div>
               <h2 className="text-gray-600 text-sm font-medium">Payment Options</h2>
          </div>
          <p className="text-sm mt-2 text-gray-500">
            Secure online payment gateway via UPI, Cards, or Net Banking.
          </p>
          <button className="mt-3 text-blue-600 font-medium text-sm hover:underline">View Instructions</button>
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Fee Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead className="bg-gray-50">
                <tr>
                <th className="p-4 text-sm font-medium text-gray-500">Item / Description</th>
                <th className="p-4 text-sm font-medium text-gray-500">Due Date</th>
                <th className="p-4 text-sm font-medium text-gray-500">Amount</th>
                <th className="p-4 text-sm font-medium text-gray-500">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {fees.length > 0 ? fees.map((fee) => (
                <tr key={fee.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                        <p className="font-medium text-gray-900">{fee.item || "Fee Item"}</p>
                        <span className="text-xs text-gray-500">ID: {fee.id.substring(0,8)}</span>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{formatDate(fee.dueDate)}</td>
                    <td className="p-4 font-medium text-gray-900">{formatCurrency(fee.amount)}</td>
                    <td className="p-4">
                    <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        fee.status === "paid"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : fee.status === "overdue" 
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-yellow-50 text-yellow-700 border-yellow-200"
                        }`}
                    >
                        {fee.status ? fee.status.toUpperCase() : "PENDING"}
                    </span>
                    </td>
                </tr>
                )) : (
                    <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400">No fee records found.</td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead className="bg-gray-50">
                <tr>
                <th className="p-4 text-sm font-medium text-gray-500">Payment ID</th>
                <th className="p-4 text-sm font-medium text-gray-500">Date</th>
                <th className="p-4 text-sm font-medium text-gray-500">Description</th>
                <th className="p-4 text-sm font-medium text-gray-500">Amount Paid</th>
                <th className="p-4 text-sm font-medium text-gray-500">Method</th>
                <th className="p-4 text-sm font-medium text-gray-500">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {payments.length > 0 ? payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-gray-500">#{p.id.substring(0,8)}</td>
                    <td className="p-4 text-sm text-gray-600">{formatDate(p.date)}</td>
                    <td className="p-4 text-sm text-gray-900 font-medium">{p.description || "Fee Payment"}</td>
                    <td className="p-4 text-sm font-bold text-gray-900">{formatCurrency(p.amount)}</td>
                    <td className="p-4 text-sm text-gray-600">{p.method || "Online"}</td>
                    <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        {p.status || "Success"}
                    </span>
                    </td>
                </tr>
                )) : (
                     <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400">No recent transactions found.</td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">Payments typically process within 1-3 business days. For issues, contact accounts@edumate.edu</p>
        </div>
      </div>
    </div>
  );
}
