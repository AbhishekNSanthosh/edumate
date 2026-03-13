"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { db } from "../../../../../config/firebaseConfig";

export default function EditDepartment() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    hod: "",
    status: "active",
  });

  // HOD searchable select state
  const [facultyList, setFacultyList] = useState<
    { id: string; name: string; designation?: string; department?: string }[]
  >([]);
  const [hodSearch, setHodSearch] = useState("");
  const [hodOpen, setHodOpen] = useState(false);
  const hodRef = useRef<HTMLDivElement>(null);

  // Fetch department data
  useEffect(() => {
    if (!id) return;
    const fetchDept = async () => {
      try {
        const docRef = doc(db, "departments", id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFormData(docSnap.data() as any);
        } else {
          toast.error("Department not found");
          router.push("/admin/department");
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load department");
      } finally {
        setLoading(false);
      }
    };
    fetchDept();
  }, [id, router]);

  // Fetch faculty list for HOD dropdown
  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        const snap = await getDocs(collection(db, "faculty"));
        const list = snap.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "",
          designation: doc.data().designation || "",
          department: doc.data().department || "",
        }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setFacultyList(list);
      } catch (err) {
        console.error("Failed to fetch faculty", err);
      }
    };
    fetchFaculty();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (hodRef.current && !hodRef.current.contains(e.target as Node)) {
        setHodOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredFaculty = facultyList.filter(
    (f) =>
      f.name.toLowerCase().includes(hodSearch.toLowerCase()) ||
      (f.designation || "").toLowerCase().includes(hodSearch.toLowerCase()),
  );

  const handleSelectHod = (name: string) => {
    setFormData((prev) => ({ ...prev, hod: name }));
    setHodSearch("");
    setHodOpen(false);
  };

  const handleClearHod = () => {
    setFormData((prev) => ({ ...prev, hod: "" }));
    setHodSearch("");
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const docRef = doc(db, "departments", id as string);
      await updateDoc(docRef, { ...formData });
      toast.success("Department updated successfully! 🎉");
      router.push("/admin/department");
    } catch (error: any) {
      console.log(error);
      toast.error("Failed to update department");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">
        Loading department details...
      </div>
    );

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Edit Department</h1>
          <Link
            href="/admin/department"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department Name
              </label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department Code
              </label>
              <input
                name="code"
                value={formData.code}
                onChange={handleChange}
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* HOD — Searchable Select */}
            <div ref={hodRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Head of Department (HOD)
              </label>

              {/* Trigger button */}
              <button
                type="button"
                onClick={() => setHodOpen((prev) => !prev)}
                className={`w-full px-4 py-2 border rounded-lg text-left flex items-center justify-between transition-all outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  hodOpen
                    ? "border-blue-500 ring-2 ring-blue-500"
                    : "border-gray-300"
                } bg-white`}
              >
                <span
                  className={
                    formData.hod
                      ? "text-gray-900 text-sm"
                      : "text-gray-400 text-sm"
                  }
                >
                  {formData.hod || "Select or search faculty…"}
                </span>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {formData.hod && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearHod();
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleClearHod()}
                      className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer text-base leading-none"
                      title="Clear selection"
                    >
                      ×
                    </span>
                  )}
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${hodOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              {/* Dropdown panel */}
              {hodOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* Search box */}
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                        />
                      </svg>
                      <input
                        autoFocus
                        type="text"
                        value={hodSearch}
                        onChange={(e) => setHodSearch(e.target.value)}
                        placeholder="Search faculty by name or designation…"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                      />
                    </div>
                  </div>

                  {/* Options */}
                  <ul className="max-h-56 overflow-y-auto py-1">
                    <li>
                      <button
                        type="button"
                        onClick={() => handleSelectHod("")}
                        className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-gray-50 italic"
                      >
                        — None / Clear —
                      </button>
                    </li>

                    {filteredFaculty.length === 0 ? (
                      <li className="px-4 py-3 text-sm text-gray-400 text-center">
                        {facultyList.length === 0
                          ? "No faculty found in the system"
                          : "No results match your search"}
                      </li>
                    ) : (
                      filteredFaculty.map((f) => (
                        <li key={f.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectHod(f.name)}
                            className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-blue-50 transition-colors ${
                              formData.hod === f.name ? "bg-blue-50" : ""
                            }`}
                          >
                            {/* Avatar initials */}
                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                              {f.name
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {f.name}
                              </div>
                              {(f.designation || f.department) && (
                                <div className="text-xs text-gray-500 truncate">
                                  {[f.designation, f.department]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </div>
                              )}
                            </div>
                            {formData.hod === f.name && (
                              <svg
                                className="ml-auto w-4 h-4 text-blue-600 shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/30"
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
                "Update Department"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
