"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, updateDoc, doc } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";

interface Fee {
  id: string;
  item: string;
  amount: number;
  dueDate: any; // Firestore Timestamp
  status: 'paid' | 'pending' | 'overdue';
  studentId: string;
  paidAt?: any;
}

export default function FeesPage() {
  const { user } = useAuth();
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Computed totals
  const totalOutstanding = fees
    .filter(f => f.status === 'pending' || f.status === 'overdue')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const nextDueDate = fees
    .filter(f => f.status === 'pending')
    .sort((a, b) => a.dueDate.seconds - b.dueDate.seconds)[0]?.dueDate;

  useEffect(() => {
    const fetchFees = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, "fees"), where("studentId", "==", user.uid));
        const snapshot = await getDocs(q);
        const feesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Fee));
        
        // Sort explicitly if needed, though client-side sort is fine for small lists
        feesData.sort((a, b) => b.dueDate.seconds - a.dueDate.seconds);
        
        setFees(feesData);
      } catch (error) {
        console.error("Error fetching fees:", error);
        toast.error("Failed to load fee details.");
      } finally {
        setLoading(false);
      }
    };

    fetchFees();
  }, [user]);

  const seedFeesData = async () => {
      if (!user) return;
      if (!confirm("Generate sample fee data?")) return;
      
      try {
          const sampleFees = [
              { item: "Tuition Fee - Semester 5", amount: 45000, status: 'pending', dueInDays: 30 },
              { item: "Lab Fee - Computer Science", amount: 5000, status: 'pending', dueInDays: 15 },
              { item: "Library Fine", amount: 250, status: 'overdue', dueInDays: -5 },
              { item: "Hostel Fee - Q3", amount: 12000, status: 'paid', dueInDays: 0 },
          ];

          for (const fee of sampleFees) {
              const date = new Date();
              date.setDate(date.getDate() + fee.dueInDays);
              
              await addDoc(collection(db, "fees"), {
                  studentId: user.uid,
                  item: fee.item,
                  amount: fee.amount,
                  status: fee.status,
                  dueDate: date,
                  createdAt: serverTimestamp(),
                  ...(fee.status === 'paid' ? { paidAt: new Date() } : {})
              });
          }
          toast.success("Sample fees generated! Refreshing...");
          window.location.reload();
      } catch (error) {
          console.error(error);
          toast.error("Failed to seed data");
      }
  }

  const handlePay = async (fee: Fee) => {
      if(processingId) return;
      setProcessingId(fee.id);
      
      // Simulate Razorpay/Payment Gateway delay
      const toastId = toast.loading("Initializing secure payment...");

      setTimeout(async () => {
          try {
              // In production, this would open Razorpay modal
              // For demo, we assume success
              const feeRef = doc(db, "fees", fee.id);
              await updateDoc(feeRef, {
                  status: 'paid',
                  paidAt: new Date()
              });

              setFees(prev => prev.map(f => f.id === fee.id ? { ...f, status: 'paid', paidAt: new Date() } : f));
              toast.success("Payment successful! Receipt sent to email.", { id: toastId });
          } catch (err) {
              console.error(err);
              toast.error("Payment failed. Try again.", { id: toastId });
          } finally {
              setProcessingId(null);
          }
      }, 2000);
  }

  if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] mt-[80px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen mt-[80px] mb-[60px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">My Fees</h1>
            <p className="text-gray-500 text-sm">Track your financial status and payment history.</p>
        </div>
        
        {process.env.NODE_ENV === 'development' && fees.length === 0 && (
             <button onClick={seedFeesData} className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200">
                 + Seed Data (Dev)
             </button>
        )}
      </div>

      {/* Top Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Outstanding</h2>
            <p className="text-3xl font-bold text-gray-900 mt-2">₹{totalOutstanding.toLocaleString('en-IN')}</p>
          </div>
          <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5">
               <div className="bg-red-500 h-1.5 rounded-full" style={{ width: totalOutstanding > 0 ? '60%' : '0%' }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
           <div>
            <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Next Due Date</h2>
            <p className="text-xl font-bold text-gray-900 mt-2">
                {nextDueDate ? new Date(nextDueDate.seconds * 1000).toLocaleDateString(undefined, {
                    day: 'numeric', month: 'long', year: 'numeric'
                }) : "No pending dues"}
            </p>
           </div>
           {nextDueDate && (
               <p className="text-sm text-red-500 font-medium mt-2">
                   Action Required
               </p>
           )}
        </div>

         <div className="bg-blue-600 p-6 rounded-2xl shadow-sm shadow-blue-200 text-white flex flex-col justify-between">
           <div>
            <h2 className="text-blue-100 text-sm font-medium uppercase tracking-wide">Secure Payment</h2>
            <p className="text-sm text-blue-50 mt-2 opacity-90">
                All transactions are encrypted and secured. We support UPI, Cards, and Netbanking.
            </p>
           </div>
           
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Fee Breakdown</h2>
        </div>
        
        {fees.length > 0 ? (
            <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                <tr>
                    <th className="p-4">Description</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {fees.map((fee) => {
                    const isDue = fee.status === 'pending' || fee.status === 'overdue';
                    const date = fee.dueDate?.seconds ? new Date(fee.dueDate.seconds * 1000) : new Date();

                    return (
                        <tr key={fee.id} className="group hover:bg-gray-50 transition-colors">
                            <td className="p-4 font-medium text-gray-900">{fee.item}</td>
                            <td className="p-4 text-gray-600 text-sm">{date.toLocaleDateString()}</td>
                            <td className="p-4 font-semibold text-gray-900">₹{fee.amount.toLocaleString('en-IN')}</td>
                            <td className="p-4">
                            <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                fee.status === "paid"
                                    ? "bg-green-100 text-green-700"
                                    : fee.status === "overdue" 
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                            >
                                {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
                            </span>
                            </td>
                            <td className="p-4 text-right">
                                {isDue && (
                                    <button 
                                        onClick={() => handlePay(fee)}
                                        disabled={!!processingId}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition shadow-sm shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {processingId === fee.id ? "Processing..." : "Pay Now"}
                                    </button>
                                )}
                                {fee.status === 'paid' && (
                                    <span className="text-gray-400 text-sm">Paid on {fee.paidAt?.toDate().toLocaleDateString()}</span>
                                )}
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
            </div>
        ) : (
             <div className="p-10 text-center text-gray-500">
                 No fee records found.
             </div>
        )}
      </div>

       {/* Payment History (Filtered from fees for simplicity) */}
       {fees.some(f => f.status === 'paid') && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Transaction History</h2>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        {fees.filter(f => f.status === 'paid').map(fee => (
                            <div key={fee.id} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-lg">
                                        ✓
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{fee.item}</p>
                                        <p className="text-xs text-gray-500">Bank Transfer • {fee.paidAt?.toDate().toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <span className="font-bold text-gray-900">₹{fee.amount.toLocaleString('en-IN')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
       )}
    </div>
  );
}
