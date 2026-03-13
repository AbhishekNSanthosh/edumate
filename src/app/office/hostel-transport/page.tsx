"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import {
  MdHome,
  MdDirectionsBus,
  MdSearch,
  MdEdit,
  MdClose,
  MdCheckCircle,
  MdPending,
  MdDelete,
  MdAdd,
  MdPerson,
} from "react-icons/md";

interface Student {
  id: string;
  name: string;
  regNumber: string;
  batch: string;
  department: string;
  email?: string;
}

interface HostelForm {
  block: string;
  roomNumber: string;
  type: string;
  wardenName: string;
  wardenContact: string;
  amountDue: string;
  dueDate: string;
}

interface TransportForm {
  route: string;
  busNumber: string;
  pickupPoint: string;
  pickupTime: string;
  driverName: string;
  driverContact: string;
  amountDue: string;
  dueDate: string;
}

interface StudentService {
  hostel?: {
    block: string; roomNumber: string; type: string;
    wardenName: string; wardenContact: string;
    feeStatus: "Paid" | "Due"; amountDue: number; dueDate: string;
  };
  transport?: {
    route: string; busNumber: string; pickupPoint: string;
    pickupTime: string; driverName: string; driverContact: string;
    feeStatus: "Paid" | "Due"; amountDue: number; dueDate: string;
  };
}

const HOSTEL_TYPES = ["Single Room", "Double Sharing", "Triple Sharing", "Dormitory"];

const emptyHostel: HostelForm = {
  block: "", roomNumber: "", type: "Double Sharing",
  wardenName: "", wardenContact: "", amountDue: "", dueDate: "",
};
const emptyTransport: TransportForm = {
  route: "", busNumber: "", pickupPoint: "",
  pickupTime: "", driverName: "", driverContact: "", amountDue: "", dueDate: "",
};

export default function HostelTransportManagePage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Per-student service cache
  const [serviceMap, setServiceMap] = useState<Record<string, StudentService>>({});

  // Modal state
  const [modal, setModal] = useState<{
    type: "hostel" | "transport";
    student: Student;
    existing?: StudentService;
  } | null>(null);

  const [hostelForm, setHostelForm] = useState<HostelForm>(emptyHostel);
  const [transportForm, setTransportForm] = useState<TransportForm>(emptyTransport);
  const [saving, setSaving] = useState(false);

  // Load all students
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "students"));
        setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student)));
      } catch {
        toast.error("Failed to load students");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Load service record for a student (lazy, on demand)
  const loadService = useCallback(async (studentId: string) => {
    if (serviceMap[studentId] !== undefined) return serviceMap[studentId];
    try {
      const snap = await getDoc(doc(db, "student_services", studentId));
      const data = snap.exists() ? (snap.data() as StudentService) : {};
      setServiceMap((prev) => ({ ...prev, [studentId]: data }));
      return data;
    } catch {
      return {};
    }
  }, [serviceMap]);

  const openModal = async (type: "hostel" | "transport", student: Student) => {
    const svc = await loadService(student.id);
    setModal({ type, student, existing: svc });
    if (type === "hostel") {
      const h = svc?.hostel;
      setHostelForm(h ? {
        block: h.block, roomNumber: h.roomNumber, type: h.type,
        wardenName: h.wardenName, wardenContact: h.wardenContact,
        amountDue: h.amountDue.toString(), dueDate: h.dueDate,
      } : emptyHostel);
    } else {
      const t = svc?.transport;
      setTransportForm(t ? {
        route: t.route, busNumber: t.busNumber, pickupPoint: t.pickupPoint,
        pickupTime: t.pickupTime, driverName: t.driverName, driverContact: t.driverContact,
        amountDue: t.amountDue.toString(), dueDate: t.dueDate,
      } : emptyTransport);
    }
  };

  const handleSave = async () => {
    if (!modal) return;
    setSaving(true);
    const { type, student } = modal;
    const ref = doc(db, "student_services", student.id);
    try {
      if (type === "hostel") {
        if (!hostelForm.block || !hostelForm.roomNumber || !hostelForm.amountDue || !hostelForm.dueDate) {
          toast.error("Block, Room Number, Amount and Due Date are required"); setSaving(false); return;
        }
        const data = {
          block: hostelForm.block,
          roomNumber: hostelForm.roomNumber,
          type: hostelForm.type,
          wardenName: hostelForm.wardenName,
          wardenContact: hostelForm.wardenContact,
          feeStatus: "Due" as const,
          amountDue: parseFloat(hostelForm.amountDue),
          dueDate: hostelForm.dueDate,
        };
        await setDoc(ref, { hostel: data }, { merge: true });
        setServiceMap((prev) => ({
          ...prev,
          [student.id]: { ...prev[student.id], hostel: data },
        }));
        toast.success(`Hostel assigned to ${student.name}`);
      } else {
        if (!transportForm.route || !transportForm.busNumber || !transportForm.amountDue || !transportForm.dueDate) {
          toast.error("Route, Bus Number, Amount and Due Date are required"); setSaving(false); return;
        }
        const data = {
          route: transportForm.route,
          busNumber: transportForm.busNumber,
          pickupPoint: transportForm.pickupPoint,
          pickupTime: transportForm.pickupTime,
          driverName: transportForm.driverName,
          driverContact: transportForm.driverContact,
          feeStatus: "Due" as const,
          amountDue: parseFloat(transportForm.amountDue),
          dueDate: transportForm.dueDate,
        };
        await setDoc(ref, { transport: data }, { merge: true });
        setServiceMap((prev) => ({
          ...prev,
          [student.id]: { ...prev[student.id], transport: data },
        }));
        toast.success(`Transport assigned to ${student.name}`);
      }
      setModal(null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (type: "hostel" | "transport", student: Student) => {
    if (!confirm(`Remove ${type} allocation for ${student.name}?`)) return;
    try {
      await updateDoc(doc(db, "student_services", student.id), {
        [type]: deleteField(),
      });
      setServiceMap((prev) => {
        const updated = { ...prev[student.id] };
        delete updated[type];
        return { ...prev, [student.id]: updated };
      });
      toast.success("Removed successfully");
    } catch {
      toast.error("Failed to remove");
    }
  };

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.name?.toLowerCase().includes(q) || s.regNumber?.toLowerCase().includes(q) || s.batch?.toLowerCase().includes(q);
  });

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen animate-pulse">
        <div className="h-7 w-64 bg-gray-200 rounded mb-6" />
        <div className="h-10 bg-white rounded-xl border border-gray-200 mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-white rounded-xl border border-gray-200 mb-3" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MdHome className="text-blue-600 text-3xl" />
          Hostel & Transport Management
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Assign optional hostel and transport services per student
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Students</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{students.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Hostel Assigned</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {Object.values(serviceMap).filter((s) => s.hostel).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Transport Assigned</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {Object.values(serviceMap).filter((s) => s.transport).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Showing</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{filtered.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
        <input
          type="text"
          placeholder="Search by name, reg number or batch..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Student list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">Student</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">Batch</th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">
                <span className="flex items-center justify-center gap-1"><MdHome /> Hostel</span>
              </th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">
                <span className="flex items-center justify-center gap-1"><MdDirectionsBus /> Transport</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((student) => {
              const svc = serviceMap[student.id];
              return (
                <tr
                  key={student.id}
                  className="hover:bg-gray-50/50 transition-colors"
                  onMouseEnter={() => loadService(student.id)}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                        {student.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-400">{student.regNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 text-xs">
                    <span className="bg-gray-100 px-2 py-0.5 rounded-full">{student.batch || "—"}</span>
                  </td>

                  {/* Hostel cell */}
                  <td className="px-5 py-3.5 text-center">
                    {svc?.hostel ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xs text-gray-700 font-medium">
                          {svc.hostel.block}, {svc.hostel.roomNumber}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold border ${
                          svc.hostel.feeStatus === "Paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-red-50 text-red-700 border-red-100"
                        }`}>
                          {svc.hostel.feeStatus === "Paid" ? fmtCurrency(0) : "Due " + fmtCurrency(svc.hostel.amountDue)}
                        </span>
                        <button
                          onClick={() => openModal("hostel", student)}
                          className="p-1 text-blue-500 hover:bg-blue-50 rounded transition"
                          title="Edit"
                        >
                          <MdEdit className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleRemove("hostel", student)}
                          className="p-1 text-red-400 hover:bg-red-50 rounded transition"
                          title="Remove"
                        >
                          <MdDelete className="text-sm" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openModal("hostel", student)}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-50 transition"
                      >
                        <MdAdd className="text-sm" /> Assign
                      </button>
                    )}
                  </td>

                  {/* Transport cell */}
                  <td className="px-5 py-3.5 text-center">
                    {svc?.transport ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xs text-gray-700 font-medium">
                          {svc.transport.busNumber}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold border ${
                          svc.transport.feeStatus === "Paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-red-50 text-red-700 border-red-100"
                        }`}>
                          {svc.transport.feeStatus === "Paid" ? fmtCurrency(0) : "Due " + fmtCurrency(svc.transport.amountDue)}
                        </span>
                        <button
                          onClick={() => openModal("transport", student)}
                          className="p-1 text-blue-500 hover:bg-blue-50 rounded transition"
                          title="Edit"
                        >
                          <MdEdit className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleRemove("transport", student)}
                          className="p-1 text-red-400 hover:bg-red-50 rounded transition"
                          title="Remove"
                        >
                          <MdDelete className="text-sm" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openModal("transport", student)}
                        className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium px-2.5 py-1 rounded-lg border border-amber-200 hover:bg-amber-50 transition"
                      >
                        <MdAdd className="text-sm" /> Assign
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm">
            <MdPerson className="text-4xl mx-auto mb-3 text-gray-200" />
            No students found
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  {modal.type === "hostel" ? <MdHome className="text-blue-600" /> : <MdDirectionsBus className="text-amber-500" />}
                  {modal.type === "hostel" ? "Hostel" : "Transport"} Allocation
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {modal.student.name} · {modal.student.regNumber}
                </p>
              </div>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <MdClose className="text-xl text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {modal.type === "hostel" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Block *</label>
                      <input value={hostelForm.block} onChange={(e) => setHostelForm((p) => ({ ...p, block: e.target.value }))}
                        placeholder="e.g. Block A" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Room Number *</label>
                      <input value={hostelForm.roomNumber} onChange={(e) => setHostelForm((p) => ({ ...p, roomNumber: e.target.value }))}
                        placeholder="e.g. 204" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Room Type</label>
                    <select value={hostelForm.type} onChange={(e) => setHostelForm((p) => ({ ...p, type: e.target.value }))} className={inputCls}>
                      {HOSTEL_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Warden Name</label>
                      <input value={hostelForm.wardenName} onChange={(e) => setHostelForm((p) => ({ ...p, wardenName: e.target.value }))}
                        placeholder="Warden name" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Warden Contact</label>
                      <input value={hostelForm.wardenContact} onChange={(e) => setHostelForm((p) => ({ ...p, wardenContact: e.target.value }))}
                        placeholder="+91..." className={inputCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Fee Amount (₹) *</label>
                      <input type="number" value={hostelForm.amountDue} onChange={(e) => setHostelForm((p) => ({ ...p, amountDue: e.target.value }))}
                        placeholder="e.g. 15000" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Due Date *</label>
                      <input type="date" value={hostelForm.dueDate} onChange={(e) => setHostelForm((p) => ({ ...p, dueDate: e.target.value }))}
                        className={inputCls} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Route *</label>
                      <input value={transportForm.route} onChange={(e) => setTransportForm((p) => ({ ...p, route: e.target.value }))}
                        placeholder="e.g. Route 5 – City" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Bus Number *</label>
                      <input value={transportForm.busNumber} onChange={(e) => setTransportForm((p) => ({ ...p, busNumber: e.target.value }))}
                        placeholder="e.g. KL-07-BW-4567" className={inputCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Pickup Point</label>
                      <input value={transportForm.pickupPoint} onChange={(e) => setTransportForm((p) => ({ ...p, pickupPoint: e.target.value }))}
                        placeholder="Stop name" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Pickup Time</label>
                      <input value={transportForm.pickupTime} onChange={(e) => setTransportForm((p) => ({ ...p, pickupTime: e.target.value }))}
                        placeholder="e.g. 07:45 AM" className={inputCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Driver Name</label>
                      <input value={transportForm.driverName} onChange={(e) => setTransportForm((p) => ({ ...p, driverName: e.target.value }))}
                        placeholder="Driver name" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Driver Contact</label>
                      <input value={transportForm.driverContact} onChange={(e) => setTransportForm((p) => ({ ...p, driverContact: e.target.value }))}
                        placeholder="+91..." className={inputCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Fee Amount (₹) *</label>
                      <input type="number" value={transportForm.amountDue} onChange={(e) => setTransportForm((p) => ({ ...p, amountDue: e.target.value }))}
                        placeholder="e.g. 5000" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Due Date *</label>
                      <input type="date" value={transportForm.dueDate} onChange={(e) => setTransportForm((p) => ({ ...p, dueDate: e.target.value }))}
                        className={inputCls} />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-5 pt-0 flex gap-3">
              <button onClick={() => setModal(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
                {saving ? "Saving..." : modal.existing?.[modal.type] ? "Update" : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
