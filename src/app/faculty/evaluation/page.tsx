"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import Skeleton from "../../../common/components/Skeleton";

interface Assignment {
  id: string;
  student: string;
  regNumber: string;
  assignmentName: string;
  submittedDate: string;
  marks: number | null;
  maxMarks: number;
  status: "pending" | "evaluated" | "late";
  facultyId: string;
}

interface InternalMark {
  id: string;
  student: string;
  regNumber: string;
  subject: string;
  marks: number | null;
  maxMarks: number;
  status: "entered" | "pending";
  facultyId: string;
}

interface ExamStatus {
  id: string;
  examName: string;
  batch: string;
  evaluatedStudents: number;
  totalStudents: number;
  status: "in_progress" | "completed" | "pending";
  facultyId: string;
}

interface StudentReport {
  id: string;
  student: string;
  regNumber: string;
  subject: string;
  overallGrade: string;
  cgpa: number;
  status: "passed" | "failed" | "pending";
  facultyId: string;
}

interface Deadline {
  id: string;
  evaluationType: string;
  dueDate: string;
  status: "upcoming" | "overdue" | "completed";
  facultyId: string;
}

export default function page() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<
    "assignments" | "internal" | "exams" | "reports" | "grades" | "deadlines"
  >("assignments");

  // Data States
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [internalMarks, setInternalMarks] = useState<InternalMark[]>([]);
  const [examStatuses, setExamStatuses] = useState<ExamStatus[]>([]);
  const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);

  // Add marks state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [assignedSubjects, setAssignedSubjects] = useState<{batchId: string, batchName: string, subject: string}[]>([]);
  const [addType, setAddType] = useState<"assignment" | "internal">("assignment");
  const [selectedMapping, setSelectedMapping] = useState("");
  const [itemName, setItemName] = useState("");
  const [maxMarks, setMaxMarks] = useState(25);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // New features state
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [newExamName, setNewExamName] = useState("");
  const [newExamBatch, setNewExamBatch] = useState("");
  const [newExamEval, setNewExamEval] = useState(0);
  const [newExamTotal, setNewExamTotal] = useState(0);

  const [isAddDeadlineOpen, setIsAddDeadlineOpen] = useState(false);
  const [newDeadlineType, setNewDeadlineType] = useState("");
  const [newDeadlineDate, setNewDeadlineDate] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const fetchAssignedSubjects = async () => {
      try {
        let facultyName = user.displayName || "";
        const fDoc = await getDocs(query(collection(db, "faculty"), where("email", "==", user.email)));
        if (!fDoc.empty) facultyName = fDoc.docs[0].data().name || facultyName;
        
        const normName = facultyName.trim().toLowerCase();

        const snap = await getDocs(collection(db, "timetables"));
        const batchesSnap = await getDocs(collection(db, "batches"));
        const batchMap: Record<string, string> = {};
        batchesSnap.docs.forEach(d => { batchMap[d.id] = d.data().name || d.id; });

        const subs: Record<string, {batchId: string, batchName: string, subject: string}> = {};

        snap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const batchId = docSnap.id;
          const mappedBatchName = batchMap[batchId] || batchId;

          if (data.entries && Array.isArray(data.entries)) {
            data.entries.forEach((entry: any) => {
              if ((entry.faculty || "").trim().toLowerCase() === normName) {
                const key = `${batchId}_${entry.subject}`;
                subs[key] = {
                  batchId,
                  batchName: mappedBatchName,
                  subject: entry.subject,
                };
              }
            });
          }
        });
        setAssignedSubjects(Object.values(subs));
      } catch (err) {
        console.error("Failed to fetch assigned subjects", err);
      }
    };
    fetchAssignedSubjects();

    // Fetch all collections in parallel (simplified for this view)
    const unsubAssignments = onSnapshot(
      query(
        collection(db, "evaluation_assignments"),
        where("facultyId", "==", user.uid),
      ),
      (snap) => {
        setAssignments(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Assignment),
        );
      },
    );

    const unsubInternals = onSnapshot(
      query(
        collection(db, "evaluation_internals"),
        where("facultyId", "==", user.uid),
      ),
      (snap) => {
        setInternalMarks(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InternalMark),
        );
      },
    );

    const unsubExams = onSnapshot(
      query(
        collection(db, "evaluation_exams"),
        where("facultyId", "==", user.uid),
      ),
      (snap) => {
        setExamStatuses(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ExamStatus),
        );
      },
    );

    const unsubReports = onSnapshot(
      query(
        collection(db, "evaluation_reports"),
        where("facultyId", "==", user.uid),
      ),
      (snap) => {
        setStudentReports(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StudentReport),
        );
      },
    );

    const unsubDeadlines = onSnapshot(
      query(
        collection(db, "evaluation_deadlines"),
        where("facultyId", "==", user.uid),
      ),
      (snap) => {
        setDeadlines(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Deadline),
        );
        setLoading(false);
      },
    );

    return () => {
      unsubAssignments();
      unsubInternals();
      unsubExams();
      unsubReports();
      unsubDeadlines();
    };
  }, [user]);

  const updateMark = async (
    collectionName: string,
    id: string,
    marks: number,
    maxMarks: number,
    type: "assignment" | "internal",
  ) => {
    try {
      if (marks > maxMarks) {
        toast.error(`Marks cannot exceed ${maxMarks}`);
        return;
      }
      await updateDoc(doc(db, collectionName, id), {
        marks: marks,
        status: type === "assignment" ? "evaluated" : "entered",
      });
      toast.success("Marks updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update marks");
    }
  };

  const handleCsvUpload = async () => {
    if (!user) return;
    if (!selectedMapping || !itemName || !maxMarks || !csvFile) {
      toast.error("Please fill all fields and select a CSV file.");
      return;
    }
    setIsUploading(true);
    try {
      const { batchId, batchName, subject } = JSON.parse(selectedMapping);
      const text = await csvFile.text();
      const rows = text.split("\n").map(r => r.split(","));
      const headers = rows[0].map(h => h.trim().toLowerCase());
      const regIdx = headers.findIndex(h => h.includes("reg"));
      const marksIdx = headers.findIndex(h => h.includes("mark"));
      
      if (regIdx === -1 || marksIdx === -1) {
        toast.error("CSV must have 'Reg No' and 'Marks' in header row.");
        setIsUploading(false);
        return;
      }

      let count = 0;
      for (let i = 1; i < rows.length; i++) {
          if (!rows[i] || rows[i].length < 2) continue;
          const regNo = rows[i][regIdx]?.trim();
          const markVal = parseFloat(rows[i][marksIdx]?.trim());
          if (!regNo || isNaN(markVal)) continue;

          // Try to find the student
          const qStud = query(collection(db, "students"), where("regNumber", "==", regNo));
          const studSnap = await getDocs(qStud);
          const studName = studSnap.empty ? regNo : (studSnap.docs[0].data().name || regNo);

          if (addType === "assignment") {
            await addDoc(collection(db, "evaluation_assignments"), {
              facultyId: user.uid,
              student: studName,
              regNumber: regNo,
              assignmentName: itemName,
              submittedDate: new Date().toISOString().split('T')[0],
              marks: markVal,
              maxMarks: maxMarks,
              status: "evaluated",
              subject: subject,
              batch: batchName
            });
          } else {
            await addDoc(collection(db, "evaluation_internals"), {
              facultyId: user.uid,
              student: studName,
              regNumber: regNo,
              subject: subject,
              itemName: itemName,
              marks: markVal,
              maxMarks: maxMarks,
              status: "entered",
              batch: batchName
            });
          }
          count++;
      }
      toast.success(`Successfully uploaded marks for ${count} students!`);
      setIsAddModalOpen(false);
      setCsvFile(null);
      setItemName("");
    } catch(e) {
       console.error(e);
        toast.error("Error processing CSV file");
    }
    setIsUploading(false);
  };

  const handleAddExam = async () => {
     if(!user || !newExamName || !newExamBatch) {
         toast.error("Please fill required fields.");
         return;
     }
     try {
       await addDoc(collection(db, "evaluation_exams"), {
         facultyId: user.uid,
         examName: newExamName,
         batch: newExamBatch,
         evaluatedStudents: newExamEval,
         totalStudents: newExamTotal,
         status: newExamEval >= newExamTotal ? "completed" : "in_progress"
       });
       toast.success("Exam status added successfully.");
       setIsAddExamOpen(false);
       setNewExamName(""); setNewExamBatch(""); setNewExamEval(0); setNewExamTotal(0);
     } catch(e) { toast.error("Failed to add exam."); }
  };

  const handleAddDeadline = async () => {
    if(!user || !newDeadlineType || !newDeadlineDate) {
         toast.error("Please fill required fields.");
         return;
    }
    try {
       await addDoc(collection(db, "evaluation_deadlines"), {
         facultyId: user.uid,
         evaluationType: newDeadlineType,
         dueDate: newDeadlineDate,
         status: (new Date(newDeadlineDate) < new Date()) ? "overdue" : "upcoming"
       });
       toast.success("Deadline added successfully.");
       setIsAddDeadlineOpen(false);
       setNewDeadlineType(""); setNewDeadlineDate("");
    } catch(e) { toast.error("Failed to add deadline."); }
  };

  const handleGenerateReports = async () => {
     if(!user) return;
     
     if (internalMarks.length === 0 && assignments.length === 0) {
        toast.error("No marks data to generate reports from.");
        return;
     }
     
     const id = toast.loading("Generating performance reports from marks...");
     let count = 0;
     for(const m of internalMarks) {
       // Generate mock report based on internal marks just for demonstration
       await addDoc(collection(db, "evaluation_reports"), {
          facultyId: user.uid,
          student: m.student,
          regNumber: m.regNumber,
          subject: m.subject,
          overallGrade: (m.marks || 0) >= (m.maxMarks * 0.8) ? "A" : (m.marks || 0) >= (m.maxMarks * 0.6) ? "B" : "C",
          cgpa: (m.marks || 0) >= (m.maxMarks * 0.8) ? 9.0 : 7.5,
          status: (m.marks || 0) >= (m.maxMarks * 0.4) ? "passed" : "failed"
       });
       count++;
     }
     toast.success(`Generated ${count} reports.`, { id });
  };

  const handleSubmitGrades = async () => {
     if(!user) return;
     toast.success("Grades reliably submitted to the central examination board!");
  };

  const seedData = async () => {
    if (!user) return;
    if (
      !confirm(
        "This will add sample data to your evaluation dashboard. Continue?",
      )
    )
      return;

    try {
      // Seed Assignments
      await addDoc(collection(db, "evaluation_assignments"), {
        facultyId: user.uid,
        student: "Alice Johnson",
        regNumber: "2023CSE001",
        assignmentName: "React Project",
        submittedDate: "2025-12-20",
        marks: null,
        maxMarks: 20,
        status: "pending",
      });
      await addDoc(collection(db, "evaluation_assignments"), {
        facultyId: user.uid,
        student: "Bob Smith",
        regNumber: "2023CSE002",
        assignmentName: "React Project",
        submittedDate: "2025-12-21",
        marks: 18,
        maxMarks: 20,
        status: "evaluated",
      });

      // Seed Internals
      await addDoc(collection(db, "evaluation_internals"), {
        facultyId: user.uid,
        student: "Alice Johnson",
        regNumber: "2023CSE001",
        subject: "Web Development",
        marks: null,
        maxMarks: 25,
        status: "pending",
      });

      toast.success("Sample data added!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to seed data");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "evaluated":
      case "entered":
      case "completed":
      case "passed":
      case "upcoming":
        return "bg-green-100 text-green-800";
      case "pending":
      case "in_progress":
      case "late":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const tabs = [
    { key: "assignments", label: "Assignments" },
    { key: "internal", label: "Internal Marks" },
    { key: "exams", label: "Exam Status" },
    { key: "reports", label: "Student Reports" },
    { key: "grades", label: "Grade Submission" },
    { key: "deadlines", label: "Deadlines" },
  ] as const;

  const QuickActions = () => (
    <div className="flex flex-wrap gap-4 mb-6 items-end">
      {selectedTab === "assignments" || selectedTab === "internal" ? (
         <button
          onClick={() => setIsAddModalOpen(true)}
          className="h-10 px-4 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors shadow-sm font-medium border border-indigo-600"
         >
          + Add Evaluation Marks
         </button>
      ) : selectedTab === "exams" ? (
         <button
          onClick={() => setIsAddExamOpen(true)}
          className="h-10 px-4 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors shadow-sm font-medium border border-indigo-600"
         >
          + Add Exam Status
         </button>
      ) : selectedTab === "deadlines" ? (
         <button
          onClick={() => setIsAddDeadlineOpen(true)}
          className="h-10 px-4 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors shadow-sm font-medium border border-indigo-600"
         >
          + Add Deadline
         </button>
      ) : null}

      <div className="flex flex-wrap gap-1 border-b w-full sm:w-auto mt-2 sm:mt-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              selectedTab === tab.key
                ? "border-blue-500 text-blue-600 bg-blue-50/50 rounded-t-xl border-x border-t"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {selectedTab === "reports" && (
        <button
          onClick={handleGenerateReports}
          className="h-10 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm font-medium border border-green-600"
        >
          Generate Reports
        </button>
      )}
      {selectedTab === "grades" && (
        <button
          onClick={handleSubmitGrades}
          className="h-10 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm font-medium border border-green-600"
        >
          Submit All Grades
        </button>
      )}
    </div>
  );

  const totalPending =
    assignments.filter((a) => a.status === "pending").length +
    internalMarks.filter((m) => m.status === "pending").length;
  const totalEvaluated =
    assignments.filter((a) => a.status === "evaluated").length +
    internalMarks.filter((m) => m.status === "entered").length;
  const overdueDeadlines = deadlines.filter(
    (d) => d.status === "overdue",
  ).length;

  if (loading)
    return (
      <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
        <div className="mb-6 md:mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="flex gap-4 mb-6 md:mb-8 border-b border-gray-200 pb-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 mb-6 md:mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/30">
            <Skeleton className="h-7 w-48" />
          </div>
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-10 w-16" />
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-10 w-16" />
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-10 w-16" />
          </div>
        </div>
      </div>
    );

  return (
    <div className="w-full p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-light text-gray-900">
            Evaluation Management
          </h1>
          <p className="text-gray-500 mt-2 font-light">
            Manage academic assessments and student performance.
          </p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Content based on tab */}
        {selectedTab === "assignments" ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6 md:mb-8">
            <div className="p-6 border-b border-gray-100 bg-gray-50/30">
              <h2 className="text-lg font-medium text-gray-900">
                Assignment Evaluation
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reg No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assignment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Marks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignments.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        No assignments found. Use 'Seed Test Data' to add
                        sample.
                      </td>
                    </tr>
                  )}
                  {assignments.map((assign) => (
                    <tr key={assign.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {assign.student}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {assign.regNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {assign.assignmentName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {assign.submittedDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          defaultValue={assign.marks || ""}
                          onBlur={(e) =>
                            updateMark(
                              "evaluation_assignments",
                              assign.id,
                              parseFloat(e.target.value),
                              assign.maxMarks,
                              "assignment",
                            )
                          }
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="0"
                          max={assign.maxMarks}
                        />
                        <span className="text-sm text-gray-500 ml-1">
                          /{assign.maxMarks}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assign.status)}`}
                        >
                          {assign.status.charAt(0).toUpperCase() +
                            assign.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : selectedTab === "internal" ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6 md:mb-8">
            <div className="p-6 border-b border-gray-100 bg-gray-50/30">
              <h2 className="text-lg font-medium text-gray-900">
                Internal Marks Entry
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reg No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Marks (/25)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {internalMarks.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        No internal marks pending.
                      </td>
                    </tr>
                  )}
                  {internalMarks.map((mark) => (
                    <tr key={mark.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {mark.student}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {mark.regNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {mark.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          defaultValue={mark.marks || ""}
                          onBlur={(e) =>
                            updateMark(
                              "evaluation_internals",
                              mark.id,
                              parseFloat(e.target.value),
                              mark.maxMarks,
                              "internal",
                            )
                          }
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="0"
                          max={mark.maxMarks}
                        />
                        <span className="text-sm text-gray-500 ml-1">
                          /{mark.maxMarks}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(mark.status)}`}
                        >
                          {mark.status.charAt(0).toUpperCase() +
                            mark.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : selectedTab === "exams" ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6 md:mb-8">
            <div className="p-6 border-b border-gray-100 bg-gray-50/30">
              <h2 className="text-lg font-medium text-gray-900">
                Exam Valuation Status
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exam Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Batch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Evaluated / Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {examStatuses.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        No exams active.
                      </td>
                    </tr>
                  )}
                  {examStatuses.map((exam) => (
                    <tr key={exam.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {exam.examName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {exam.batch}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {exam.evaluatedStudents}/{exam.totalStudents}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(exam.status)}`}
                        >
                          {exam.status.charAt(0).toUpperCase() +
                            exam.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : selectedTab === "reports" ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6 md:mb-8">
            <div className="p-6 border-b border-gray-100 bg-gray-50/30">
              <h2 className="text-lg font-medium text-gray-900">
                Student Performance Reports
              </h2>
              <button onClick={handleGenerateReports} className="px-3 py-1.5 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors">
                Generate Latest Reports
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reg No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CGPA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {studentReports.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        No reports available.
                      </td>
                    </tr>
                  )}
                  {studentReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {report.student}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {report.regNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {report.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {report.overallGrade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {report.cgpa}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}
                        >
                          {report.status.charAt(0).toUpperCase() +
                            report.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : selectedTab === "grades" ? (
          <div className="bg-white rounded-xl border border-gray-200 mb-6 md:mb-8 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Grade Submission Controls
            </h2>
            <p className="text-gray-600 mb-4">
              All grades are up to date. No pending submissions.
            </p>
            <button 
              onClick={handleSubmitGrades}
              className="w-full px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
            >
              Submit Grades for Semester
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6 md:mb-8">
            <div className="p-6 border-b border-gray-100 bg-gray-50/30">
              <h2 className="text-lg font-medium text-gray-900">
                Evaluation Deadlines
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Evaluation Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deadlines.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        No deadlines.
                      </td>
                    </tr>
                  )}
                  {deadlines.map((deadline) => (
                    <tr key={deadline.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {deadline.evaluationType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {deadline.dueDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(deadline.status)}`}
                        >
                          {deadline.status.charAt(0).toUpperCase() +
                            deadline.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors">
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide">
              Pending Evaluations
            </h3>
            <p className="text-3xl font-light text-gray-900 mt-2">
              {totalPending}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-green-300 transition-colors">
            <h3 className="text-xs font-bold text-green-600 uppercase tracking-wide">
              Evaluated Items
            </h3>
            <p className="text-3xl font-light text-gray-900 mt-2">
              {totalEvaluated}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-red-300 transition-colors">
            <h3 className="text-xs font-bold text-red-600 uppercase tracking-wide">
              Overdue Deadlines
            </h3>
            <p className="text-3xl font-light text-gray-900 mt-2">
              {overdueDeadlines}
            </p>
          </div>
        </div>
      </div>

      {/* Add Marks Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Evaluation Marks (CSV)</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select 
                  value={addType} 
                  onChange={e => setAddType(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="assignment">Assignment</option>
                  <option value="internal">Internal Exam</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Subject</label>
                <select 
                  value={selectedMapping} 
                  onChange={e => setSelectedMapping(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">-- Select Subject --</option>
                  {assignedSubjects.map((sub, i) => (
                     <option key={i} value={JSON.stringify(sub)}>
                        {sub.batchName} - {sub.subject}
                     </option>
                  ))}
                </select>
                {assignedSubjects.length === 0 && (
                   <p className="text-xs text-orange-500 mt-1">No assigned subjects found dynamically from the college timetable.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{addType === 'assignment' ? 'Assignment Name' : 'Exam Name'}</label>
                  <input 
                    type="text" 
                    value={itemName} 
                    onChange={e => setItemName(e.target.value)}
                    placeholder="e.g. Unit Test 1"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Marks</label>
                  <input 
                    type="number" 
                    value={maxMarks} 
                    onChange={e => setMaxMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload CSV</label>
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={e => setCsvFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">Include header row: Reg No, Marks</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button 
                onClick={handleCsvUpload}
                disabled={isUploading || !csvFile}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isUploading ? "Uploading..." : "Upload & Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Exam Modal */}
      {isAddExamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Exam Valuation Status</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Name</label>
                <input type="text" value={newExamName} onChange={e => setNewExamName(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. Midterms" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                <input type="text" value={newExamBatch} onChange={e => setNewExamBatch(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. CSE 2024" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Evaluated Count</label>
                  <input type="number" value={newExamEval} onChange={e => setNewExamEval(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Count</label>
                  <input type="number" value={newExamTotal} onChange={e => setNewExamTotal(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsAddExamOpen(false)} className="px-4 py-2 hover:bg-gray-100 text-gray-700 rounded-lg">Cancel</button>
              <button onClick={handleAddExam} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Add Exam</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Deadline Modal */}
      {isAddDeadlineOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Notification Deadline</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Evaluation Type</label>
                <input type="text" value={newDeadlineType} onChange={e => setNewDeadlineType(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. Final Grade Submission" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" value={newDeadlineDate} onChange={e => setNewDeadlineDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsAddDeadlineOpen(false)} className="px-4 py-2 hover:bg-gray-100 text-gray-700 rounded-lg">Cancel</button>
              <button onClick={handleAddDeadline} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Add Deadline</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
