"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  getDocs,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import Skeleton from "../../../common/components/Skeleton";

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
  status: string;
  appliedDate: string;
  approvedBy: string;
  createdAt: any;
  currentApprover: string;
  isLateSubmission: boolean;
  hodStatus?: string;
  hodName?: string;
  hodRemarks?: string;
  principalStatus?: string;
  principalName?: string;
  principalRemarks?: string;
  directorStatus?: string;
  directorName?: string;
  directorRemarks?: string;
}

export default function LeaveManagementPage() {
  const { user } = useAuth();
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [selectedType, setSelectedType] = useState("CL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [days, setDays] = useState(0);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveHistory, setLeaveHistory] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [facultyData, setFacultyData] = useState<any>(null);
  const [viewLeave, setViewLeave] = useState<LeaveApplication | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  // Initialize Balances if not exist
  const initializeBalances = async (uid: string) => {
    const balanceRef = collection(db, "leave_balances");
    const q = query(balanceRef, where("facultyId", "==", uid));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      const defaults = [
        {
          name: "Casual Leave",
          code: "CL",
          balance: 12,
          description: "Personal reasons, max 3 consecutive days",
        },
        {
          name: "Sick Leave",
          code: "SL",
          balance: 10,
          description: "Medical reasons with certificate",
        },
        {
          name: "On Duty",
          code: "OD",
          balance: 5,
          description: "Official duty outside campus",
        },
        {
          name: "Earned Leave",
          code: "EL",
          balance: 20,
          description: "Accumulated leave",
        },
      ];

      for (const type of defaults) {
        await addDoc(balanceRef, {
          ...type,
          facultyId: uid,
        });
      }
      toast.success("Initialized leave balances");
    }
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    initializeBalances(user.uid);

    // Fetch faculty data for department info
    const fetchFacultyData = async () => {
      const facultyDoc = await getDoc(doc(db, "faculty", user.uid));
      if (facultyDoc.exists()) {
        setFacultyData({ id: facultyDoc.id, ...facultyDoc.data() });
      }
    };
    fetchFacultyData();

    // Fetch Balances
    const unsubBalances = onSnapshot(
      query(
        collection(db, "leave_balances"),
        where("facultyId", "==", user.uid),
      ),
      (snap) => {
        setLeaveTypes(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LeaveType),
        );
      },
    );

    // Fetch History
    const unsubHistory = onSnapshot(
      query(
        collection(db, "faculty_leaves"),
        where("facultyId", "==", user.uid),
      ),
      (snap) => {
        const data = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as LeaveApplication,
        );
        data.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        setLeaveHistory(data);
        setLoading(false);
      },
    );

    return () => {
      unsubBalances();
      unsubHistory();
    };
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

  // Scroll to form when toggled open
  useEffect(() => {
    if (showApplyForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showApplyForm]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || days <= 0 || !facultyData) return;

    const type = leaveTypes.find((t) => t.code === selectedType);
    if (!type) return;

    if (type.balance < days) {
      toast.error(`Insufficient ${type.name} balance!`);
      return;
    }

    setSubmitting(true);

    try {
      // Check if late submission (after 8:30 AM of the from-date)
      const now = new Date();
      const leaveDate = new Date(fromDate);
      leaveDate.setHours(8, 30, 0, 0); // 8:30 AM of leave date
      const isLate = now > leaveDate;

      // Find the HOD of the faculty's department
      const deptQuery = query(
        collection(db, "departments"),
        where("name", "==", facultyData.department),
      );
      const deptSnap = await getDocs(deptQuery);

      let hodId = "";
      let hodName = "";
      if (!deptSnap.empty) {
        const deptData = deptSnap.docs[0].data();
        hodId = deptData.hod || "";

        // Get HOD name
        if (hodId) {
          const hodDoc = await getDoc(doc(db, "faculty", hodId));
          if (hodDoc.exists()) {
            hodName = hodDoc.data().name || "";
          }
        }
      }

      const leaveData = {
        facultyId: user.uid,
        facultyName: facultyData.name,
        facultyDepartment: facultyData.department,
        type: selectedType,
        fromDate,
        toDate,
        days,
        reason,
        status: "pending_hod",
        currentApprover: "hod" as const,
        isLateSubmission: isLate,
        submittedAt: new Date().toISOString(),
        appliedDate: new Date().toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        approvedBy: "",
        createdAt: Timestamp.now(),
        // HOD fields
        hodId,
        hodName,
        hodStatus: "pending" as const,
        hodRemarks: "",
        // Principal fields
        principalId: "",
        principalName: "",
        principalStatus: "pending" as const,
        principalRemarks: "",
        // Director fields
        directorId: "",
        directorName: "",
        directorStatus: "pending" as const,
        directorRemarks: "",
      };

      await addDoc(collection(db, "faculty_leaves"), leaveData);

      // Deduct balance optimistically
      await updateDoc(doc(db, "leave_balances", type.id), {
        balance: type.balance - days,
      });

      // Send notification to HOD
      if (hodId) {
        await addDoc(collection(db, "notifications"), {
          title: "New Leave Application",
          message: `${facultyData.name} (${facultyData.department}) has applied for ${days} day(s) of ${type.name} from ${fromDate} to ${toDate}.${isLate ? " (Late submission - after 8:30 AM)" : ""}`,
          type: "warning",
          createdAt: new Date().toISOString(),
          read: false,
          targetUid: hodId,
          audience: [],
        });
      }

      toast.success("Leave application submitted to HOD");
      setShowApplyForm(false);
      setReason("");
      setFromDate("");
      setToDate("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to apply");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelLeave = async (leave: LeaveApplication) => {
    try {
      if (!confirm("Are you sure you want to cancel this leave application?"))
        return;

      await updateDoc(doc(db, "faculty_leaves", leave.id), {
        status: "cancelled",
        currentApprover: "none",
      });

      const type = leaveTypes.find((t) => t.code === leave.type);
      if (type) {
        await updateDoc(doc(db, "leave_balances", type.id), {
          balance: type.balance + leave.days,
        });
      }

      toast.success("Leave cancelled");
    } catch (error) {
      console.error(error);
      toast.error("Failed to cancel leave");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending_hod":
        return "bg-yellow-100 text-yellow-800";
      case "pending_principal":
        return "bg-orange-100 text-orange-800";
      case "pending_director":
        return "bg-purple-100 text-purple-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending_hod":
        return "Pending HOD";
      case "pending_principal":
        return "Pending Principal";
      case "pending_director":
        return "Pending Director";
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      case "cancelled":
        return "Cancelled";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const totalBalance = leaveTypes.reduce((sum, type) => sum + type.balance, 0);
  const pendingApplications = leaveHistory.filter(
    (l) => l.status.startsWith("pending"),
  ).length;
  const approvedLeaves = leaveHistory.filter(
    (l) => l.status === "approved",
  ).length;

  if (loading)
    return (
      <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
        <div className="mb-6 md:mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="flex gap-4 mb-6 md:mb-8">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 mb-6 md:mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/30">
            <Skeleton className="h-7 w-48" />
          </div>
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-xl border border-gray-200">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-10 w-16" />
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-light text-gray-900">
            Leave Management
          </h1>
          <p className="text-gray-500 mt-2 font-light">
            Apply for leave and track your applications.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setShowApplyForm(!showApplyForm)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            {showApplyForm ? "Cancel" : "Apply for Leave"}
          </button>
          <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
            Download Leave Policy
          </button>
          <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
            View Calendar
          </button>
        </div>

        {/* Leave Balance */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6 md:mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/30">
            <h2 className="text-lg font-medium text-gray-900">Leave Balance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance (days)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaveTypes.map((type) => (
                  <tr key={type.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {type.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {type.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {type.balance}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {type.description}
                    </td>
                  </tr>
                ))}
                {leaveTypes.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      Initializing balances...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Apply for Leave Form */}
        {showApplyForm && (
          <div ref={formRef} className="bg-white rounded-xl border border-gray-200 mb-6 md:mb-8 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Apply for Leave
            </h2>

            {/* Workflow Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Approval Workflow:</strong> Your leave application will be sent to your{" "}
                <strong>HOD</strong> for recommendation, then to the <strong>Principal</strong> for approval.
                Applications submitted after <strong>8:30 AM</strong> on the leave date will be escalated directly to the <strong>Director</strong> after HOD recommendation.
              </p>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Type
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.code}>
                        {type.name} ({type.balance} days left)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Days
                  </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter reason for leave"
                  required
                />
              </div>

              {/* Late submission warning */}
              {fromDate && (() => {
                const now = new Date();
                const leaveDate = new Date(fromDate);
                leaveDate.setHours(8, 30, 0, 0);
                return now > leaveDate;
              })() && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    <strong>Late Submission:</strong> You are applying after 8:30 AM of the leave date.
                    After HOD recommendation, this will be escalated to the Director instead of the Principal.
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={days <= 0 || submitting}
              >
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            </form>
          </div>
        )}

        {/* Leave History */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6 md:mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/30">
            <h2 className="text-lg font-medium text-gray-900">Leave History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From - To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaveHistory.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No leave history found.
                    </td>
                  </tr>
                )}
                {leaveHistory.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {leave.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {leave.fromDate} - {leave.toDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {leave.days}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {leave.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(leave.status)}`}
                      >
                        {getStatusLabel(leave.status)}
                      </span>
                      {leave.isLateSubmission && (
                        <span className="ml-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                          Late
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {leave.appliedDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => setViewLeave(leave)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                      {leave.status.startsWith("pending") && (
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
          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors">
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide">
              Total Leave Balance
            </h3>
            <p className="text-3xl font-light text-gray-900 mt-2">
              {totalBalance} days
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-yellow-300 transition-colors">
            <h3 className="text-xs font-bold text-yellow-600 uppercase tracking-wide">
              Pending Applications
            </h3>
            <p className="text-3xl font-light text-gray-900 mt-2">
              {pendingApplications}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-green-300 transition-colors">
            <h3 className="text-xs font-bold text-green-600 uppercase tracking-wide">
              Approved Leaves
            </h3>
            <p className="text-3xl font-light text-gray-900 mt-2">
              {approvedLeaves}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-purple-300 transition-colors">
            <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wide">
              Total Applications
            </h3>
            <p className="text-3xl font-light text-gray-900 mt-2">
              {leaveHistory.length}
            </p>
          </div>
        </div>
      </div>

      {/* View Leave Details Modal */}
      {viewLeave && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setViewLeave(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Leave Application Details</h3>
                <button onClick={() => setViewLeave(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Type</p>
                  <p className="text-sm text-gray-900 font-medium">{viewLeave.type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Days</p>
                  <p className="text-sm text-gray-900 font-medium">{viewLeave.days}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">From</p>
                  <p className="text-sm text-gray-900">{viewLeave.fromDate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">To</p>
                  <p className="text-sm text-gray-900">{viewLeave.toDate}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Reason</p>
                <p className="text-sm text-gray-900 mt-1">{viewLeave.reason}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Status</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${getStatusColor(viewLeave.status)}`}>
                  {getStatusLabel(viewLeave.status)}
                </span>
                {viewLeave.isLateSubmission && (
                  <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                    Late Submission
                  </span>
                )}
              </div>

              {/* Approval Trail */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Approval Trail</p>
                <div className="space-y-3">
                  {/* HOD */}
                  <div className={`p-3 rounded-lg border ${viewLeave.hodStatus === "recommended" ? "bg-green-50 border-green-200" : viewLeave.hodStatus === "rejected" ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">HOD: {viewLeave.hodName || "Pending"}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${viewLeave.hodStatus === "recommended" ? "bg-green-100 text-green-800" : viewLeave.hodStatus === "rejected" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                        {viewLeave.hodStatus === "recommended" ? "Recommended" : viewLeave.hodStatus === "rejected" ? "Rejected" : "Pending"}
                      </span>
                    </div>
                    {viewLeave.hodRemarks && (
                      <p className="text-xs text-gray-600 mt-1">Remarks: {viewLeave.hodRemarks}</p>
                    )}
                  </div>

                  {/* Principal */}
                  {(viewLeave.hodStatus === "recommended" && !viewLeave.isLateSubmission) && (
                    <div className={`p-3 rounded-lg border ${viewLeave.principalStatus === "approved" ? "bg-green-50 border-green-200" : viewLeave.principalStatus === "rejected" ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">Principal: {viewLeave.principalName || "Pending"}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${viewLeave.principalStatus === "approved" ? "bg-green-100 text-green-800" : viewLeave.principalStatus === "rejected" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                          {viewLeave.principalStatus === "approved" ? "Approved" : viewLeave.principalStatus === "rejected" ? "Rejected" : "Pending"}
                        </span>
                      </div>
                      {viewLeave.principalRemarks && (
                        <p className="text-xs text-gray-600 mt-1">Remarks: {viewLeave.principalRemarks}</p>
                      )}
                    </div>
                  )}

                  {/* Director (for late submissions) */}
                  {(viewLeave.hodStatus === "recommended" && viewLeave.isLateSubmission) && (
                    <div className={`p-3 rounded-lg border ${viewLeave.directorStatus === "approved" ? "bg-green-50 border-green-200" : viewLeave.directorStatus === "rejected" ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">Director: {viewLeave.directorName || "Pending"}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${viewLeave.directorStatus === "approved" ? "bg-green-100 text-green-800" : viewLeave.directorStatus === "rejected" ? "bg-red-100 text-red-800" : "bg-purple-100 text-purple-800"}`}>
                          {viewLeave.directorStatus === "approved" ? "Approved" : viewLeave.directorStatus === "rejected" ? "Rejected" : "Pending"}
                        </span>
                      </div>
                      {viewLeave.directorRemarks && (
                        <p className="text-xs text-gray-600 mt-1">Remarks: {viewLeave.directorRemarks}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
