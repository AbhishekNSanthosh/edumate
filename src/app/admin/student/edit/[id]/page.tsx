"use client";
import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  getDocs,
  collection,
} from "firebase/firestore";
import { db } from "../../../../../config/firebaseConfig";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

export default function EditStudent() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    regNumber: "",
    rollNumber: "",
    uniRegNumber: "",
    email: "",
    phone: "",
    department: "",
    batch: "",
    status: "active",
    attendance: "0%",
  });

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const snap = await getDocs(collection(db, "departments"));
        setDepartments(snap.docs.map((d) => d.data().name));
      } catch (e) {
        console.error(e);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch student
  useEffect(() => {
    if (!id) return;
    const fetchStudent = async () => {
      try {
        const ref = doc(db, "students", id as string);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as any;
          setFormData({
            name: data.name || "",
            regNumber: data.regNumber || "",
            rollNumber: data.rollNumber || "",
            uniRegNumber: data.uniRegNumber || "",
            email: data.email || "",
            phone: data.phone || "",
            department: data.department || "",
            batch: data.batch || "",
            status: data.status || "active",
            attendance: data.attendance || "0%",
          });
        } else {
          toast.error("Student not found");
          router.push("/admin/student");
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to load student");
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [id, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "regNumber" || name === "rollNumber" || name === "uniRegNumber"
          ? value.toUpperCase()
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.regNumber) {
      toast.error("Name and Register Number are required");
      return;
    }
    setSaving(true);
    try {
      const ref = doc(db, "students", id as string);
      await updateDoc(ref, {
        name: formData.name,
        regNumber: formData.regNumber,
        rollNumber: formData.rollNumber,
        uniRegNumber: formData.uniRegNumber,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        batch: formData.batch,
        status: formData.status,
        attendance: formData.attendance,
        updatedAt: new Date().toISOString(),
      });
      toast.success("Student updated successfully!");
      router.push("/admin/student");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update student");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading student details…</div>
      </div>
    );

  const inputCls =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white";
  const labelCls =
    "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Edit Student</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Update student profile — auth credentials unchanged
            </p>
          </div>
          <Link
            href="/admin/student"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Full Name *</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                type="text"
                required
                className={inputCls}
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <label className={labelCls}>Register Number *</label>
              <input
                name="regNumber"
                value={formData.regNumber}
                onChange={handleChange}
                type="text"
                required
                className={inputCls}
                placeholder="e.g. 1001/CS/2024"
              />
            </div>
            <div>
              <label className={labelCls}>Roll Number</label>
              <input
                name="rollNumber"
                value={formData.rollNumber}
                onChange={handleChange}
                type="text"
                className={inputCls}
                placeholder="e.g. 24001"
              />
            </div>
            <div>
              <label className={labelCls}>University Reg. No.</label>
              <input
                name="uniRegNumber"
                value={formData.uniRegNumber}
                onChange={handleChange}
                type="text"
                className={inputCls}
                placeholder="e.g. CMA22CS003"
              />
            </div>
            <div>
              <label className={labelCls}>Email Address</label>
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                type="email"
                className={inputCls}
                placeholder="john@university.edu"
              />
              <p className="text-xs text-amber-600 mt-1">
                ⚠ Changing email here does NOT update Firebase Auth login email.
              </p>
            </div>
            <div>
              <label className={labelCls}>Phone Number</label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                type="tel"
                className={inputCls}
                placeholder="+91 9876543210"
              />
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className={inputCls}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Batch / Year</label>
              <input
                name="batch"
                value={formData.batch}
                onChange={handleChange}
                type="text"
                className={inputCls}
                placeholder="e.g. 2024-2028"
              />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={inputCls}
              >
                <option value="active">Active</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Attendance</label>
              <input
                name="attendance"
                value={formData.attendance}
                onChange={handleChange}
                type="text"
                className={inputCls}
                placeholder="e.g. 85%"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end gap-3">
            <Link
              href="/admin/student"
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
