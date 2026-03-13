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
  MdDiscount,
  MdSearch,
  MdAdd,
  MdClose,
  MdEdit,
  MdDelete,
  MdCheckCircle,
  MdCancel,
} from "react-icons/md";

interface FeeDiscount {
  id: string;
  studentName: string;
  regNumber: string;
  batch: string;
  department: string;
  discountType: string;
  percentage: number;
  amount: number;
  reason: string;
  status: "active" | "expired" | "revoked";
  appliedFrom: string;
  appliedTo: string;
  approvedBy: string;
  createdAt: any;
}

const DISCOUNT_TYPES = ["Merit", "Need-based", "Sibling", "Staff Ward", "Sports", "Cultural", "Management Quota", "Other"];

export default function FeeDiscountsPage() {
  const { user } = useAuth();
  const [discounts, setDiscounts] = useState<FeeDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<FeeDiscount | null>(null);

  const [form, setForm] = useState({
    studentName: "",
    regNumber: "",
    batch: "",
    department: "",
    discountType: "Merit",
    percentage: "",
    amount: "",
    reason: "",
    appliedFrom: "",
    appliedTo: "",
    approvedBy: "",
  });

  useEffect(() => {
    if (!user) return;
    fetchDiscounts();
  }, [user]);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "fee_discounts"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FeeDiscount));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setDiscounts(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load discounts");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.studentName || !form.regNumber || (!form.percentage && !form.amount)) {
      toast.error("Please fill required fields");
      return;
    }

    try {
      const discountData = {
        studentId: "",
        studentName: form.studentName,
        regNumber: form.regNumber,
        batch: form.batch,
        department: form.department,
        discountType: form.discountType,
        percentage: parseFloat(form.percentage) || 0,
        amount: parseFloat(form.amount) || 0,
        reason: form.reason,
        status: "active" as const,
        appliedFrom: form.appliedFrom,
        appliedTo: form.appliedTo,
        approvedBy: form.approvedBy,
        createdAt: serverTimestamp(),
      };

      if (editingDiscount) {
        await updateDoc(doc(db, "fee_discounts", editingDiscount.id), discountData);
        toast.success("Discount updated");
      } else {
        await addDoc(collection(db, "fee_discounts"), discountData);
        toast.success("Discount added");
      }
      closeModal();
      fetchDiscounts();
    } catch (e) {
      console.error(e);
      toast.error("Operation failed");
    }
  };

  const handleRevoke = async (discount: FeeDiscount) => {
    if (!confirm("Revoke this discount?")) return;
    try {
      await updateDoc(doc(db, "fee_discounts", discount.id), { status: "revoked" });
      toast.success("Discount revoked");
      fetchDiscounts();
    } catch (e) {
      console.error(e);
      toast.error("Failed to revoke");
    }
  };

  const handleDelete = async (discount: FeeDiscount) => {
    if (!confirm("Delete this discount record permanently?")) return;
    try {
      await deleteDoc(doc(db, "fee_discounts", discount.id));
      toast.success("Discount deleted");
      fetchDiscounts();
    } catch (e) {
      console.error(e);
      toast.error("Delete failed");
    }
  };

  const openEdit = (d: FeeDiscount) => {
    setEditingDiscount(d);
    setForm({
      studentName: d.studentName,
      regNumber: d.regNumber,
      batch: d.batch,
      department: d.department,
      discountType: d.discountType,
      percentage: d.percentage?.toString() || "",
      amount: d.amount?.toString() || "",
      reason: d.reason,
      appliedFrom: d.appliedFrom,
      appliedTo: d.appliedTo,
      approvedBy: d.approvedBy,
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingDiscount(null);
    setForm({
      studentName: "",
      regNumber: "",
      batch: "",
      department: "",
      discountType: "Merit",
      percentage: "",
      amount: "",
      reason: "",
      appliedFrom: "",
      appliedTo: "",
      approvedBy: "",
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
      case "expired": return "bg-gray-100 text-gray-500";
      case "revoked": return "bg-red-50 text-red-600";
      default: return "bg-gray-50 text-gray-600";
    }
  };

  const filtered = discounts.filter((d) => {
    const matchSearch =
      d.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.regNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.discountType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "All" || d.status === filterStatus.toLowerCase();
    return matchSearch && matchStatus;
  });

  const totalSaved = discounts
    .filter((d) => d.status === "active")
    .reduce((s, d) => s + (d.amount || 0), 0);

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MdDiscount className="text-blue-600 text-3xl" />
            Fee Discounts
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage student fee discounts and concessions
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition text-sm"
        >
          <MdAdd className="text-xl" />
          Add Discount
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Discounts</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{discounts.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Active</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {discounts.filter((d) => d.status === "active").length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Savings</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalSaved)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Revoked</p>
          <p className="text-2xl font-bold text-red-500 mt-1">
            {discounts.filter((d) => d.status === "revoked").length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
          <input
            type="text"
            placeholder="Search by name, reg number, or type..."
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
          <option value="Expired">Expired</option>
          <option value="Revoked">Revoked</option>
        </select>
      </div>

      {/* Discount Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-50 rounded w-1/2 mb-4" />
              <div className="h-6 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((discount) => (
            <div
              key={discount.id}
              className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{discount.studentName}</h3>
                  <p className="text-xs text-gray-500">{discount.regNumber}</p>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getStatusStyle(discount.status)}`}>
                  {discount.status.charAt(0).toUpperCase() + discount.status.slice(1)}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {discount.discountType}
                </span>
                {discount.percentage > 0 && (
                  <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                    {discount.percentage}%
                  </span>
                )}
              </div>

              {discount.amount > 0 && (
                <p className="text-lg font-bold text-gray-900 mb-2">
                  {formatCurrency(discount.amount)}
                </p>
              )}

              {discount.reason && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{discount.reason}</p>
              )}

              <div className="text-xs text-gray-400 mb-3">
                {discount.appliedFrom && discount.appliedTo && (
                  <span>Valid: {discount.appliedFrom} to {discount.appliedTo}</span>
                )}
              </div>

              <div className="flex gap-1.5 pt-3 border-t border-gray-50">
                {discount.status === "active" && (
                  <button
                    onClick={() => handleRevoke(discount)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition"
                  >
                    <MdCancel className="text-sm" />
                    Revoke
                  </button>
                )}
                <button
                  onClick={() => openEdit(discount)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <MdEdit className="text-base" />
                </button>
                <button
                  onClick={() => handleDelete(discount)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <MdDelete className="text-base" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <MdDiscount className="text-3xl text-gray-300" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No discounts found</h3>
          <p className="text-gray-500 text-sm mt-1">
            {searchTerm || filterStatus !== "All"
              ? "Try adjusting your filters"
              : "Add your first discount to get started"}
          </p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">
                {editingDiscount ? "Edit Discount" : "Add Discount"}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <MdClose className="text-xl text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.studentName}
                    onChange={(e) => setForm((p) => ({ ...p, studentName: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reg Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.regNumber}
                    onChange={(e) => setForm((p) => ({ ...p, regNumber: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                  <input
                    type="text"
                    value={form.batch}
                    onChange={(e) => setForm((p) => ({ ...p, batch: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {DISCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Percentage (%)</label>
                  <input
                    type="number"
                    value={form.percentage}
                    onChange={(e) => setForm((p) => ({ ...p, percentage: e.target.value }))}
                    placeholder="e.g. 25"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Flat Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    placeholder="e.g. 10000"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                  <input
                    type="date"
                    value={form.appliedFrom}
                    onChange={(e) => setForm((p) => ({ ...p, appliedFrom: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid To</label>
                  <input
                    type="date"
                    value={form.appliedTo}
                    onChange={(e) => setForm((p) => ({ ...p, appliedTo: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <textarea
                    value={form.reason}
                    onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Approved By</label>
                  <input
                    type="text"
                    value={form.approvedBy}
                    onChange={(e) => setForm((p) => ({ ...p, approvedBy: e.target.value }))}
                    placeholder="Name of approving authority"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                {editingDiscount ? "Update" : "Add Discount"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
