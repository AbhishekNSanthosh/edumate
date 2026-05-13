"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";

interface InternalMark {
  id: string;
  student: string;
  regNumber: string;
  subject: string;
  marks: number | null;
  maxMarks: number;
  status: "entered" | "pending";
  itemName: string;
  batch: string;
  facultyId: string;
}

interface AssignmentMark {
  id: string;
  student: string;
  regNumber: string;
  subject: string;
  assignmentName: string;
  submittedDate: string;
  marks: number | null;
  maxMarks: number;
  status: "pending" | "evaluated" | "late";
  batch: string;
  facultyId: string;
}

type Tab = "internals" | "assignments";

export default function PerformancePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("internals");

  const [regNumber, setRegNumber] = useState<string | null>(null);
  const [internals, setInternals] = useState<InternalMark[]>([]);
  const [assignments, setAssignments] = useState<AssignmentMark[]>([]);

  // Fetch student's regNumber once
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "students", user.uid)).then((snap) => {
      if (snap.exists()) {
        setRegNumber(snap.data().regNumber || null);
      } else {
        setRegNumber(null);
        setLoading(false);
      }
    });
  }, [user]);

  // Fetch internal marks and assignments once regNumber is known
  useEffect(() => {
    if (!regNumber) return;

    const unsubInternals = onSnapshot(
      query(
        collection(db, "evaluation_internals"),
        where("regNumber", "==", regNumber)
      ),
      (snap) => {
        setInternals(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InternalMark)
        );
      },
      (err) => {
        console.error(err);
        toast.error("Failed to load internal marks");
      }
    );

    const unsubAssignments = onSnapshot(
      query(
        collection(db, "evaluation_assignments"),
        where("regNumber", "==", regNumber)
      ),
      (snap) => {
        setAssignments(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AssignmentMark)
        );
        setLoading(false);
      },
      (err) => {
        console.error(err);
        toast.error("Failed to load assignment marks");
        setLoading(false);
      }
    );

    return () => {
      unsubInternals();
      unsubAssignments();
    };
  }, [regNumber]);

  // --- Derived data for internals table ---
  // Unique series names sorted (e.g. "Series 1", "Series 2", "Unit Test 1")
  const seriesNames = Array.from(
    new Set(internals.map((m) => m.itemName))
  ).sort();

  // Group internals: subject -> { seriesName -> InternalMark }
  const internalsBySubject = internals.reduce(
    (acc, mark) => {
      if (!acc[mark.subject]) acc[mark.subject] = {};
      acc[mark.subject][mark.itemName] = mark;
      return acc;
    },
    {} as Record<string, Record<string, InternalMark>>
  );

  const internalSubjects = Object.keys(internalsBySubject).sort();

  // Stats
  const enteredInternals = internals.filter(
    (m) => m.status === "entered" && m.marks !== null
  );
  const avgInternal =
    enteredInternals.length > 0
      ? Math.round(
          enteredInternals.reduce(
            (sum, m) => sum + ((m.marks as number) / m.maxMarks) * 100,
            0
          ) / enteredInternals.length
        )
      : null;

  const evaluatedAssignments = assignments.filter(
    (a) => a.status === "evaluated" && a.marks !== null
  );
  const avgAssignment =
    evaluatedAssignments.length > 0
      ? Math.round(
          evaluatedAssignments.reduce(
            (sum, a) => sum + ((a.marks as number) / a.maxMarks) * 100,
            0
          ) / evaluatedAssignments.length
        )
      : null;

  // --- Derived data for assignments table ---
  // Group by subject
  const assignmentsBySubject = assignments.reduce(
    (acc, a) => {
      if (!acc[a.subject]) acc[a.subject] = [];
      acc[a.subject].push(a);
      return acc;
    },
    {} as Record<string, AssignmentMark[]>
  );

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-80 bg-gray-200 rounded mb-6" />
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 bg-white rounded-lg border border-gray-100" />
          ))}
        </div>
        <div className="h-64 bg-white rounded-lg border border-gray-100" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          My Performance
        </h1>
        <p className="text-gray-500 text-sm">
          Internal marks from series tests and assignments
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-lg border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Subjects
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {internalSubjects.length || Object.keys(assignmentsBySubject).length || "—"}
          </p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Series Tests
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {seriesNames.length > 0 ? seriesNames.length : "—"}
          </p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Avg Internal %
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {avgInternal !== null ? `${avgInternal}%` : "—"}
          </p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Avg Assignment %
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {avgAssignment !== null ? `${avgAssignment}%` : "—"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-white border border-gray-200 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("internals")}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "internals"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Series Tests
        </button>
        <button
          onClick={() => setTab("assignments")}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "assignments"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Assignments
        </button>
      </div>

      {/* Internals Tab */}
      {tab === "internals" && (
        <>
          {internalSubjects.length === 0 ? (
            <EmptyState message="No internal marks recorded yet." />
          ) : (
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">
                  Series Test Marks
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Internal marks entered by your faculty
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Subject
                      </th>
                      {seriesNames.map((name) => (
                        <th
                          key={name}
                          className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                        >
                          {name}
                        </th>
                      ))}
                      <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {internalSubjects.map((subject) => {
                      const subjectMarks = internalsBySubject[subject];
                      let totalEarned = 0;
                      let totalMax = 0;

                      seriesNames.forEach((name) => {
                        const m = subjectMarks[name];
                        if (m && m.marks !== null) {
                          totalEarned += m.marks as number;
                          totalMax += m.maxMarks;
                        } else if (m) {
                          totalMax += m.maxMarks;
                        }
                      });

                      const pct =
                        totalMax > 0
                          ? Math.round((totalEarned / totalMax) * 100)
                          : null;

                      return (
                        <tr key={subject} className="hover:bg-gray-50">
                          <td className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap">
                            {subject}
                          </td>
                          {seriesNames.map((name) => {
                            const m = subjectMarks[name];
                            if (!m) {
                              return (
                                <td
                                  key={name}
                                  className="px-5 py-4 text-center text-gray-300"
                                >
                                  —
                                </td>
                              );
                            }
                            if (m.status === "pending" || m.marks === null) {
                              return (
                                <td
                                  key={name}
                                  className="px-5 py-4 text-center"
                                >
                                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                    Pending
                                  </span>
                                </td>
                              );
                            }
                            const markPct = Math.round(
                              ((m.marks as number) / m.maxMarks) * 100
                            );
                            return (
                              <td
                                key={name}
                                className="px-5 py-4 text-center"
                              >
                                <span
                                  className={`font-semibold ${
                                    markPct >= 75
                                      ? "text-green-700"
                                      : markPct >= 50
                                      ? "text-blue-700"
                                      : "text-red-600"
                                  }`}
                                >
                                  {m.marks}
                                </span>
                                <span className="text-gray-400 text-xs">
                                  /{m.maxMarks}
                                </span>
                              </td>
                            );
                          })}
                          <td className="px-5 py-4 text-center">
                            {totalMax > 0 ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-semibold text-gray-900 text-sm">
                                  {totalEarned}/{totalMax}
                                </span>
                                {pct !== null && (
                                  <span
                                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                      pct >= 75
                                        ? "bg-green-100 text-green-700"
                                        : pct >= 50
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-red-100 text-red-600"
                                    }`}
                                  >
                                    {pct}%
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Assignments Tab */}
      {tab === "assignments" && (
        <>
          {assignments.length === 0 ? (
            <EmptyState message="No assignments recorded yet." />
          ) : (
            <div className="space-y-4">
              {Object.entries(assignmentsBySubject)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([subject, list]) => (
                  <div
                    key={subject}
                    className="bg-white rounded-lg border border-gray-100 overflow-hidden"
                  >
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800 text-sm">
                        {subject}
                      </h3>
                      <span className="text-xs text-gray-400">
                        {list.filter((a) => a.status === "evaluated").length}/
                        {list.length} evaluated
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-100">
                        <tr>
                          <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Assignment
                          </th>
                          <th className="px-5 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Score
                          </th>
                          <th className="px-5 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Status
                          </th>
                          <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Submitted
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {list.map((a) => (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3.5 text-gray-900 font-medium">
                              {a.assignmentName}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              {a.status === "evaluated" &&
                              a.marks !== null ? (
                                <span>
                                  <span className="font-semibold text-gray-900">
                                    {a.marks}
                                  </span>
                                  <span className="text-gray-400 text-xs">
                                    /{a.maxMarks}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <StatusBadge status={a.status} />
                            </td>
                            <td className="px-5 py-3.5 text-right text-gray-500 text-xs">
                              {a.submittedDate
                                ? new Date(
                                    a.submittedDate
                                  ).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-12 text-center">
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: AssignmentMark["status"] }) {
  const map: Record<
    AssignmentMark["status"],
    { label: string; cls: string }
  > = {
    evaluated: { label: "Evaluated", cls: "bg-green-100 text-green-700" },
    pending: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
    late: { label: "Late", cls: "bg-red-100 text-red-600" },
  };
  const { label, cls } = map[status] ?? map.pending;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}
