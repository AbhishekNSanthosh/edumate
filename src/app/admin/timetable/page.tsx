"use client";
import React, { useState, useEffect } from "react";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import Skeleton from "../../../common/components/Skeleton";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiX,
  FiClock,
  FiCalendar,
  FiBookOpen,
  FiUser,
  FiMapPin,
  FiSettings,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

// Helper Component for Time Range Picker
const TimeRangePicker = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) => {
  const parseRange24h = (rangeStr: string) => {
    if (!rangeStr || !rangeStr.includes(" - ")) return { start: "", end: "" };
    const [start12, end12] = rangeStr.split(" - ");
    const to24h = (t12: string) => {
      const parts = t12.trim().split(" ");
      if (parts.length !== 2) return "";
      const [time, ampm] = parts;
      let [h, m] = time.split(":");
      if (!h || !m) return "";
      let hours = parseInt(h, 10);
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, "0")}:${m}`;
    };
    return { start: to24h(start12), end: to24h(end12) };
  };

  const { start, end } = parseRange24h(value);

  const handleTimeChange = (type: "start" | "end", newTime24: string) => {
    const to12h = (t24: string) => {
      if (!t24) return "";
      const [h, m] = t24.split(":");
      let hours = parseInt(h, 10);
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      return `${hours.toString().padStart(2, "0")}:${m} ${ampm}`;
    };

    let newStart =
      type === "start" ? to12h(newTime24) : value.split(" - ")[0] || "";
    let newEnd =
      type === "end" ? to12h(newTime24) : value.split(" - ")[1] || "";

    if (newStart && !newEnd) newEnd = newStart;
    if (!newStart && newEnd) newStart = newEnd;

    onChange(
      newStart && newEnd ? `${newStart} - ${newEnd}` : "09:00 AM - 10:00 AM",
    );
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2 flex-grow min-w-[200px]">
      <input
        type="time"
        value={start}
        onChange={(e) => handleTimeChange("start", e.target.value)}
        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-medium outline-none focus:border-blue-500 transition-all text-slate-700 w-full"
      />
      <span className="text-slate-400 font-medium">-</span>
      <input
        type="time"
        value={end}
        onChange={(e) => handleTimeChange("end", e.target.value)}
        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-medium outline-none focus:border-blue-500 transition-all text-slate-700 w-full"
      />
    </div>
  );
};

// Default standard schedule that can be customized
const DEFAULT_TIMINGS = [
  { id: "t1", time: "09:30 AM - 10:30 AM", type: "class" },
  { id: "t2", time: "10:30 AM - 11:30 AM", type: "class" },
  {
    id: "t-break-1",
    time: "11:30 AM - 11:45 AM",
    type: "interval",
    label: "Short Break",
  },
  { id: "t3", time: "11:45 AM - 12:45 PM", type: "class" },
  {
    id: "t-lunch",
    time: "12:45 PM - 01:30 PM",
    type: "interval",
    label: "Lunch Break",
  },
  { id: "t4", time: "01:30 PM - 02:30 PM", type: "class" },
  { id: "t5", time: "02:30 PM - 03:30 PM", type: "class" },
  { id: "t6", time: "03:30 PM - 04:30 PM", type: "class" },
];

const SATURDAY_TIMINGS = [
  { id: "s1", time: "09:30 AM - 10:30 AM", type: "class" },
  { id: "s2", time: "10:30 AM - 11:30 AM", type: "class" },
  {
    id: "s-break-1",
    time: "11:30 AM - 11:45 AM",
    type: "interval",
    label: "Short Break",
  },
  { id: "s3", time: "11:45 AM - 12:45 PM", type: "class" },
];

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const WEEKEND = ["Saturday"];
const ALL_DAYS = [...WEEKDAYS, ...WEEKEND];

export default function TimetablePage() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);

  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [timetableEntries, setTimetableEntries] = useState<any[]>([]);

  const [timings, setTimings] = useState(DEFAULT_TIMINGS);
  const [saturdayTimings, setSaturdayTimings] = useState(SATURDAY_TIMINGS);
  const [isTimingModalOpen, setIsTimingModalOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    day: "Monday",
    time: DEFAULT_TIMINGS[0].time,
    subject: "",
    faculty: "",
    room: "",
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [bSnap, sSnap, fSnap] = await Promise.all([
          getDocs(collection(db, "batches")),
          getDocs(collection(db, "subjects")),
          getDocs(collection(db, "faculty")),
        ]);

        const bList = bSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const sList = sSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const fList = fSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        setBatches(bList);
        setSubjects(sList);
        setFaculty(fList);

        if (bList.length > 0) {
          setSelectedBatchId(bList[0].id);
        }
        setLoading(false);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load metadata");
        setLoading(false);
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (!selectedBatchId) return;

    const unsub = onSnapshot(
      doc(db, "timetables", selectedBatchId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTimetableEntries(data.entries || []);
          if (data.timings) setTimings(data.timings);
          if (data.saturdayTimings) setSaturdayTimings(data.saturdayTimings);
        } else {
          setTimetableEntries([]);
          setTimings(DEFAULT_TIMINGS);
          setSaturdayTimings(SATURDAY_TIMINGS);
        }
      },
    );
    return () => unsub();
  }, [selectedBatchId]);

  const saveTimings = async (newTimings: any[], newSatTimings: any[]) => {
    try {
      await setDoc(
        doc(db, "timetables", selectedBatchId),
        {
          timings: newTimings,
          saturdayTimings: newSatTimings,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      setTimings(newTimings);
      setSaturdayTimings(newSatTimings);
      toast.success("Timings updated successfully");
      setIsTimingModalOpen(false);
    } catch (error) {
      toast.error("Failed to update timings");
    }
  };

  const saveTimetableEntry = async () => {
    if (!formData.subject || !formData.faculty) {
      toast.error("Subject and Faculty are required");
      return;
    }

    try {
      const newEntry = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        status: "scheduled",
        published: true,
      };

      const conflict = timetableEntries.find(
        (e) => e.day === formData.day && e.time === formData.time,
      );
      if (conflict) {
        if (!confirm("A class is already scheduled at this time. Overwrite?"))
          return;
      }

      const updatedEntries = conflict
        ? timetableEntries.map((e) => (e.id === conflict.id ? newEntry : e))
        : [...timetableEntries, newEntry];

      await setDoc(
        doc(db, "timetables", selectedBatchId),
        {
          batchId: selectedBatchId,
          entries: updatedEntries,
          timings: timings,
          saturdayTimings: saturdayTimings,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      toast.success("Class added successfully");
      setIsModalOpen(false);
      setFormData({
        day: "Monday",
        time: timings[0].time,
        subject: "",
        faculty: "",
        room: "",
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to save class");
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!confirm("Remove this class scheduling?")) return;
    try {
      const updated = timetableEntries.filter((e) => e.id !== entryId);
      await setDoc(
        doc(db, "timetables", selectedBatchId),
        {
          entries: updated,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      toast.success("Class removed");
    } catch (error) {
      toast.error("Failed to remove class");
    }
  };

  const getEntryForSlot = (day: string, time: string) => {
    return timetableEntries.find((e) => e.day === day && e.time === time);
  };

  const selectedBatchName =
    batches.find((b) => b.id === selectedBatchId)?.name || "Batch";

  const renderTimetableGrid = (days: string[], timeSlots: any[]) => (
    <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto mb-8">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10">
          <tr>
            <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-40 border-r border-slate-200">
              <div className="flex items-center gap-2">
                <FiClock className="w-4 h-4" /> Time Slot
              </div>
            </th>
            {days.map((day) => (
              <th
                key={day}
                className="px-5 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[160px]"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {timeSlots.map((slot) => {
            if (slot.type === "interval") {
              return (
                <tr key={slot.id} className="bg-slate-50/50">
                  <td className="px-5 py-3 whitespace-nowrap text-xs font-medium text-slate-600 border-r border-slate-200">
                    {slot.time}
                  </td>
                  <td
                    colSpan={days.length}
                    className="px-5 py-3 text-center text-sm font-medium text-slate-500 tracking-wide uppercase bg-stripes bg-stripes-slate-100"
                  >
                    {slot.label || "Break"}
                  </td>
                </tr>
              );
            }

            return (
              <tr
                key={slot.id}
                className="hover:bg-slate-50/30 transition-colors"
              >
                <td className="px-5 py-4 whitespace-nowrap text-xs font-medium text-slate-700 border-r border-slate-200">
                  {slot.time}
                </td>
                {days.map((day) => {
                  const entry = getEntryForSlot(day, slot.time);
                  return (
                    <td
                      key={day + slot.time}
                      className="px-3 py-3 text-center border-l border-slate-100 relative group h-28 align-top"
                    >
                      {entry ? (
                        <div
                          tabIndex={0}
                          className={`w-full h-full p-3 rounded-xl flex flex-col justify-between text-left transition-all duration-200 border outline-none focus:ring-2 focus:ring-blue-400 group/card ${
                            entry.status === "conflict"
                              ? "bg-red-50/80 border-red-200"
                              : "bg-blue-50/80 border-blue-200/60 hover:border-blue-300"
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-slate-800 text-sm mb-1 line-clamp-2">
                              {entry.subject}
                            </div>
                            <div className="text-slate-600 text-xs flex items-center gap-1.5 mb-1">
                              <FiUser className="w-3 h-3 shrink-0" />
                              <span className="truncate">{entry.faculty}</span>
                            </div>
                            {entry.room && (
                              <div className="text-slate-500 text-xs flex items-center gap-1.5 w-full">
                                <FiMapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{entry.room}</span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="mt-2 w-full py-1.5 bg-white text-red-600 text-xs font-medium rounded-lg border border-red-100 hover:bg-red-50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 group-hover/card:opacity-100 focus-within:opacity-100 transition-all duration-200 shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                day,
                                time: slot.time,
                              }));
                              setIsModalOpen(true);
                            }}
                            className="flex flex-col items-center justify-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/50 rounded-xl w-full h-full min-h-[5rem] transition-colors"
                          >
                            <FiPlus className="w-5 h-5" />
                            <span>Assign Class</span>
                          </button>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (loading)
    return (
      <div className="p-4 md:p-8 bg-[#f8fafc] min-h-screen">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-5 w-96 mb-8" />
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200 bg-slate-50">
            <div className="w-40 border-r border-slate-200 p-4">
              <Skeleton className="h-4 w-24" />
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-1 p-4 border-l border-slate-100">
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>
          {[...Array(6)].map((_, r) => (
            <div key={r} className="flex border-b border-slate-100">
              <div className="w-40 border-r border-slate-200 p-4 flex items-center">
                <Skeleton className="h-4 w-20" />
              </div>
              {[...Array(5)].map((_, c) => (
                <div key={c} className="flex-1 p-3 border-l border-slate-100">
                  <Skeleton className="h-20 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div className="p-4 md:p-8 bg-[#f8fafc] min-h-screen font-sans">
      <div className="max-w-[1400px] mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Timetable Management
            </h1>
            <p className="text-slate-500 mt-2 text-sm max-w-xl">
              Design and manage weekly schedules, configure custom timings, and
              assign classes for different batches effortlessly.
            </p>
          </div>

          <div className="w-full md:w-72 bg-white p-2 rounded-xl border border-slate-200 flex items-center">
            <div className="pl-3 pr-2 text-slate-400">
              <FiCalendar className="w-5 h-5" />
            </div>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full bg-transparent py-2 pr-4 text-slate-700 font-medium focus:outline-none appearance-none cursor-pointer"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <FiBookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-slate-800">
                Schedule:{" "}
                <span className="text-blue-600">{selectedBatchName}</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Auto-saves implicitly
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setIsTimingModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-700 font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-sm"
            >
              <FiSettings className="w-4 h-4" />
              Adjust Timings
            </button>
            <button
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  day: "Monday",
                  time: timings[0]?.time || "09:30 AM - 10:30 AM",
                }));
                setIsModalOpen(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all text-sm"
            >
              <FiPlus className="w-4 h-4" />
              Add Class
            </button>
          </div>
        </div>

        {/* Regular Weekdays Grid */}
        <div className="mb-4 flex items-center gap-2 px-1">
          <h3 className="text-lg font-bold text-slate-800">Weekday Schedule</h3>
          <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-600 text-xs font-medium">
            Mon - Fri
          </span>
        </div>
        {renderTimetableGrid(WEEKDAYS, timings)}

        {/* Saturday Grid */}
        <div className="mb-4 mt-12 flex items-center gap-2 px-1">
          <h3 className="text-lg font-bold text-slate-800">Weekend Schedule</h3>
          <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
            Saturday (Special)
          </span>
        </div>
        {renderTimetableGrid(WEEKEND, saturdayTimings)}

        {/* Add Class Modal - Updated with Theme & Blur */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => setIsModalOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 overflow-hidden"
              >
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <FiPlus className="w-5 h-5" />
                    </div>
                    Assign New Class
                  </h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5 bg-slate-50/30">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Day
                      </label>
                      <select
                        className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none transition-all"
                        value={formData.day}
                        onChange={(e) =>
                          setFormData({ ...formData, day: e.target.value })
                        }
                      >
                        {ALL_DAYS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Time Slot
                      </label>
                      <select
                        className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none transition-all"
                        value={formData.time}
                        onChange={(e) =>
                          setFormData({ ...formData, time: e.target.value })
                        }
                      >
                        {(formData.day === "Saturday"
                          ? saturdayTimings
                          : timings
                        )
                          .filter((t) => t.type !== "interval")
                          .map((t) => (
                            <option key={t.id} value={t.time}>
                              {t.time}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Subject
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <FiBookOpen className="w-4 h-4" />
                      </div>
                      <select
                        className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl pl-10 pr-4 py-2.5 focus:border-blue-500 outline-none transition-all appearance-none"
                        value={formData.subject}
                        onChange={(e) =>
                          setFormData({ ...formData, subject: e.target.value })
                        }
                      >
                        <option value="" disabled>
                          Select Subject
                        </option>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Faculty
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <FiUser className="w-4 h-4" />
                      </div>
                      <select
                        className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl pl-10 pr-4 py-2.5 focus:border-blue-500 outline-none transition-all appearance-none"
                        value={formData.faculty}
                        onChange={(e) =>
                          setFormData({ ...formData, faculty: e.target.value })
                        }
                      >
                        <option value="" disabled>
                          Select Faculty
                        </option>
                        {faculty.map((f) => (
                          <option key={f.id} value={f.name}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Room / Lab{" "}
                      <span className="text-slate-400 font-normal">
                        (Optional)
                      </span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <FiMapPin className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl pl-10 pr-4 py-2.5 focus:border-blue-500 outline-none transition-all"
                        placeholder="e.g. Lab 101, Main Block"
                        value={formData.room}
                        onChange={(e) =>
                          setFormData({ ...formData, room: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200/50 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveTimetableEntry}
                    disabled={!formData.subject || !formData.faculty}
                    className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Save Assignment
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Adjust Timings Modal placeholder - minimal functional implementation */}
        <AnimatePresence>
          {isTimingModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => setIsTimingModalOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
              >
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <FiSettings className="w-5 h-5 text-blue-600" />
                    Configure Timings & Intervals
                  </h2>
                  <button
                    onClick={() => setIsTimingModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
                  <div className="mb-4 bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100 flex gap-3 items-start">
                    <FiSettings className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>
                      You can adjust, add, or remove timings here. Changes apply
                      exclusively to <strong>{selectedBatchName}</strong>. You
                      can define intervals like breaks.
                    </p>
                  </div>

                  <p className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wider">
                    Weekday Timings
                  </p>
                  <div className="space-y-3 mb-8">
                    {timings.map((t, i) => (
                      <div
                        key={t.id}
                        className="flex flex-wrap lg:flex-nowrap gap-3 items-center bg-white p-3 rounded-xl border border-slate-200"
                      >
                        <select
                          value={t.type}
                          onChange={(e) => {
                            const nt = [...timings];
                            nt[i].type = e.target.value;
                            setTimings(nt);
                          }}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium outline-none"
                        >
                          <option value="class">Class</option>
                          <option value="interval">Break/Interval</option>
                        </select>
                        <TimeRangePicker
                          value={t.time}
                          onChange={(newRange) => {
                            const nt = [...timings];
                            nt[i].time = newRange;
                            setTimings(nt);
                          }}
                        />
                        {t.type === "interval" && (
                          <input
                            type="text"
                            className="flex-1 border-0 bg-slate-50 text-blue-600 rounded-lg px-3 py-1.5 text-sm min-w-0 outline-none font-semibold placeholder:text-blue-300"
                            value={t.label || ""}
                            placeholder="Break Name"
                            onChange={(e) => {
                              const nt = [...timings];
                              nt[i].label = e.target.value;
                              setTimings(nt);
                            }}
                          />
                        )}
                        <button
                          onClick={() =>
                            setTimings(timings.filter((_, idx) => idx !== i))
                          }
                          className="text-slate-400 hover:text-red-500 p-1 ml-auto"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        setTimings([
                          ...timings,
                          {
                            id: Math.random().toString(),
                            time: "09:00 AM - 10:00 AM",
                            type: "class",
                          },
                        ])
                      }
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1.5 py-2 px-1"
                    >
                      <FiPlus className="w-4 h-4" /> Add Row
                    </button>
                  </div>

                  <p className="text-sm font-semibold text-purple-600 mb-4 uppercase tracking-wider">
                    Saturday Timings
                  </p>
                  <div className="space-y-3">
                    {saturdayTimings.map((t, i) => (
                      <div
                        key={t.id}
                        className="flex flex-wrap lg:flex-nowrap gap-3 items-center bg-white p-3 rounded-xl border border-slate-200 border-l-4 border-l-purple-400"
                      >
                        <select
                          value={t.type}
                          onChange={(e) => {
                            const nt = [...saturdayTimings];
                            nt[i].type = e.target.value;
                            setSaturdayTimings(nt);
                          }}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium outline-none"
                        >
                          <option value="class">Class</option>
                          <option value="interval">Break/Interval</option>
                        </select>
                        <TimeRangePicker
                          value={t.time}
                          onChange={(newRange) => {
                            const nt = [...saturdayTimings];
                            nt[i].time = newRange;
                            setSaturdayTimings(nt);
                          }}
                        />
                        {t.type === "interval" && (
                          <input
                            type="text"
                            className="flex-1 border-0 bg-purple-50 text-purple-600 rounded-lg px-3 py-1.5 text-sm min-w-0 outline-none font-semibold placeholder:text-purple-300"
                            value={t.label || ""}
                            placeholder="Break Name"
                            onChange={(e) => {
                              const nt = [...saturdayTimings];
                              nt[i].label = e.target.value;
                              setSaturdayTimings(nt);
                            }}
                          />
                        )}
                        <button
                          onClick={() =>
                            setSaturdayTimings(
                              saturdayTimings.filter((_, idx) => idx !== i),
                            )
                          }
                          className="text-slate-400 hover:text-red-500 p-1 ml-auto"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        setSaturdayTimings([
                          ...saturdayTimings,
                          {
                            id: Math.random().toString(),
                            time: "09:00 AM - 10:00 AM",
                            type: "class",
                          },
                        ])
                      }
                      className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1.5 py-2 px-1"
                    >
                      <FiPlus className="w-4 h-4" /> Add Row
                    </button>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                  <button
                    onClick={() => setIsTimingModalOpen(false)}
                    className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveTimings(timings, saturdayTimings)}
                    className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2"
                  >
                    Save Changes
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
