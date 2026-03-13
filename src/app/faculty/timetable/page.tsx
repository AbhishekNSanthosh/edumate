"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import MarkAttendanceModal from "../../../widgets/Faculty/MarkAttendanceModal";
import toast from "react-hot-toast";
import { HiArrowsRightLeft } from "react-icons/hi2";

interface Slot {
  time: string;
  subject: string;
  batch: string;
  batchId?: string;
  department?: string;
  academicYear?: string;
  semester: string;
  room: string;
}

interface FacultyMember {
  id: string;
  name: string;
  department: string;
  designation?: string;
  email?: string;
}

interface SwapRequest {
  id: string;
  fromFacultyId: string;
  fromFacultyName: string;
  toFacultyId: string;
  toFacultyName: string;
  date: string;
  day: string;
  slot: Slot;
  reason: string;
  status: "pending" | "accepted" | "declined";
  createdAt: any;
}

type Day =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export default function TimetablePage() {
  const { user } = useAuth();

  // ── Faculty resolution ───────────────────────────────────────────────
  const [facultyDocName, setFacultyDocName] = useState<string>("");
  const [facultyDept, setFacultyDept] = useState<string>("");
  const [timetableLoading, setTimetableLoading] = useState(true);

  // ── Live schedule from Firestore: day → Slot[] ───────────────────────
  const [liveSchedule, setLiveSchedule] = useState<Record<Day, Slot[]>>(
    {} as Record<Day, Slot[]>
  );

  // State
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  ); // YYYY-MM-DD
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Swap State
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapSlot, setSwapSlot] = useState<Slot | null>(null);
  const [facultyList, setFacultyList] = useState<FacultyMember[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [swapReason, setSwapReason] = useState("");
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [showSwapRequests, setShowSwapRequests] = useState(false);
  const [markedSlots, setMarkedSlots] = useState<{subject: string, batch: string, slotTime: string}[]>([]);

  const daysOfWeek: Day[] = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // Identify the day of the week from the selected date
  const getDayFromDate = (dateStr: string): Day => {
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    return (daysOfWeek.includes(dayName as Day) ? dayName : "Monday") as Day;
  };

  const currentDayName = getDayFromDate(selectedDate);

  // Determine if Date is in Future
  const isFutureDate = (dateStr: string) => {
    const selected = new Date(dateStr);
    const today = new Date();
    selected.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return selected > today;
  };

  const canMarkAttendance = !isFutureDate(selectedDate);

  // ── Step 1: Resolve faculty name ────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const resolveName = async () => {
      try {
        // Try faculty collection by authUid first
        let snap = await getDocs(
          query(collection(db, "faculty"), where("authUid", "==", user.uid))
        );
        if (snap.empty) {
          snap = await getDocs(
            query(collection(db, "faculty"), where("email", "==", user.email))
          );
        }
        const data = snap.docs[0]?.data();
        const name = data?.name || user.displayName || "";
        setFacultyDocName(name);
        setFacultyDept(data?.department || "");
      } catch (err) {
        console.error("Faculty name resolution error:", err);
        setFacultyDocName(user.displayName || "");
      }
    };
    resolveName();
  }, [user]);

  // ── Step 2: Fetch timetable entries assigned to this faculty ─────────
  useEffect(() => {
    if (!facultyDocName) return;
    const fetchTimetables = async () => {
      setTimetableLoading(true);
      try {
        // Fetch batches to resolve batch names and semesters
        const batchesSnap = await getDocs(collection(db, "batches"));
        const batchesMap: Record<string, { name: string; semester: string; department: string; academicYear: string; id: string }> = {};
        batchesSnap.docs.forEach((d) => {
          batchesMap[d.id] = {
            name: d.data().name || d.id,
            semester: d.data().semester || "",
            department: d.data().department || "",
            academicYear: d.data().academicYear || d.data().batch || "",
            id: d.id,
          };
        });

        // Fetch timetables
        const snap = await getDocs(collection(db, "timetables"));
        const dayMap: Record<string, Slot[]> = {};

        snap.docs.forEach(docSnap => {
          const data = docSnap.data();
          const batchId = docSnap.id;
          const batchInfo = batchesMap[batchId] || { name: batchId, semester: "", department: "", academicYear: "", id: batchId };

          (data.entries || []).forEach((entry: any) => {
            // Match by faculty name (case-insensitive trim)
            if (
              (entry.faculty || "").trim().toLowerCase() ===
              facultyDocName.trim().toLowerCase()
            ) {
              const day = entry.day as Day;
              if (!dayMap[day]) dayMap[day] = [];
              dayMap[day].push({
                time: entry.time || "",
                subject: entry.subject || "",
                batch: batchInfo.name,
                batchId: batchInfo.id,
                department: batchInfo.department,
                academicYear: batchInfo.academicYear,
                semester: batchInfo.semester,
                room: entry.room || "",
              });
            }
          });
        });

        // Sort each day's slots by time
        (Object.keys(dayMap) as Day[]).forEach(day => {
          dayMap[day].sort((a, b) => a.time.localeCompare(b.time));
        });

        setLiveSchedule(dayMap as Record<Day, Slot[]>);
      } catch (err) {
        console.error("Timetable fetch error:", err);
        toast.error("Failed to load timetable");
      } finally {
        setTimetableLoading(false);
      }
    };
    fetchTimetables();
  }, [facultyDocName]);

  // Fetch faculty list for swap
  useEffect(() => {
    const fetchFaculty = async () => {
      if (!facultyDept) return;
      try {
        const q = query(
          collection(db, "faculty"),
          where("department", "==", facultyDept)
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: data.authUid || doc.id,
              name: data.name || data.displayName || "Unknown",
              department: data.department || "",
              designation: data.designation || "",
              email: data.email || data.contactEmail || "",
            };
          })
          .filter((f) => f.id !== user?.uid); // Exclude self
        setFacultyList(list);
      } catch (error) {
        console.error("Error fetching faculty list:", error);
      }
    };
    if (user && facultyDept) fetchFaculty();
  }, [user, facultyDept]);

  // Listen to swap requests (sent and received)
  useEffect(() => {
    if (!user) return;

    const q1 = query(
      collection(db, "swap_requests"),
      where("fromFacultyId", "==", user.uid),
    );
    const q2 = query(
      collection(db, "swap_requests"),
      where("toFacultyId", "==", user.uid),
    );

    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      const sent = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as SwapRequest,
      );
      setSwapRequests((prev) => {
        const received = prev.filter((r) => r.fromFacultyId !== user.uid);
        return [...received, ...sent].sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
        );
      });
    });

    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      const received = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as SwapRequest,
      );
      setSwapRequests((prev) => {
        const sent = prev.filter((r) => r.toFacultyId !== user.uid);
        return [...sent, ...received].sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
        );
      });
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user]);

  // --- Swap Check ---
  const acceptedSwapsForDate = swapRequests.filter(r => r.status === "accepted" && r.date === selectedDate);
  const getSwapAwayForDate = (time: string, subject: string) => acceptedSwapsForDate.find(r => r.slot.time === time && r.slot.subject === subject && r.fromFacultyId === user?.uid);
  const getSwapCoverForDate = (time: string, subject: string) => acceptedSwapsForDate.find(r => r.slot.time === time && r.slot.subject === subject && r.toFacultyId === user?.uid);

  // --- Attendance Check ---
  useEffect(() => {
    const fetchMarkedSlots = async () => {
      try {
        const q = query(collection(db, "attendance_sessions"), where("date", "==", selectedDate));
        const snap = await getDocs(q);
        const marked = snap.docs.map(d => ({
          subject: d.data().subject,
          batch: d.data().batch,
          slotTime: d.data().slotTime
        }));
        setMarkedSlots(marked);
      } catch (err) {
        console.error("Error fetching marked slots:", err);
      }
    };
    if (selectedDate) fetchMarkedSlots();
  }, [selectedDate]);

  const isSlotMarked = (slot: Slot) => markedSlots.some(m => m.subject === slot.subject && m.batch === slot.batch && m.slotTime === slot.time);

  // --- Build current schedule from live Firestore data ---
  const getMergedDailySchedule = () => {
    const baseSlots = [...(liveSchedule[currentDayName] || [])];
    
    // Inject any accepted slots WE ARE COVERING on this date
    const incoming = acceptedSwapsForDate.filter(r => r.toFacultyId === user?.uid);
    incoming.forEach(req => {
       if (!baseSlots.some(s => s.time === req.slot.time && s.subject === req.slot.subject)) {
          baseSlots.push(req.slot);
       }
    });

    return baseSlots.sort((a, b) => a.time.localeCompare(b.time));
  };
  
  const currentSchedule =
    viewMode === "daily"
      ? getMergedDailySchedule()
      : daysOfWeek.map(day => ({ day, slots: liveSchedule[day] || [] }));

  const handleMarkAttendanceClick = (slot: Slot) => {
    if (!canMarkAttendance) {
      alert("Cannot mark attendance for future dates.");
      return;
    }
    setSelectedSlot(slot);
    setIsModalOpen(true);
  };

  const handleSwapClick = (slot: Slot) => {
    setSwapSlot(slot);
    setSelectedFacultyId("");
    setSwapReason("");
    setIsSwapModalOpen(true);
  };

  const handleSwapSubmit = async () => {
    if (!selectedFacultyId || !swapReason.trim()) {
      toast.error("Please select a faculty member and provide a reason.");
      return;
    }
    if (!user || !swapSlot) return;

    const targetFaculty = facultyList.find((f) => f.id === selectedFacultyId);
    if (!targetFaculty) return;

    setSwapLoading(true);
    try {
      // 1. Create swap request in Firestore
      await addDoc(collection(db, "swap_requests"), {
        fromFacultyId: user.uid,
        fromFacultyName: user.displayName || "Faculty",
        toFacultyId: selectedFacultyId,
        toFacultyName: targetFaculty.name,
        date: selectedDate,
        day: currentDayName,
        slot: swapSlot,
        reason: swapReason.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // 2. Write push notification for target faculty
      await addDoc(collection(db, "notifications"), {
        type: "swap_request",
        targetUid: selectedFacultyId,
        title: "Class Swap Request",
        message: `${user.displayName || "A Faculty member"} has requested to swap ${swapSlot.subject} on ${currentDayName}, ${selectedDate} at ${swapSlot.time}.`,
        link: "/faculty/timetable",
        read: false,
        createdAt: serverTimestamp(),
      });

      // 3. Fetch target faculty email and send email notification
      try {
        const targetEmail = targetFaculty.email;
        if (targetEmail) {
          await fetch("/api/swap-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              toEmail: targetEmail,
              toName: targetFaculty.name,
              fromName: user.displayName || "Faculty",
              type: "request",
              subjectName: swapSlot.subject,
              day: currentDayName,
              date: selectedDate,
              time: swapSlot.time,
              batch: swapSlot.batch,
              room: swapSlot.room,
              reason: swapReason.trim(),
            }),
          });
        }
      } catch (emailErr) {
        console.warn("Email notification skipped:", emailErr);
      }

      toast.success(`Swap request sent to ${targetFaculty.name}`);
      setIsSwapModalOpen(false);
      setSwapSlot(null);
      setSelectedFacultyId("");
      setSwapReason("");
    } catch (error) {
      console.error("Error sending swap request:", error);
      toast.error("Failed to send swap request");
    } finally {
      setSwapLoading(false);
    }
  };

  const handleSwapResponse = async (
    requestId: string,
    response: "accepted" | "declined",
  ) => {
    try {
      // 1. Update swap request status
      await updateDoc(doc(db, "swap_requests", requestId), {
        status: response,
      });

      // 2. Find the swap request to get original sender info
      const req = swapRequests.find((r) => r.id === requestId);
      if (req && user) {
        // 3. Write push notification for the sender (fromFaculty)
        await addDoc(collection(db, "notifications"), {
          type: "swap_response",
          targetUid: req.fromFacultyId,
          title: response === "accepted" ? "Swap Request Accepted" : "Swap Request Declined",
          message: `${user.displayName || req.toFacultyName} has ${response} your swap request for ${req.slot.subject} on ${req.day}, ${req.date}.`,
          link: "/faculty/timetable",
          read: false,
          createdAt: serverTimestamp(),
        });

        // 4. Send email to the original requester
        try {
          const senderQ = query(collection(db, "faculty"), where("authUid", "==", req.fromFacultyId));
          const senderSnap = await getDocs(senderQ);
          const senderEmail = senderSnap.empty ? "" : (senderSnap.docs[0].data().email || "");
          if (senderEmail) {
            await fetch("/api/swap-notification", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                toEmail: senderEmail,
                toName: req.fromFacultyName,
                fromName: user.displayName || req.toFacultyName,
                type: response,
                subjectName: req.slot.subject,
                day: req.day,
                date: req.date,
                time: req.slot.time,
                batch: req.slot.batch,
                room: req.slot.room,
                reason: req.reason,
              }),
            });
          }
        } catch (emailErr) {
          console.warn("Email notification skipped:", emailErr);
        }
      }

      toast.success(
        `Swap request ${response === "accepted" ? "accepted" : "declined"}`,
      );
    } catch (error) {
      console.error("Error updating swap request:", error);
      toast.error("Failed to update swap request");
    }
  };

  const pendingIncoming = swapRequests.filter(
    (r) => r.toFacultyId === user?.uid && r.status === "pending",
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "accepted":
        return "bg-green-100 text-green-800 border-green-200";
      case "declined":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Quick Action Toolbar
  const Toolbar = () => (
    <div className="bg-white p-4 mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border border-gray-200 rounded-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
        {/* Date Picker */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-500 uppercase">
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="mt-1 px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Day Indicator */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-500 uppercase">
            Day
          </label>
          <span className="mt-1 font-medium text-gray-900">
            {currentDayName}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setViewMode("daily")}
          className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors border ${
            viewMode === "daily"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
          }`}
        >
          Daily View
        </button>
        <button
          onClick={() => setViewMode("weekly")}
          className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors border ${
            viewMode === "weekly"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
          }`}
        >
          Weekly View
        </button>
        <button
          onClick={() => setShowSwapRequests(!showSwapRequests)}
          className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors flex items-center gap-2 border ${
            showSwapRequests
              ? "bg-orange-600 text-white border-orange-600"
              : "bg-white text-orange-700 border border-orange-200 hover:bg-orange-50"
          }`}
        >
          <HiArrowsRightLeft className="text-lg" />
          Swap Requests
          {pendingIncoming.length > 0 && (
            <span className="ml-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
              {pendingIncoming.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-light text-gray-900">
            Faculty Timetable
          </h1>
          <p className="text-gray-600 mt-1 font-light">
            Manage your teaching schedule and student attendance.
          </p>
        </div>

        {/* Toolbar */}
        <Toolbar />

        {/* Swap Requests Panel */}
        {showSwapRequests && (
          <div className="bg-white border text-sm mb-6 rounded-sm border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <HiArrowsRightLeft className="text-orange-600" />
                Swap Requests
              </h2>
            </div>

            {swapRequests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No swap requests yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Faculty
                      </th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Slot Details
                      </th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Reason
                      </th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {swapRequests.map((req) => {
                      const isSent = req.fromFacultyId === user?.uid;
                      return (
                        <tr key={req.id} className="hover:bg-gray-50">
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                isSent
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-purple-100 text-purple-700"
                              }`}
                            >
                              {isSent ? "Sent" : "Received"}
                            </span>
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {isSent ? req.toFacultyName : req.fromFacultyName}
                          </td>
                          <td className="px-4 md:px-6 py-4 text-sm text-gray-600">
                            <div className="font-medium">
                              {req.slot.subject}
                            </div>
                            <div className="text-xs text-gray-400">
                              {req.day}, {req.date} | {req.slot.time}
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">
                            {req.reason}
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${getStatusBadge(req.status)}`}
                            >
                              {req.status}
                            </span>
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                            {!isSent && req.status === "pending" ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    handleSwapResponse(req.id, "accepted")
                                  }
                                  className="px-3 py-1.5 bg-green-600 text-white rounded-sm text-xs font-medium hover:bg-green-700 transition-colors"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() =>
                                    handleSwapResponse(req.id, "declined")
                                  }
                                  className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-sm text-xs font-medium hover:bg-red-100 transition-colors"
                                >
                                  Decline
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">
                                {isSent ? "Awaiting response" : "--"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Schedule Display */}
        <div className="bg-white border rounded-sm border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h2 className="text-base md:text-lg font-medium text-gray-900">
              {viewMode === "daily" ? (
                <>
                 Schedule for{" "}
                 <span className="font-semibold">
                   {new Date(selectedDate).toLocaleDateString("en-US", {
                     day: "numeric",
                     month: "long",
                     year: "numeric",
                   })}
                 </span>
                </>
              ) : (
                <>Weekly Schedule Overview</>
              )}
            </h2>
            {!canMarkAttendance && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full border border-yellow-200">
                Future Date - Read Only
              </span>
            )}
          </div>

          {viewMode === "daily" ? (
            currentSchedule.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Time Slot
                      </th>
                      <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                      <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {(currentSchedule as Slot[]).map(
                      (slot: Slot, index: number) => {
                        const swapAwayReq = getSwapAwayForDate(slot.time, slot.subject);
                        const swapCoverReq = getSwapCoverForDate(slot.time, slot.subject);
                        const swappedAway = !!swapAwayReq;
                        const covering = !!swapCoverReq;
                        const swapInfo = swappedAway 
                          ? `Swapped to ${swapAwayReq.toFacultyName}` 
                          : covering 
                          ? `Covering for ${swapCoverReq.fromFacultyName}` 
                          : null;
                        const marked = isSlotMarked(slot);
                        return (
                        <tr
                          key={index}
                          className={`hover:bg-gray-50 transition-colors group ${swappedAway ? "bg-orange-50/50" : covering ? "bg-blue-50/50" : ""}`}
                        >
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                            {slot.time}
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {slot.subject}
                            </div>
                            {swapInfo && (
                               <div className={`text-xs font-semibold mt-1 ${swappedAway ? "text-orange-600" : "text-blue-600"}`}>
                                 {swapInfo}
                               </div>
                            )}
                            {marked && !swappedAway && (
                               <div className="text-xs font-semibold text-green-600 mt-1">
                                 ✓ Attendance Marked
                               </div>
                            )}
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {slot.batch}
                            </div>
                            <div className="text-xs text-gray-500">
                              {slot.semester} Semester
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <div className="px-2 py-0.5 bg-gray-100 rounded text-xs border border-gray-200 inline-block">
                              {slot.room}
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleMarkAttendanceClick(slot)}
                                disabled={!canMarkAttendance || swappedAway}
                                className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors border
                                  ${
                                    canMarkAttendance && !swappedAway
                                      ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                                      : "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                                  }
                                `}
                              >
                                {marked ? "Marked ✓" : canMarkAttendance ? "Mark Attendance" : "N/A"}
                              </button>
                              <button
                                onClick={() => handleSwapClick(slot)}
                                disabled={swappedAway || covering || marked}
                                className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors border flex items-center gap-1 ${
                                   swappedAway || covering || marked ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                <HiArrowsRightLeft className="text-sm" />
                                Swap
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="mb-4 text-4xl opacity-20 grayscale">📅</div>
                <h3 className="text-lg font-medium text-gray-900">
                  No classes scheduled
                </h3>
                <p className="text-gray-500 font-light">Enjoy your free day!</p>
              </div>
            )
          ) : (
            <div className="p-4 md:p-6 overflow-x-auto">
               <div className="grid grid-cols-6 gap-4 min-w-[800px]">
                 {(currentSchedule as {day: string, slots: Slot[]}[]).map((dayGroup, idx) => (
                    <div key={idx} className="flex flex-col gap-2">
                       <div className="font-bold text-gray-700 border-b pb-2 text-sm uppercase tracking-wide bg-gray-50 p-2 rounded text-center">
                          {dayGroup.day}
                       </div>
                       {dayGroup.slots.length > 0 ? (
                          dayGroup.slots.map((s, i) => (
                            <div key={i} className="bg-blue-50/50 border border-blue-100 p-3 rounded-xl flex flex-col gap-1 shadow-sm">
                               <span className="text-xs font-bold text-blue-700 bg-blue-100 max-w-max px-2 py-0.5 rounded">{s.time}</span>
                               <span className="text-sm font-semibold text-gray-900 mt-1">{s.subject}</span>
                               <span className="text-xs text-gray-600 truncate">{s.batch}</span>
                               <span className="text-xs text-gray-400">Room: {s.room}</span>
                            </div>
                          ))
                       ) : (
                          <div className="flex items-center justify-center p-4 h-24 border border-dashed border-gray-200 rounded-xl bg-gray-50/50 text-xs text-gray-400 font-medium">
                            No Classes
                          </div>
                       )}
                    </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Attendance Modal */}
      {isModalOpen && selectedSlot && user && (
        <MarkAttendanceModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          batch={selectedSlot.batch}
          batchId={selectedSlot.batchId}
          department={selectedSlot.department}
          academicYear={selectedSlot.academicYear}
          subject={selectedSlot.subject}
          date={new Date(selectedDate)}
          slotTime={selectedSlot.time}
          facultyId={user.uid}
        />
      )}

      {/* Swap Request Modal */}
      {isSwapModalOpen && swapSlot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-sm border border-gray-200 p-6 w-[90%] max-w-lg shadow-none animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <HiArrowsRightLeft className="text-orange-600" />
                Request Class Swap
              </h3>
              <button
                onClick={() => setIsSwapModalOpen(false)}
                className="p-1 rounded-sm hover:bg-gray-100 transition-colors text-gray-500"
              >
                ✕
              </button>
            </div>

            {/* Slot Info */}
            <div className="bg-gray-50 rounded-sm p-4 mb-5 border border-gray-200">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-2">
                Class to Swap
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Subject:</span>{" "}
                  <span className="font-medium text-gray-900">
                    {swapSlot.subject}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Time:</span>{" "}
                  <span className="font-medium text-gray-900">
                    {swapSlot.time}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Batch:</span>{" "}
                  <span className="font-medium text-gray-900">
                    {swapSlot.batch}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Room:</span>{" "}
                  <span className="font-medium text-gray-900">
                    {swapSlot.room}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                {currentDayName}, {selectedDate}
              </div>
            </div>

            {/* Select Faculty */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Select Faculty to Swap With
              </label>
              <select
                value={selectedFacultyId}
                onChange={(e) => setSelectedFacultyId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
              >
                <option value="">-- Choose Faculty --</option>
                {facultyList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                    {f.department ? ` (${f.department})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Reason */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reason for Swap
              </label>
              <textarea
                value={swapReason}
                onChange={(e) => setSwapReason(e.target.value)}
                placeholder="e.g., Medical appointment, personal emergency, conference attendance..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsSwapModalOpen(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-sm border border-gray-200 hover:bg-gray-200 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSwapSubmit}
                disabled={
                  swapLoading || !selectedFacultyId || !swapReason.trim()
                }
                className="flex-1 px-4 py-2.5 bg-orange-600 text-white font-medium rounded-sm hover:bg-orange-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {swapLoading ? (
                  "Sending..."
                ) : (
                  <>
                    <HiArrowsRightLeft />
                    Send Swap Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
