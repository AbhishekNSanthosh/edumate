'use client';

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, setDoc, getDocs, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'

interface LeaveType {
  id: string;
  name: string;
  code: string;
  balance: number;
  description: string;
}

interface LeaveApplication {
  id: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedDate: string;
  approvedBy: string;
  createdAt: any;
}

export default function page() {
  const { user } = useAuth()
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [selectedType, setSelectedType] = useState('CL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [days, setDays] = useState(0)
  const [reason, setReason] = useState('')
  
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [leaveHistory, setLeaveHistory] = useState<LeaveApplication[]>([])
  const [loading, setLoading] = useState(true)

  // Initialize Balances if not exist
  const initializeBalances = async (uid: string) => {
      const balanceRef = collection(db, 'leave_balances');
      const q = query(balanceRef, where('facultyId', '==', uid));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
          // Default balances
          const defaults = [
              { name: 'Casual Leave', code: 'CL', balance: 12, description: 'Personal reasons, max 3 consecutive days' },
              { name: 'Sick Leave', code: 'SL', balance: 10, description: 'Medical reasons with certificate' },
              { name: 'On Duty', code: 'OD', balance: 5, description: 'Official duty outside campus' },
              { name: 'Earned Leave', code: 'EL', balance: 20, description: 'Accumulated leave' },
          ];

          for (const type of defaults) {
              await addDoc(balanceRef, {
                  ...type,
                  facultyId: uid
              });
          }
          toast.success("Initialized leave balances");
      }
  }

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // Check and initialize balances
    initializeBalances(user.uid);

    // Fetch Balances
    const unsubBalances = onSnapshot(query(collection(db, 'leave_balances'), where('facultyId', '==', user.uid)), (snap) => {
        setLeaveTypes(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveType)));
    });

    // Fetch History
    const unsubHistory = onSnapshot(query(
        collection(db, 'faculty_leaves'), 
        where('facultyId', '==', user.uid)
    ), (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveApplication));
        // Sort client-side to avoid needing a composite index
        data.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
        });
        setLeaveHistory(data);
        setLoading(false);
    });

    return () => {
        unsubBalances();
        unsubHistory();
    }
  }, [user]);

  // Auto-calculate days
  useEffect(() => {
      if (fromDate && toDate) {
          const start = new Date(fromDate);
          const end = new Date(toDate);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
          setDays(diffDays > 0 ? diffDays : 0);
      } else {
          setDays(0);
      }
  }, [fromDate, toDate]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || days <= 0) return;

    // Check balance
    const type = leaveTypes.find(t => t.code === selectedType);
    if (!type) return;

    if (type.balance < days) {
        toast.error(`Insufficient ${type.name} balance!`);
        return;
    }

    try {
        await addDoc(collection(db, 'faculty_leaves'), {
            facultyId: user.uid,
            type: selectedType,
            fromDate,
            toDate,
            days,
            reason,
            status: 'pending',
            appliedDate: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
            approvedBy: '',
            createdAt: Timestamp.now()
        });
        
        // Deduct balance tentatively or wait for approval? 
        // Providing immediate feedback is better, but usually balance deducts on approval.
        // For this demo, let's just log request. Real apps usually block balance on pending too.
        
        // Optimistically deduct balance (optional logic decision)
        await updateDoc(doc(db, 'leave_balances', type.id), {
            balance: type.balance - days
        });

        toast.success("Leave application submitted");
        setShowApplyForm(false);
        setReason('');
        setFromDate('');
        setToDate('');
    } catch (error) {
        console.error(error);
        toast.error("Failed to apply");
    }
  }

  const cancelLeave = async (leave: LeaveApplication) => {
      try {
          if (!confirm("Are you sure you want to cancel this leave application?")) return;
          
          await updateDoc(doc(db, 'faculty_leaves', leave.id), {
              status: 'cancelled'
          });

          // Refund balance if it was deducted
          const type = leaveTypes.find(t => t.code === leave.type);
          if (type) {
              await updateDoc(doc(db, 'leave_balances', type.id), {
                  balance: type.balance + leave.days
              });
          }

          toast.success("Leave cancelled");
      } catch (error) {
          console.error(error);
          toast.error("Failed to cancel leave");
      }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const QuickActions = () => (
    <div className="flex space-x-4 mb-6">
      <button
        onClick={() => setShowApplyForm(!showApplyForm)}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        {showApplyForm ? 'Cancel' : 'Apply for Leave'}
      </button>
      <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
        Download Leave Policy
      </button>
      <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
        View Calendar
      </button>
    </div>
  )

  const totalBalance = leaveTypes.reduce((sum, type) => sum + type.balance, 0)
  const pendingApplications = leaveHistory.filter(l => l.status === 'pending').length
  const approvedLeaves = leaveHistory.filter(l => l.status === 'approved').length

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600 mt-2">Apply for leave and track your applications.</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Leave Balance */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Leave Balance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance (days)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaveTypes.map((type) => (
                  <tr key={type.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{type.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{type.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{type.balance}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{type.description}</td>
                  </tr>
                ))}
                {leaveTypes.length === 0 && !loading && (
                    <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">Initializing balances...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Apply for Leave Form */}
        {showApplyForm && (
          <div className="bg-white rounded-lg shadow-md mb-8 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Apply for Leave</h2>
            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    {leaveTypes.map(type => (
                      <option key={type.id} value={type.code}>{type.name} ({type.balance} days left)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                    min={fromDate}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
                  <input
                    type="number"
                    value={days}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Auto-calculated"
                    disabled
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter reason for leave"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                disabled={days <= 0}
              >
                Submit Application
              </button>
            </form>
          </div>
        )}

        {/* Leave History */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Leave History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From - To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaveHistory.length === 0 && <tr><td colSpan={8} className="px-6 py-4 text-center text-gray-500">No leave history found.</td></tr>}
                {leaveHistory.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{leave.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{leave.fromDate} - {leave.toDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{leave.days}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{leave.reason}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(leave.status)}`}>
                        {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{leave.appliedDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{leave.approvedBy || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">View</button>
                      {leave.status === 'pending' && (
                        <button 
                            onClick={() => cancelLeave(leave)}
                            className="text-red-600 hover:text-red-900"
                        >
                            Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Leave Balance</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalBalance} days</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pending Applications</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{pendingApplications}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Approved Leaves</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{approvedLeaves}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Applications</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{leaveHistory.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
