"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import Skeleton from "../../../common/components/Skeleton";

interface LeaveApplication {
  id: string;
  facultyId: string;
  facultyName: string;
  facultyDepartment: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: string;
  appliedDate: string;
  currentApprover: string;
  isLateSubmission: boolean;
  submittedAt: string;
  createdAt: any;
  hodId?: string;
  hodName?: string;
  hodStatus?: string;
  hodRemarks?: string;
  hodActionDate?: string;
  principalId?: string;
  principalName?: string;
  principalStatus?: string;
  principalRemarks?: string;
  principalActionDate?: string;
  directorId?: string;
  directorName?: string;
  directorStatus?: string;
  directorRemarks?: string;
  directorActionDate?: string;
}

export default function LeaveApprovalsPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [facultyData, setFacultyData] = useState<any>(null);
  const [selectedLeave, setSelectedLeave] = useState<LeaveApplication | null>(null);
  const [remarks, setRemarks] = useState("");
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("pending");

  useEffect(() => {
    if (!user) return;

    const fetchFaculty = async () => {
      const facultyDoc = await getDoc(doc(db, "faculty", user.uid));
      if (facultyDoc.exists()) {
        const data = { id: facultyDoc.id, ...facultyDoc.data() };
        setFacultyData(data);
      }
    };
    fetchFaculty();
  }, [user]);

  useEffect(() => {
    if (!user || !facultyData) return;

    const role = facultyData.role;
    let queries: any[] = [];

    if (role === "HOD") {
      // HOD sees leaves from their department where currentApprover is "hod"
      queries.push(
        query(
          collection(db, "faculty_leaves"),
          where("facultyDepartment", "==", facultyData.department),
          where("currentApprover", "==", "hod"),
        ),
      );
      // Also show leaves they've already acted on
      queries.push(
        query(
          collection(db, "faculty_leaves"),
          where("facultyDepartment", "==", facultyData.department),
          where("hodId", "==", user.uid),
        ),
      );
    } else if (role === "Principal") {
      // Principal sees leaves where currentApprover is "principal"
      queries.push(
        query(
          collection(db, "faculty_leaves"),
          where("currentApprover", "==", "principal"),
        ),
      );
      // Also show leaves they've already acted on
      queries.push(
        query(
          collection(db, "faculty_leaves"),
          where("principalId", "==", user.uid),
        ),
      );
    } else if (role === "Director") {
      // Director sees all leaves where currentApprover is "director"
      queries.push(
        query(
          collection(db, "faculty_leaves"),
          where("currentApprover", "==", "director"),
        ),
      );
      // Also show leaves they've already acted on
      queries.push(
        query(
          collection(db, "faculty_leaves"),
          where("directorId", "==", user.uid),
        ),
      );
    }

    if (queries.length === 0) {
      setLoading(false);
      return;
    }

    const leaveMap = new Map<string, LeaveApplication>();
    let loadCount = 0;

    const updateList = () => {
      const list = Array.from(leaveMap.values()).sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setLeaves(list);
    };

    const unsubs = queries.map((q: any) =>
      onSnapshot(q, (snap: any) => {
        snap.docs.forEach((d: any) => {
          leaveMap.set(d.id, { id: d.id, ...d.data() } as LeaveApplication);
        });
        loadCount++;
        if (loadCount >= queries.length) setLoading(false);
        updateList();
      }),
    );

    return () => unsubs.forEach((u) => u());
  }, [user, facultyData]);

  const getRole = () => facultyData?.role || "";

  // HOD recommends a leave
  const handleHodRecommend = async (leave: LeaveApplication) => {
    if (!user || !facultyData) return;
    setProcessing(true);

    try {
      const nextApprover = leave.isLateSubmission ? "director" : "principal";
      const nextStatus = leave.isLateSubmission ? "pending_director" : "pending_principal";

      await updateDoc(doc(db, "faculty_leaves", leave.id), {
        hodStatus: "recommended",
        hodId: user.uid,
        hodName: facultyData.name,
        hodRemarks: remarks,
        hodActionDate: new Date().toISOString(),
        currentApprover: nextApprover,
        status: nextStatus,
      });

      // Send notification to faculty
      await addDoc(collection(db, "notifications"), {
        title: "Leave Recommended by HOD",
        message: `Your leave application (${leave.fromDate} to ${leave.toDate}) has been recommended by HOD ${facultyData.name}. ${leave.isLateSubmission ? "It has been forwarded to the Director (late submission)." : "It has been forwarded to the Principal."}`,
        type: "info",
        createdAt: new Date().toISOString(),
        read: false,
        targetUid: leave.facultyId,
        audience: [],
      });

      // Find the next approver and send notification + email
      if (leave.isLateSubmission) {
        // Find Director
        const directorQuery = query(
          collection(db, "faculty"),
          where("role", "==", "Director"),
        );
        const directorSnap = await getDocs(directorQuery);
        directorSnap.docs.forEach(async (d) => {
          const directorData = d.data();
          // In-app notification
          await addDoc(collection(db, "notifications"), {
            title: "Late Leave Escalated to You",
            message: `${leave.facultyName} (${leave.facultyDepartment}) leave application (${leave.fromDate} to ${leave.toDate}) - late submission, escalated after HOD recommendation.`,
            type: "warning",
            createdAt: new Date().toISOString(),
            read: false,
            targetUid: d.id,
            audience: [],
          });
          // Email notification
          try {
            await fetch("/api/leave-notification", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                toEmail: directorData.email,
                toName: directorData.name,
                facultyName: leave.facultyName,
                department: leave.facultyDepartment,
                leaveType: leave.type,
                fromDate: leave.fromDate,
                toDate: leave.toDate,
                days: leave.days,
                reason: leave.reason,
                isLateSubmission: true,
                type: "director_escalation",
                remarks,
              }),
            });
          } catch (e) {
            console.error("Failed to send director email:", e);
          }
        });
      } else {
        // Find Principal
        const principalQuery = query(
          collection(db, "faculty"),
          where("role", "==", "Principal"),
        );
        const principalSnap = await getDocs(principalQuery);
        principalSnap.docs.forEach(async (d) => {
          const principalData = d.data();
          // In-app notification
          await addDoc(collection(db, "notifications"), {
            title: "Leave Pending Your Approval",
            message: `${leave.facultyName} (${leave.facultyDepartment}) leave application (${leave.fromDate} to ${leave.toDate}) - recommended by HOD, awaiting your approval.`,
            type: "warning",
            createdAt: new Date().toISOString(),
            read: false,
            targetUid: d.id,
            audience: [],
          });
          // Email notification
          try {
            await fetch("/api/leave-notification", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                toEmail: principalData.email,
                toName: principalData.name,
                facultyName: leave.facultyName,
                department: leave.facultyDepartment,
                leaveType: leave.type,
                fromDate: leave.fromDate,
                toDate: leave.toDate,
                days: leave.days,
                reason: leave.reason,
                isLateSubmission: false,
                type: "hod_recommendation",
                remarks,
              }),
            });
          } catch (e) {
            console.error("Failed to send principal email:", e);
          }
        });
      }

      toast.success(`Leave recommended and forwarded to ${leave.isLateSubmission ? "Director" : "Principal"}`);
      setSelectedLeave(null);
      setRemarks("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to process");
    } finally {
      setProcessing(false);
    }
  };

  // HOD rejects a leave
  const handleHodReject = async (leave: LeaveApplication) => {
    if (!user || !facultyData) return;
    setProcessing(true);

    try {
      await updateDoc(doc(db, "faculty_leaves", leave.id), {
        hodStatus: "rejected",
        hodId: user.uid,
        hodName: facultyData.name,
        hodRemarks: remarks,
        hodActionDate: new Date().toISOString(),
        currentApprover: "none",
        status: "rejected",
        approvedBy: `Rejected by HOD ${facultyData.name}`,
      });

      // Refund balance
      await refundBalance(leave);

      // Notify faculty
      await addDoc(collection(db, "notifications"), {
        title: "Leave Rejected by HOD",
        message: `Your leave application (${leave.fromDate} to ${leave.toDate}) has been rejected by HOD ${facultyData.name}.${remarks ? ` Remarks: ${remarks}` : ""}`,
        type: "error",
        createdAt: new Date().toISOString(),
        read: false,
        targetUid: leave.facultyId,
        audience: [],
      });

      toast.success("Leave rejected");
      setSelectedLeave(null);
      setRemarks("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to process");
    } finally {
      setProcessing(false);
    }
  };

  // Principal approves a leave
  const handlePrincipalApprove = async (leave: LeaveApplication) => {
    if (!user || !facultyData) return;
    setProcessing(true);

    try {
      await updateDoc(doc(db, "faculty_leaves", leave.id), {
        principalStatus: "approved",
        principalId: user.uid,
        principalName: facultyData.name,
        principalRemarks: remarks,
        principalActionDate: new Date().toISOString(),
        currentApprover: "none",
        status: "approved",
        approvedBy: `Principal ${facultyData.name}`,
      });

      // Notify faculty
      await addDoc(collection(db, "notifications"), {
        title: "Leave Approved",
        message: `Your leave application (${leave.fromDate} to ${leave.toDate}) has been approved by Principal ${facultyData.name}.`,
        type: "success",
        createdAt: new Date().toISOString(),
        read: false,
        targetUid: leave.facultyId,
        audience: [],
      });

      // Email to faculty
      await sendFacultyEmail(leave, "approved", facultyData.name);

      toast.success("Leave approved");
      setSelectedLeave(null);
      setRemarks("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to process");
    } finally {
      setProcessing(false);
    }
  };

  // Principal rejects a leave
  const handlePrincipalReject = async (leave: LeaveApplication) => {
    if (!user || !facultyData) return;
    setProcessing(true);

    try {
      await updateDoc(doc(db, "faculty_leaves", leave.id), {
        principalStatus: "rejected",
        principalId: user.uid,
        principalName: facultyData.name,
        principalRemarks: remarks,
        principalActionDate: new Date().toISOString(),
        currentApprover: "none",
        status: "rejected",
        approvedBy: `Rejected by Principal ${facultyData.name}`,
      });

      await refundBalance(leave);

      await addDoc(collection(db, "notifications"), {
        title: "Leave Rejected by Principal",
        message: `Your leave application (${leave.fromDate} to ${leave.toDate}) has been rejected by Principal ${facultyData.name}.${remarks ? ` Remarks: ${remarks}` : ""}`,
        type: "error",
        createdAt: new Date().toISOString(),
        read: false,
        targetUid: leave.facultyId,
        audience: [],
      });

      await sendFacultyEmail(leave, "rejected", facultyData.name);

      toast.success("Leave rejected");
      setSelectedLeave(null);
      setRemarks("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to process");
    } finally {
      setProcessing(false);
    }
  };

  // Director approves a leave
  const handleDirectorApprove = async (leave: LeaveApplication) => {
    if (!user || !facultyData) return;
    setProcessing(true);

    try {
      await updateDoc(doc(db, "faculty_leaves", leave.id), {
        directorStatus: "approved",
        directorId: user.uid,
        directorName: facultyData.name,
        directorRemarks: remarks,
        directorActionDate: new Date().toISOString(),
        currentApprover: "none",
        status: "approved",
        approvedBy: `Director ${facultyData.name}`,
      });

      await addDoc(collection(db, "notifications"), {
        title: "Leave Approved by Director",
        message: `Your leave application (${leave.fromDate} to ${leave.toDate}) has been approved by Director ${facultyData.name}.`,
        type: "success",
        createdAt: new Date().toISOString(),
        read: false,
        targetUid: leave.facultyId,
        audience: [],
      });

      await sendFacultyEmail(leave, "approved", facultyData.name);

      toast.success("Leave approved");
      setSelectedLeave(null);
      setRemarks("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to process");
    } finally {
      setProcessing(false);
    }
  };

  // Director rejects a leave
  const handleDirectorReject = async (leave: LeaveApplication) => {
    if (!user || !facultyData) return;
    setProcessing(true);

    try {
      await updateDoc(doc(db, "faculty_leaves", leave.id), {
        directorStatus: "rejected",
        directorId: user.uid,
        directorName: facultyData.name,
        directorRemarks: remarks,
        directorActionDate: new Date().toISOString(),
        currentApprover: "none",
        status: "rejected",
        approvedBy: `Rejected by Director ${facultyData.name}`,
      });

      await refundBalance(leave);

      await addDoc(collection(db, "notifications"), {
        title: "Leave Rejected by Director",
        message: `Your leave application (${leave.fromDate} to ${leave.toDate}) has been rejected by Director ${facultyData.name}.${remarks ? ` Remarks: ${remarks}` : ""}`,
        type: "error",
        createdAt: new Date().toISOString(),
        read: false,
        targetUid: leave.facultyId,
        audience: [],
      });

      await sendFacultyEmail(leave, "rejected", facultyData.name);

      toast.success("Leave rejected");
      setSelectedLeave(null);
      setRemarks("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to process");
    } finally {
      setProcessing(false);
    }
  };

  // Helper: refund leave balance when rejected
  const refundBalance = async (leave: LeaveApplication) => {
    try {
      const balanceQuery = query(
        collection(db, "leave_balances"),
        where("facultyId", "==", leave.facultyId),
        where("code", "==", leave.type),
      );
      const balanceSnap = await getDocs(balanceQuery);
      if (!balanceSnap.empty) {
        const balanceDoc = balanceSnap.docs[0];
        const currentBalance = balanceDoc.data().balance || 0;
        await updateDoc(doc(db, "leave_balances", balanceDoc.id), {
          balance: currentBalance + leave.days,
        });
      }
    } catch (e) {
      console.error("Failed to refund balance:", e);
    }
  };

  // Helper: send email to faculty about approval/rejection
  const sendFacultyEmail = async (leave: LeaveApplication, action: string, actionByName: string) => {
    try {
      // Get faculty email
      const facultyDoc = await getDoc(doc(db, "faculty", leave.facultyId));
      if (!facultyDoc.exists()) return;
      const facultyEmail = facultyDoc.data().email;

      await fetch("/api/leave-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: facultyEmail,
          toName: leave.facultyName,
          facultyName: leave.facultyName,
          department: leave.facultyDepartment,
          leaveType: leave.type,
          fromDate: leave.fromDate,
          toDate: leave.toDate,
          days: leave.days,
          reason: leave.reason,
          isLateSubmission: leave.isLateSubmission,
          type: action,
          actionBy: actionByName,
          remarks,
        }),
      });
    } catch (e) {
      console.error("Failed to send faculty email:", e);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800";
      case "pending_hod": return "bg-yellow-100 text-yellow-800";
      case "pending_principal": return "bg-orange-100 text-orange-800";
      case "pending_director": return "bg-purple-100 text-purple-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "cancelled": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending_hod": return "Pending HOD";
      case "pending_principal": return "Pending Principal";
      case "pending_director": return "Pending Director";
      case "approved": return "Approved";
      case "rejected": return "Rejected";
      case "cancelled": return "Cancelled";
      default: return status;
    }
  };

  // Filter leaves based on selected filter
  const filteredLeaves = leaves.filter((l) => {
    if (filterStatus === "pending") {
      return l.status.startsWith("pending");
    }
    if (filterStatus === "all") return true;
    return l.status === filterStatus;
  });

  const pendingCount = leaves.filter((l) => l.status.startsWith("pending")).length;

  // Check if user has the right role
  const hasAccess = ["HOD", "Principal", "Director"].includes(getRole());

  if (loading)
    return (
      <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
        <div className="mb-6 md:mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );

  if (!hasAccess) {
    return (
      <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-500">
            Only HOD, Principal, and Director roles can access leave approvals.
          </p>
          <p className="text-gray-400 text-sm mt-1">Your current role: {getRole() || "Faculty"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-light text-gray-900">
            Leave Approvals
          </h1>
          <p className="text-gray-500 mt-2 font-light">
            {getRole() === "HOD"
              ? "Review and recommend leave applications from your department."
              : getRole() === "Principal"
                ? "Approve or reject leave applications recommended by HODs."
                : "Review escalated late submissions and approve/reject leaves."}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <h3 className="text-xs font-bold text-yellow-600 uppercase tracking-wide">Pending Action</h3>
            <p className="text-3xl font-light text-gray-900 mt-2">{pendingCount}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <h3 className="text-xs font-bold text-green-600 uppercase tracking-wide">Approved</h3>
            <p className="text-3xl font-light text-gray-900 mt-2">
              {leaves.filter((l) => l.status === "approved").length}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <h3 className="text-xs font-bold text-red-600 uppercase tracking-wide">Rejected</h3>
            <p className="text-3xl font-light text-gray-900 mt-2">
              {leaves.filter((l) => l.status === "rejected").length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {["pending", "approved", "rejected", "all"].map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`capitalize px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === f
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
            >
              {f} {f === "pending" ? `(${pendingCount})` : ""}
            </button>
          ))}
        </div>

        {/* Leave Applications */}
        <div className="space-y-4">
          {filteredLeaves.length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-gray-500 text-lg font-medium">No leave applications found</p>
              <p className="text-gray-400 text-sm mt-1">
                {filterStatus === "pending"
                  ? "No leaves pending your action."
                  : "Try changing the filter."}
              </p>
            </div>
          )}

          {filteredLeaves.map((leave) => (
            <div
              key={leave.id}
              className={`bg-white rounded-xl border p-5 hover:shadow-md transition-all ${leave.status.startsWith("pending") ? "border-l-4 border-l-blue-500 border-gray-200" : "border-gray-200"}`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-base font-semibold text-gray-900">{leave.facultyName}</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {leave.facultyDepartment}
                    </span>
                    {leave.isLateSubmission && (
                      <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                        Late Submission
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="text-gray-400">Type:</span> <span className="font-medium text-gray-900">{leave.type}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Days:</span> <span className="font-medium text-gray-900">{leave.days}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">From:</span> <span className="font-medium text-gray-900">{leave.fromDate}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">To:</span> <span className="font-medium text-gray-900">{leave.toDate}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="text-gray-400">Reason:</span> {leave.reason}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Applied: {leave.appliedDate}</p>

                  {/* Show approval trail */}
                  {leave.hodStatus === "recommended" && (
                    <p className="text-xs text-green-700 mt-1">
                      HOD {leave.hodName} recommended {leave.hodRemarks ? `- "${leave.hodRemarks}"` : ""}
                    </p>
                  )}
                  {leave.hodStatus === "rejected" && (
                    <p className="text-xs text-red-700 mt-1">
                      HOD {leave.hodName} rejected {leave.hodRemarks ? `- "${leave.hodRemarks}"` : ""}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(leave.status)}`}>
                    {getStatusLabel(leave.status)}
                  </span>

                  {/* Action buttons based on role and leave state */}
                  {leave.status.startsWith("pending") && (
                    <button
                      onClick={() => {
                        setSelectedLeave(leave);
                        setRemarks("");
                      }}
                      className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Take Action
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Modal */}
      {selectedLeave && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => { setSelectedLeave(null); setRemarks(""); }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {getRole() === "HOD" ? "Recommend / Reject Leave" : "Approve / Reject Leave"}
                </h3>
                <button onClick={() => { setSelectedLeave(null); setRemarks(""); }} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Leave summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">{selectedLeave.facultyName}</h4>
                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">{selectedLeave.facultyDepartment}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-400">Type:</span> {selectedLeave.type}</div>
                  <div><span className="text-gray-400">Days:</span> {selectedLeave.days}</div>
                  <div><span className="text-gray-400">From:</span> {selectedLeave.fromDate}</div>
                  <div><span className="text-gray-400">To:</span> {selectedLeave.toDate}</div>
                </div>
                <p className="text-sm text-gray-600"><span className="text-gray-400">Reason:</span> {selectedLeave.reason}</p>
                {selectedLeave.isLateSubmission && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                    <p className="text-xs text-amber-800 font-medium">
                      Late Submission - Applied after 8:30 AM of leave date
                      {getRole() === "Principal" && " (Your approval is disabled for late submissions)"}
                    </p>
                  </div>
                )}
              </div>

              {/* HOD recommendation trail (shown to Principal/Director) */}
              {selectedLeave.hodStatus === "recommended" && getRole() !== "HOD" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800 font-medium">HOD {selectedLeave.hodName} recommended this leave</p>
                  {selectedLeave.hodRemarks && (
                    <p className="text-xs text-green-700 mt-1">Remarks: {selectedLeave.hodRemarks}</p>
                  )}
                </div>
              )}

              {/* Remarks input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks (optional)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Add remarks..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {/* HOD actions */}
                {getRole() === "HOD" && selectedLeave.currentApprover === "hod" && (
                  <>
                    <button
                      onClick={() => handleHodRecommend(selectedLeave)}
                      disabled={processing}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      {processing ? "Processing..." : "Recommend"}
                    </button>
                    <button
                      onClick={() => handleHodReject(selectedLeave)}
                      disabled={processing}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {processing ? "Processing..." : "Reject"}
                    </button>
                  </>
                )}

                {/* Principal actions */}
                {getRole() === "Principal" && selectedLeave.currentApprover === "principal" && (
                  <>
                    {selectedLeave.isLateSubmission ? (
                      <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                        <p className="text-sm text-amber-800 font-medium">
                          Your approval is disabled for this late submission. It will be handled by the Director.
                        </p>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handlePrincipalApprove(selectedLeave)}
                          disabled={processing}
                          className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          {processing ? "Processing..." : "Approve"}
                        </button>
                        <button
                          onClick={() => handlePrincipalReject(selectedLeave)}
                          disabled={processing}
                          className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          {processing ? "Processing..." : "Reject"}
                        </button>
                      </>
                    )}
                  </>
                )}

                {/* Director actions */}
                {getRole() === "Director" && selectedLeave.currentApprover === "director" && (
                  <>
                    <button
                      onClick={() => handleDirectorApprove(selectedLeave)}
                      disabled={processing}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      {processing ? "Processing..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleDirectorReject(selectedLeave)}
                      disabled={processing}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {processing ? "Processing..." : "Reject"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
