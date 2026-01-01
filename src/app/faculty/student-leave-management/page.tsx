'use client';

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'

interface LeaveApplication {
  id: string;
  student: string;
  regNumber: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedDate: string;
  createdAt: any;
  approvedDate?: string;
  approvedBy?: string;
}

export default function page() {
  const { user } = useAuth()
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending')
  const [applications, setApplications] = useState<LeaveApplication[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // For now, fetching all student leaves. In a real app, you might filter by department or mentorship
    const q = query(collection(db, 'student_leaves')); // orderBy requires index, doing client-side sort
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as LeaveApplication));

        // Client-side sort
        data.sort((a, b) => {
             const timeA = a.createdAt?.seconds || 0;
             const timeB = b.createdAt?.seconds || 0;
             return timeB - timeA;
        });

        setApplications(data);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (id: string) => {
    try {
        await updateDoc(doc(db, 'student_leaves', id), {
            status: 'approved',
            approvedDate: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
            approvedBy: user?.displayName || 'Faculty'
        });
        toast.success("Leave approved");
    } catch (error) {
        console.error(error);
        toast.error("Failed to approve");
    }
  }

  const handleReject = async (id: string) => {
    try {
        await updateDoc(doc(db, 'student_leaves', id), {
            status: 'rejected',
            approvedDate: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
            approvedBy: user?.displayName || 'Faculty'
        });
        toast.success("Leave rejected");
    } catch (error) {
        console.error(error);
        toast.error("Failed to reject");
    }
  }

  const handleNotify = (student: string) => {
    // Simulate notification
    toast.success(`Notification sent to ${student}`);
  }

  const addTestData = async () => {
      try {
          const sample = {
            student: 'Test Student ' + Math.floor(Math.random() * 100),
            regNumber: `2024CSE${Math.floor(Math.random() * 100)}`,
            type: 'Sick Leave',
            fromDate: '2026-01-10',
            toDate: '2026-01-12',
            days: 3,
            reason: 'Fever and cold',
            status: 'pending',
            appliedDate: new Date().toLocaleDateString(),
            createdAt: Timestamp.now()
          };
          await addDoc(collection(db, 'student_leaves'), sample);
          toast.success("Test leave request added");
      } catch (e) {
          console.error(e);
          toast.error("Failed to add test data");
      }
  }

  // Filter Data
  const pendingApplications = applications.filter(app => app.status === 'pending');
  const leaveHistories = applications.filter(app => ['approved', 'rejected'].includes(app.status));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const QuickActions = () => (
    <div className="flex space-x-4 mb-6">
      <button
        onClick={() => setViewMode('pending')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          viewMode === 'pending' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Pending Applications
      </button>
      <button
        onClick={() => setViewMode('history')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          viewMode === 'history' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Leave History
      </button>
      <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
        Export Records
      </button>
      <button 
        onClick={addTestData}
        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors ml-auto">
        + Seed Test Data
      </button>
    </div>
  )

  const pendingCount = pendingApplications.length
  const approvedCount = leaveHistories.filter(h => h.status === 'approved').length
  const rejectedCount = leaveHistories.filter(h => h.status === 'rejected').length

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Student Leave Management</h1>
          <p className="text-gray-600 mt-2">Approve and track student leave requests.</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Content based on view mode */}
        {viewMode === 'pending' ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Pending Leave Applications ({pendingCount})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reg No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From - To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading && <tr><td colSpan={8} className="text-center p-4">Loading...</td></tr>}
                  {!loading && pendingApplications.length === 0 && <tr><td colSpan={8} className="text-center p-4">No pending applications</td></tr>}
                  {pendingApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{app.student}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.regNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.fromDate} - {app.toDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{app.days}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{app.reason}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.appliedDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleApprove(app.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(app.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleNotify(app.student)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Notify
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Leave History</h2>
              <div className="flex space-x-4 mb-4 mt-2">
                <input
                  type="text"
                  placeholder="Search by student name or reg number"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full md:w-64"
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  value={selectedStudent}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reg No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From - To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                   {loading && <tr><td colSpan={10} className="text-center p-4">Loading...</td></tr>}
                   {!loading && leaveHistories.length === 0 && <tr><td colSpan={10} className="text-center p-4">No history records found</td></tr>}
                  {leaveHistories
                    .filter(history => !selectedStudent || history.student.toLowerCase().includes(selectedStudent.toLowerCase()) || history.regNumber.toLowerCase().includes(selectedStudent.toLowerCase()))
                    .map((history) => (
                      <tr key={history.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{history.student}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{history.regNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{history.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{history.fromDate} - {history.toDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{history.days}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{history.reason}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(history.status)}`}>
                            {history.status.charAt(0).toUpperCase() + history.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{history.approvedDate || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{history.approvedBy || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">View Details</button>
                          <button
                            onClick={() => handleNotify(history.student)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Notify
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pending Requests</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{pendingCount}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Approved Leaves</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{approvedCount}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Rejected Leaves</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">{rejectedCount}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
