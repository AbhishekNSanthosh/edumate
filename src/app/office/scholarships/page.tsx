"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import {
  MdSchool,
  MdSearch,
  MdAdd,
  MdClose,
  MdEdit,
  MdDelete,
  MdPeople,
  MdCalendarToday,
  MdExpandMore,
  MdExpandLess,
} from "react-icons/md";

interface Recipient {
  studentId: string;
  studentName: string;
  regNumber: string;
  amount: number;
  status: "awarded" | "disbursed" | "pending";
}

interface Scholarship {
  id: string;
  name: string;
  description: string;
  provider: string;
  amount: number;
  eligibility: string;
  status: "active" | "closed" | "upcoming";
  applicationDeadline: string;
  academicYear: string;
  recipientCount: number;
  recipients?: Recipient[];
  createdAt: any;
}

const PROVIDERS = ["Government", "Institution", "Private", "NGO", "Trust", "Other"];

export default function ScholarshipsPage() {
  const { user } = useAuth();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Add recipient modal
  const [addRecipientFor, setAddRecipientFor] = useState<Scholarship | null>(null);
  const [recipientForm, setRecipientForm] = useState({
    studentName: "",
    regNumber: "",
    amount: "",
  });

  const [form, setForm] = useState({
    name: "",
    description: "",
    provider: "Institution",
    amount: "",
    eligibility: "",
    status: "active" as "active" | "closed" | "upcoming",
    applicationDeadline: "",
    academicYear: "",
  });

  useEffect(() => {
    if (!user) return;
    fetchScholarships();
  }, [user]);

  const fetchScholarships = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "scholarships"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Scholarship));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setScholarships(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load scholarships");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.amount) {
      toast.error("Name and amount are required");
      return;
    }

    try {
      const data = {
        name: form.name,
        description: form.description,
        provider: form.provider,
        amount: parseFloat(form.amount),
        eligibility: form.eligibility,
        status: form.status,
        applicationDeadline: form.applicationDeadline,
        academicYear: form.academicYear,
        recipientCount: editingScholarship?.recipientCount || 0,
        recipients: editingScholarship?.recipients || [],
        createdAt: editingScholarship ? editingScholarship.createdAt : serverTimestamp(),
      };

      if (editingScholarship) {
        await updateDoc(doc(db, "scholarships", editingScholarship.id), data);
        toast.success("Scholarship updated");
      } else {
        await addDoc(collection(db, "scholarships"), data);
        toast.success("Scholarship added");
      }
      closeModal();
      fetchScholarships();
    } catch (e) {
      console.error(e);
      toast.error("Operation failed");
    }
  };

  const handleAddRecipient = async () => {
    if (!addRecipientFor || !recipientForm.studentName || !recipientForm.regNumber) {
      toast.error("Fill in student details");
      return;
    }

    try {
      const newRecipient: Recipient = {
        studentId: "",
        studentName: recipientForm.studentName,
        regNumber: recipientForm.regNumber,
        amount: parseFloat(recipientForm.amount) || addRecipientFor.amount,
        status: "awarded",
      };

      const existingRecipients = addRecipientFor.recipients || [];
      const updatedRecipients = [...existingRecipients, newRecipient];

      await updateDoc(doc(db, "scholarships", addRecipientFor.id), {
        recipients: updatedRecipients,
        recipientCount: updatedRecipients.length,
      });

      toast.success("Recipient added");
      setAddRecipientFor(null);
      setRecipientForm({ studentName: "", regNumber: "", amount: "" });
      fetchScholarships();
    } catch (e) {
      console.error(e);
      toast.error("Failed to add recipient");
    }
  };

  const handleDelete = async (s: Scholarship) => {
    if (!confirm("Delete this scholarship?")) return;
    try {
      await deleteDoc(doc(db, "scholarships", s.id));
      toast.success("Scholarship deleted");
      fetchScholarships();
    } catch (e) {
      console.error(e);
      toast.error("Delete failed");
    }
  };

  const openEdit = (s: Scholarship) => {
    setEditingScholarship(s);
    setForm({
      name: s.name,
      description: s.description,
      provider: s.provider,
      amount: s.amount.toString(),
      eligibility: s.eligibility,
      status: s.status,
      applicationDeadline: s.applicationDeadline,
      academicYear: s.academicYear,
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingScholarship(null);
    setForm({
      name: "",
      description: "",
      provider: "Institution",
      amount: "",
      eligibility: "",
      status: "active",
      applicationDeadline: "",
      academicYear: "",
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-50 text-emerald-700";
      case "closed": return "bg-gray-100 text-gray-500";
      case "upcoming": return "bg-blue-50 text-blue-700";
      default: return "bg-gray-50 text-gray-600";
    }
  };

  const getProviderStyle = (provider: string) => {
    switch (provider) {
      case "Government": return "bg-amber-50 text-amber-700";
      case "Institution": return "bg-blue-50 text-blue-700";
      case "Private": return "bg-purple-50 text-purple-700";
      case "NGO": return "bg-emerald-50 text-emerald-700";
      default: return "bg-gray-50 text-gray-600";
    }
  };

  const filtered = scholarships.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.provider.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "All" || s.status === filterStatus.toLowerCase();
    return matchSearch && matchStatus;
  });

  const totalDisbursed = scholarships.reduce((sum, s) => {
    return sum + (s.recipients || []).filter((r) => r.status === "disbursed").reduce((rs, r) => rs + r.amount, 0);
  }, 0);

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MdSchool className="text-blue-600 text-3xl" />
            Scholarships
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage scholarship programs and recipients
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition text-sm"
        >
          <MdAdd className="text-xl" />
          Add Scholarship
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Programs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{scholarships.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Active</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {scholarships.filter((s) => s.status === "active").length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Recipients</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {scholarships.reduce((s, sc) => s + (sc.recipientCount || 0), 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Disbursed</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalDisbursed)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
          <input
            type="text"
            placeholder="Search by name or provider..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      {/* Scholarship List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse">
              <div className="h-5 bg-gray-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-50 rounded w-2/3 mb-4" />
              <div className="h-8 bg-gray-50 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((scholarship) => (
            <div
              key={scholarship.id}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{scholarship.name}</h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusStyle(scholarship.status)}`}>
                        {scholarship.status.charAt(0).toUpperCase() + scholarship.status.slice(1)}
                      </span>
                    </div>
                    {scholarship.description && (
                      <p className="text-sm text-gray-500 line-clamp-1">{scholarship.description}</p>
                    )}
                  </div>
                  <p className="text-xl font-bold text-gray-900 ml-4">
                    {formatCurrency(scholarship.amount)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${getProviderStyle(scholarship.provider)}`}>
                    {scholarship.provider}
                  </span>
                  {scholarship.academicYear && (
                    <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                      {scholarship.academicYear}
                    </span>
                  )}
                  {scholarship.applicationDeadline && (
                    <span className="flex items-center gap-1 text-[11px] text-gray-500">
                      <MdCalendarToday className="text-xs" />
                      Deadline: {scholarship.applicationDeadline}
                    </span>
                  )}
                </div>

                {scholarship.eligibility && (
                  <p className="text-xs text-gray-500 mb-3">
                    <span className="font-medium">Eligibility:</span> {scholarship.eligibility}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setExpandedId(expandedId === scholarship.id ? null : scholarship.id)}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      <MdPeople className="text-sm" />
                      {scholarship.recipientCount || 0} Recipients
                      {expandedId === scholarship.id ? <MdExpandLess /> : <MdExpandMore />}
                    </button>
                    {scholarship.status === "active" && (
                      <button
                        onClick={() => setAddRecipientFor(scholarship)}
                        className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        <MdAdd className="text-sm" />
                        Add Recipient
                      </button>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(scholarship)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <MdEdit className="text-base" />
                    </button>
                    <button
                      onClick={() => handleDelete(scholarship)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <MdDelete className="text-base" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Recipients */}
              {expandedId === scholarship.id && (
                <div className="border-t border-gray-100 bg-gray-50/50">
                  {scholarship.recipients && scholarship.recipients.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {scholarship.recipients.map((r, i) => (
                        <div key={i} className="px-5 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{r.studentName}</p>
                            <p className="text-xs text-gray-500">{r.regNumber}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(r.amount)}</p>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                              r.status === "disbursed"
                                ? "bg-emerald-50 text-emerald-700"
                                : r.status === "awarded"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                            }`}>
                              {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-gray-400 text-sm">
                      No recipients yet
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <MdSchool className="text-3xl text-gray-300" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No scholarships found</h3>
          <p className="text-gray-500 text-sm mt-1">
            {searchTerm || filterStatus !== "All"
              ? "Try adjusting your filters"
              : "Create your first scholarship program"}
          </p>
        </div>
      )}

      {/* Add/Edit Scholarship Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">
                {editingScholarship ? "Edit Scholarship" : "Add Scholarship"}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <MdClose className="text-xl text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scholarship Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Merit Scholarship 2025"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                  <select
                    value={form.provider}
                    onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    placeholder="e.g. 50000"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as any }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={form.academicYear}
                    onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))}
                    placeholder="e.g. 2025-26"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Application Deadline</label>
                <input
                  type="date"
                  value={form.applicationDeadline}
                  onChange={(e) => setForm((p) => ({ ...p, applicationDeadline: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Eligibility Criteria</label>
                <textarea
                  value={form.eligibility}
                  onChange={(e) => setForm((p) => ({ ...p, eligibility: e.target.value }))}
                  rows={2}
                  placeholder="e.g. CGPA above 8.5, no backlogs"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
              >
                {editingScholarship ? "Update" : "Add Scholarship"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Recipient Modal */}
      {addRecipientFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Add Recipient</h2>
                <p className="text-xs text-gray-500">{addRecipientFor.name}</p>
              </div>
              <button
                onClick={() => { setAddRecipientFor(null); setRecipientForm({ studentName: "", regNumber: "", amount: "" }); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <MdClose className="text-xl text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                <input
                  type="text"
                  value={recipientForm.studentName}
                  onChange={(e) => setRecipientForm((p) => ({ ...p, studentName: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reg Number</label>
                <input
                  type="text"
                  value={recipientForm.regNumber}
                  onChange={(e) => setRecipientForm((p) => ({ ...p, regNumber: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (default: {formatCurrency(addRecipientFor.amount)})
                </label>
                <input
                  type="number"
                  value={recipientForm.amount}
                  onChange={(e) => setRecipientForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder={addRecipientFor.amount.toString()}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={() => { setAddRecipientFor(null); setRecipientForm({ studentName: "", regNumber: "", amount: "" }); }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRecipient}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
              >
                Add Recipient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
