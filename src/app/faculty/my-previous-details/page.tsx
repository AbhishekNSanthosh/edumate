"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  orderBy,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import Link from "next/link";
import Skeleton from "../../../common/components/Skeleton";
import {
  IoAdd,
  IoPencil,
  IoTrash,
  IoBriefcaseOutline,
  IoRibbonOutline,
  IoSchoolOutline,
  IoStarOutline,
} from "react-icons/io5";
import AddExperienceModal from "../../../widgets/Faculty/AddExperienceModal";
import AddResearchModal from "../../../widgets/Faculty/AddResearchModal";

interface ExperienceItem {
  id: string;
  entryType: "institution" | "designation";
  institution: string;
  role?: string;
  designation?: string;
  from: string;
  to: string;
}

interface ResearchItem {
  id: string;
  title: string;
  type: string;
  year: string;
  description: string;
}

interface AppraisalItem {
  id: string;
  year: string;
  rating: string;
  comments: string;
  appraiser: string;
}

export default function page() {
  const { user } = useAuth();

  // Data States
  const [pastInstitutions, setPastInstitutions] = useState<ExperienceItem[]>(
    [],
  );
  const [designations, setDesignations] = useState<ExperienceItem[]>([]);
  const [research, setResearch] = useState<ResearchItem[]>([]);
  const [appraisals, setAppraisals] = useState<AppraisalItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [expModalType, setExpModalType] = useState<
    "institution" | "designation"
  >("institution");
  const [researchModalOpen, setResearchModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // 1. Fetch Experience (Institutions & Designations)
    const expQuery = query(
      collection(db, "faculty_experience"),
      where("facultyId", "==", user.uid),
    );
    const unsubExp = onSnapshot(expQuery, (snap) => {
      const allExp = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as ExperienceItem,
      );
      // Filter Client Side
      setPastInstitutions(
        allExp
          .filter((e) => e.entryType === "institution")
          .sort((a, b) => b.to.localeCompare(a.to)),
      );
      setDesignations(
        allExp
          .filter((e) => e.entryType === "designation")
          .sort((a, b) => b.to.localeCompare(a.to)),
      );
    });

    const resQuery = query(
      collection(db, "faculty_research"),
      where("facultyId", "==", user.uid),
    );
    const unsubRes = onSnapshot(resQuery, (snap) => {
      setResearch(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as ResearchItem)
          .sort((a, b) => parseInt(b.year) - parseInt(a.year)),
      );
    });

    const appQuery = query(
      collection(db, "faculty_appraisals"),
      where("facultyId", "==", user.uid),
    );
    const unsubApp = onSnapshot(appQuery, (snap) => {
      setAppraisals(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as AppraisalItem)
          .sort((a, b) => parseInt(b.year) - parseInt(a.year)),
      );
      setLoading(false);
    });

    return () => {
      unsubExp();
      unsubRes();
      unsubApp();
    };
  }, [user]);

  const handleDelete = async (collectionName: string, id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
      toast.success("Record deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete");
    }
  };

  const openExpModal = (type: "institution" | "designation", item?: any) => {
    setExpModalType(type);
    setEditingItem(item || null);
    setExpModalOpen(true);
  };

  const openResearchModal = (item?: any) => {
    setEditingItem(item || null);
    setResearchModalOpen(true);
  };

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="w-full">
        <div className="mb-6 md:mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-2xl md:text-3xl font-light text-gray-900">
              My Previous Details
            </h1>
            <p className="text-gray-500 mt-1 font-light">
              Manage your professional career history and achievements.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 md:mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200 flex items-center gap-4 hover:border-blue-300 transition-colors">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <IoBriefcaseOutline size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-light text-gray-900">
                {loading ? "..." : pastInstitutions.length}
              </h3>
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Past Jobs
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 flex items-center gap-4 hover:border-green-300 transition-colors">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <IoRibbonOutline size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-light text-gray-900">
                {loading ? "..." : designations.length}
              </h3>
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Designations
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 flex items-center gap-4 hover:border-purple-300 transition-colors">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <IoSchoolOutline size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-light text-gray-900">
                {loading ? "..." : research.length}
              </h3>
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Publications
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 flex items-center gap-4 hover:border-yellow-300 transition-colors">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
              <IoStarOutline size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-light text-gray-900">
                {loading ? "..." : appraisals.length}
              </h3>
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Appraisals
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-8">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100">
                  <Skeleton className="h-6 w-48" />
                </div>
                <div className="p-6 space-y-4">
                  {[...Array(2)].map((_, j) => (
                    <Skeleton key={j} className="h-12 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* 1. Previous Institutions */}
            <div className="bg-white rounded-xl border border-gray-200 mb-6 md:mb-8 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <IoBriefcaseOutline /> Previous Institutions
                </h2>
                <button
                  onClick={() => openExpModal("institution")}
                  className="flex items-center gap-1 text-sm bg-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition"
                >
                  <IoAdd /> Add New
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Institution
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pastInstitutions.map((item: any) => (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {item.institution}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{item.role}</td>
                        <td className="px-6 py-4 text-gray-500">
                          {item.from} - {item.to}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => openExpModal("institution", item)}
                            className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors"
                          >
                            <IoPencil />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete("faculty_experience", item.id)
                            }
                            className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                          >
                            <IoTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pastInstitutions.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-8 text-center text-gray-400 font-light"
                        >
                          No records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Designations */}
            <div className="bg-white rounded-xl border border-gray-200 mb-6 md:mb-8 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <IoRibbonOutline /> Designation History
                </h2>
                <button
                  onClick={() => openExpModal("designation")}
                  className="flex items-center gap-1 text-sm bg-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition"
                >
                  <IoAdd /> Add New
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Designation
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Institution
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {designations.map((item: any) => (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {item.designation}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {item.institution}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {item.from} - {item.to}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => openExpModal("designation", item)}
                            className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors"
                          >
                            <IoPencil />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete("faculty_experience", item.id)
                            }
                            className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                          >
                            <IoTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {designations.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-8 text-center text-gray-400 font-light"
                        >
                          No records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Research */}
            <div className="bg-white rounded-xl border border-gray-200 mb-6 md:mb-8 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <IoSchoolOutline /> Research & Publications
                </h2>
                <button
                  onClick={() => openResearchModal()}
                  className="flex items-center gap-1 text-sm bg-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition"
                >
                  <IoAdd /> Add New
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Year
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {research.map((item: any) => (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {item.title}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200">
                            {item.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{item.year}</td>
                        <td className="px-6 py-4 text-gray-600 truncate max-w-xs">
                          {item.description}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => openResearchModal(item)}
                            className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors"
                          >
                            <IoPencil />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete("faculty_research", item.id)
                            }
                            className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                          >
                            <IoTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {research.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-8 text-center text-gray-400 font-light"
                        >
                          No research items added.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Appraisals (Read Only) */}
            <div className="bg-white rounded-xl border border-gray-200 mb-6 md:mb-8 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <IoStarOutline /> Performance Appraisals
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Year
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Rating
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Comments
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Appraiser
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {appraisals.map((item: any) => (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {item.year}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded text-xs font-bold border border-yellow-100">
                            {item.rating}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 max-w-md">
                          {item.comments}
                        </td>
                        <td className="px-6 py-4 text-gray-500 italic">
                          {item.appraiser}
                        </td>
                      </tr>
                    ))}
                    {appraisals.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-8 text-center text-gray-400 font-light"
                        >
                          No appraisals recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {user && (
        <>
          <AddExperienceModal
            isOpen={expModalOpen}
            onClose={() => setExpModalOpen(false)}
            facultyId={user.uid}
            type={expModalType}
            editData={editingItem}
            onSuccess={() => {}} // Snapshot updates automatically
          />
          <AddResearchModal
            isOpen={researchModalOpen}
            onClose={() => setResearchModalOpen(false)}
            facultyId={user.uid}
            editData={editingItem}
            onSuccess={() => {}}
          />
        </>
      )}
    </div>
  );
}
