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
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import MarkAttendanceModal from "../../../widgets/Faculty/MarkAttendanceModal";
import toast from "react-hot-toast";
import { HiArrowsRightLeft } from "react-icons/hi2";

interface Slot {
  time: string;
  subject: string;
  batch: string;
  semester: string;
  room: string;
}

interface FacultyMember {
  id: string;
  name: string;
  department: string;
  designation?: string;
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

  // Fetch faculty list for swap
  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        const snapshot = await getDocs(collection(db, "faculty_profiles"));
        const list = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            name: doc.data().displayName || doc.data().name || "Unknown",
            department: doc.data().department || "",
            designation: doc.data().designation || "",
          }))
          .filter((f) => f.id !== user?.uid); // Exclude self
        setFacultyList(list);
      } catch (error) {
        console.error("Error fetching faculty list:", error);
      }
    };
    if (user) fetchFaculty();
  }, [user]);

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
          (a, b) =>
            (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
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
          (a, b) =>
            (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
        );
      });
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user]);

  // --- Static Schedule Data (Replace with API call in future) ---
  const schedule = {
    daily: {
      Monday: [
        {
          time: "09:00 AM - 10:30 AM",
          subject: "Data Structures (CS-301)",
          batch: "CSE 2022-26",
          semester: "4th",
          room: "Lab 101",
        },
        {
          time: "11:00 AM - 12:30 PM",
          subject: "Algorithms (CS-302)",
          batch: "CSE 2023-27",
          semester: "3rd",
          room: "Room 205",
        },
        {
          time: "02:00 PM - 03:30 PM",
          subject: "Web Development (CS-305)",
          batch: "CSE 2022-26",
          semester: "4th",
          room: "Lab 102",
        },
      ],
      Tuesday: [
        {
          time: "09:00 AM - 10:30 AM",
          subject: "OS (CS-304)",
          batch: "CSE 2022-26",
          semester: "4th",
          room: "Lab 101",
        },
      ],
      Wednesday: [],
      Thursday: [
        {
          time: "09:00 AM - 10:00 AM",
          subject: "Network Security",
          batch: "CSE 2021-25",
          semester: "6th",
          room: "Hall A",
        },
      ],
      Friday: [
        {
          time: "02:00 PM - 04:00 PM",
          subject: "Project Lab",
          batch: "CSE 2021-25",
          semester: "8th",
          room: "Lab 202",
        },
      ],
      Saturday: [],
    } as Record<Day, Slot[]>,
    weekly: daysOfWeek.map((day) => ({
      day,
      slots: [
        {
          time: "09:00 - 10:30",
          subject: "Data Structures",
          batch: "CSE 2022",
          semester: "4th",
          room: "101",
        },
      ],
    })),
  };

  const currentSchedule =
    viewMode === "daily"
      ? schedule.daily[currentDayName] || []
      : schedule.weekly;

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
      await updateDoc(doc(db, "swap_requests", requestId), {
        status: response,
      });
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
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border border-gray-100">
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
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === "daily"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Daily View
        </button>
        <button
          onClick={() => alert("Weekly view is read-only for overview.")}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors opacity-50 cursor-not-allowed bg-gray-100 text-gray-600"
        >
          Weekly View
        </button>
        <button
          onClick={() => setShowSwapRequests(!showSwapRequests)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            showSwapRequests
              ? "bg-orange-600 text-white"
              : "bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100"
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
          <div className="bg-white rounded-xl border border-orange-200 mb-6 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-orange-100 bg-orange-50/30">
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
                                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() =>
                                    handleSwapResponse(req.id, "declined")
                                  }
                                  className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
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
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h2 className="text-base md:text-lg font-medium text-gray-900">
              Schedule for{" "}
              <span className="font-semibold">
                {new Date(selectedDate).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
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
                      (slot: Slot, index: number) => (
                        <tr
                          key={index}
                          className="hover:bg-gray-50 transition-colors group"
                        >
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                            {slot.time}
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {slot.subject}
                            </div>
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
                                onClick={() =>
                                  handleMarkAttendanceClick(slot)
                                }
                                disabled={!canMarkAttendance}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border
                                  ${
                                    canMarkAttendance
                                      ? "bg-blue-600 text-white hover:bg-blue-700 border-transparent"
                                      : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                  }
                                `}
                              >
                                {canMarkAttendance
                                  ? "Mark Attendance"
                                  : "N/A"}
                              </button>
                              <button
                                onClick={() => handleSwapClick(slot)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 flex items-center gap-1"
                              >
                                <HiArrowsRightLeft className="text-sm" />
                                Swap
                              </button>
                            </div>
                          </td>
                        </tr>
                      ),
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
                <p className="text-gray-500 font-light">
                  Enjoy your free day!
                </p>
              </div>
            )
          ) : (
            <div className="p-8 text-center text-gray-500 font-light">
              Weekly view coming soon (Use Daily view to mark attendance)
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
          subject={selectedSlot.subject}
          date={new Date(selectedDate)}
          slotTime={selectedSlot.time}
          facultyId={user.uid}
        />
      )}

      {/* Swap Request Modal */}
      {isSwapModalOpen && swapSlot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <HiArrowsRightLeft className="text-orange-600" />
                Request Class Swap
              </h3>
              <button
                onClick={() => setIsSwapModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
              >
                ✕
              </button>
            </div>

            {/* Slot Info */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-100">
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsSwapModalOpen(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSwapSubmit}
                disabled={swapLoading || !selectedFacultyId || !swapReason.trim()}
                className="flex-1 px-4 py-2.5 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
