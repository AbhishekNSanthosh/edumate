"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import {
  MdAssignment,
  MdSearch,
  MdClose,
  MdCloudUpload,
  MdAccessTime,
  MdCheckCircle,
  MdGrading,
  MdCalendarToday,
  MdAttachFile,
  MdOpenInNew,
  MdInsertDriveFile,
} from "react-icons/md";

interface Assignment {
  id: string;
  title: string;
  course: string;
  dueDate: any;
  status: "Pending" | "Submitted" | "Graded";
  description: string;
  grade?: string;
  feedback?: string;
  studentId: string;
  submittedAt?: any;
  submissionUrl?: string;
  submissionFileName?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  maxMarks?: number;
  marks?: number;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function AssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  // Submit modal state
  const [submitModal, setSubmitModal] = useState<Assignment | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Details modal state
  const [detailsModal, setDetailsModal] = useState<Assignment | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "assignments"),
      where("studentId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Assignment)
        );
        data.sort(
          (a, b) => (a.dueDate?.seconds || 0) - (b.dueDate?.seconds || 0)
        );
        setAssignments(data);
        setLoading(false);
      },
      (error) => {
        console.error("Assignments fetch error:", error);
        toast.error("Failed to load assignments");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File size must be less than 25MB");
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File size must be less than 25MB");
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmitAssignment = async () => {
    if (!submitModal || !selectedFile || !user) return;

    try {
      setUploading(true);
      const storageRef = ref(
        storage,
        `assignment_submissions/${user.uid}/${submitModal.id}/${Date.now()}_${selectedFile.name}`
      );

      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          setUploadProgress(progress);
        },
        (error) => {
          console.error(error);
          toast.error("Upload failed. Please try again.");
          setUploading(false);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          await updateDoc(doc(db, "assignments", submitModal.id), {
            status: "Submitted",
            submittedAt: Timestamp.now(),
            submissionUrl: url,
            submissionFileName: selectedFile.name,
          });
          toast.success("Assignment submitted successfully!");
          closeSubmitModal();
        }
      );
    } catch (e) {
      console.error(e);
      toast.error("Submission failed");
      setUploading(false);
    }
  };

  const closeSubmitModal = () => {
    setSubmitModal(null);
    setSelectedFile(null);
    setUploading(false);
    setUploadProgress(0);
  };

  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.course.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "All" || a.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <MdAccessTime className="text-amber-500" />;
      case "Submitted":
        return <MdCheckCircle className="text-emerald-500" />;
      case "Graded":
        return <MdGrading className="text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Submitted":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Graded":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "—";
    const date = timestamp?.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isOverdue = (assignment: Assignment) => {
    if (assignment.status !== "Pending") return false;
    const due = assignment.dueDate?.seconds
      ? new Date(assignment.dueDate.seconds * 1000)
      : new Date(assignment.dueDate);
    return due < new Date();
  };

  // Stats
  const pendingCount = assignments.filter((a) => a.status === "Pending").length;
  const submittedCount = assignments.filter((a) => a.status === "Submitted").length;
  const gradedCount = assignments.filter((a) => a.status === "Graded").length;
  const overdueCount = assignments.filter((a) => isOverdue(a)).length;

  if (loading) {
    return (
      <div className="p-4 md:p-6 min-h-screen animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-64 bg-gray-100 rounded mb-8"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl border border-gray-100"></div>
          ))}
        </div>
        <div className="h-11 w-full bg-white border border-gray-100 rounded-xl mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 bg-white rounded-xl border border-gray-100"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MdAssignment className="text-blue-600 text-3xl" />
          Assignments
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Track your coursework and submit assignments
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Total
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {assignments.length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Pending
            </p>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {pendingCount}
          </p>
          {overdueCount > 0 && (
            <p className="text-[11px] text-red-500 font-medium mt-0.5">
              {overdueCount} overdue
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Submitted
            </p>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {submittedCount}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Graded
            </p>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {gradedCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
          <input
            type="text"
            placeholder="Search by title or course..."
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
          <option value="Pending">Pending</option>
          <option value="Submitted">Submitted</option>
          <option value="Graded">Graded</option>
        </select>
      </div>

      {/* Assignments Grid */}
      {filteredAssignments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map((assignment) => {
            const overdue = isOverdue(assignment);
            return (
              <div
                key={assignment.id}
                className={`bg-white rounded-xl border p-5 flex flex-col h-full transition-colors ${
                  overdue ? "border-red-200" : "border-gray-100"
                }`}
              >
                {/* Top row: course + status */}
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {assignment.course}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusStyle(
                      assignment.status
                    )}`}
                  >
                    {getStatusIcon(assignment.status)}
                    {assignment.status === "Graded" && assignment.grade
                      ? `${assignment.grade}`
                      : assignment.status}
                  </span>
                </div>

                {/* Title */}
                <h3
                  className="text-[15px] font-semibold text-gray-900 mb-1.5 line-clamp-2"
                  title={assignment.title}
                >
                  {assignment.title}
                </h3>

                {/* Description */}
                <p className="text-gray-500 text-xs mb-4 flex-grow line-clamp-2">
                  {assignment.description}
                </p>

                {/* Due date */}
                <div
                  className={`flex items-center text-xs mb-4 px-2.5 py-1.5 rounded-lg ${
                    overdue
                      ? "bg-red-50 text-red-600"
                      : "bg-gray-50 text-gray-500"
                  }`}
                >
                  <MdCalendarToday className="mr-1.5 text-sm" />
                  Due: {formatDate(assignment.dueDate)}
                  {overdue && (
                    <span className="ml-auto font-semibold text-red-500">
                      Overdue
                    </span>
                  )}
                </div>

                {/* Submitted info */}
                {assignment.submittedAt && (
                  <div className="flex items-center text-xs text-emerald-600 mb-3 px-2.5 py-1.5 bg-emerald-50 rounded-lg">
                    <MdCheckCircle className="mr-1.5 text-sm" />
                    Submitted: {formatDate(assignment.submittedAt)}
                  </div>
                )}

                {/* Graded info */}
                {assignment.status === "Graded" && assignment.marks !== undefined && (
                  <div className="flex items-center text-xs text-blue-600 mb-3 px-2.5 py-1.5 bg-blue-50 rounded-lg">
                    <MdGrading className="mr-1.5 text-sm" />
                    Score: {assignment.marks}
                    {assignment.maxMarks ? ` / ${assignment.maxMarks}` : ""}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => setDetailsModal(assignment)}
                    className="flex-1 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition border border-gray-100"
                  >
                    View Details
                  </button>
                  {assignment.status === "Pending" && (
                    <button
                      onClick={() => setSubmitModal(assignment)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                    >
                      Submit
                    </button>
                  )}
                  {assignment.status === "Submitted" && (
                    <span className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-100">
                      <MdCheckCircle className="text-base" />
                      Submitted
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-100 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <MdAssignment className="text-3xl text-gray-300" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            No Assignments Found
          </h3>
          <p className="text-gray-500 text-sm mt-1 max-w-sm">
            {searchTerm || filterStatus !== "All"
              ? "Try adjusting your search or filter"
              : "You don't have any assignments yet. Check back later!"}
          </p>
        </div>
      )}

      {/* Submit Assignment Modal */}
      {submitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Submit Assignment
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {submitModal.title}
                </p>
              </div>
              <button
                onClick={closeSubmitModal}
                disabled={uploading}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <MdClose className="text-xl text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Assignment info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Course</span>
                  <span className="font-medium text-gray-900">
                    {submitModal.course}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Due Date</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(submitModal.dueDate)}
                  </span>
                </div>
                {isOverdue(submitModal) && (
                  <p className="text-xs text-red-500 font-medium pt-1">
                    This assignment is past due. Late submissions may be penalized.
                  </p>
                )}
              </div>

              {/* Dropzone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition"
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <MdInsertDriveFile className="text-blue-500 text-2xl flex-shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatBytes(selectedFile.size)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="ml-auto text-gray-400 hover:text-red-500 flex-shrink-0"
                    >
                      <MdClose className="text-lg" />
                    </button>
                  </div>
                ) : (
                  <>
                    <MdCloudUpload className="text-4xl text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-600">
                      Drop your file here or click to browse
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PDF, Word, Images, ZIP (max 25MB)
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,.rar,.xlsx,.txt"
                />
              </div>

              {/* Upload progress */}
              {uploading && (
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={closeSubmitModal}
                disabled={uploading}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAssignment}
                disabled={uploading || !selectedFile}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {uploading ? `Uploading ${uploadProgress}%` : "Submit Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {detailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">
                Assignment Details
              </h2>
              <button
                onClick={() => setDetailsModal(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <MdClose className="text-xl text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Title & Status */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {detailsModal.title}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border flex-shrink-0 ${getStatusStyle(
                      detailsModal.status
                    )}`}
                  >
                    {getStatusIcon(detailsModal.status)}
                    {detailsModal.status}
                  </span>
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {detailsModal.course}
                </span>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Description
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {detailsModal.description || "No description provided."}
                </p>
              </div>

              {/* Info grid */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <MdCalendarToday className="text-sm" /> Due Date
                  </span>
                  <span
                    className={`font-medium ${
                      isOverdue(detailsModal)
                        ? "text-red-600"
                        : "text-gray-900"
                    }`}
                  >
                    {formatDate(detailsModal.dueDate)}
                    {isOverdue(detailsModal) && " (Overdue)"}
                  </span>
                </div>

                {detailsModal.submittedAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <MdCheckCircle className="text-sm" /> Submitted
                    </span>
                    <span className="font-medium text-gray-900">
                      {formatDate(detailsModal.submittedAt)}
                    </span>
                  </div>
                )}

                {detailsModal.status === "Graded" && (
                  <>
                    {detailsModal.grade && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 flex items-center gap-1.5">
                          <MdGrading className="text-sm" /> Grade
                        </span>
                        <span className="font-bold text-blue-600">
                          {detailsModal.grade}
                        </span>
                      </div>
                    )}
                    {detailsModal.marks !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Marks</span>
                        <span className="font-bold text-blue-600">
                          {detailsModal.marks}
                          {detailsModal.maxMarks
                            ? ` / ${detailsModal.maxMarks}`
                            : ""}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Attachment from faculty */}
              {detailsModal.attachmentUrl && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Attachment
                  </p>
                  <a
                    href={detailsModal.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition border border-gray-100"
                  >
                    <MdAttachFile className="text-lg" />
                    <span className="truncate flex-1">
                      {detailsModal.attachmentName || "View Attachment"}
                    </span>
                    <MdOpenInNew className="text-base flex-shrink-0" />
                  </a>
                </div>
              )}

              {/* Submission file */}
              {detailsModal.submissionUrl && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Your Submission
                  </p>
                  <a
                    href={detailsModal.submissionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 rounded-lg text-sm text-emerald-700 hover:bg-emerald-100 transition border border-emerald-100"
                  >
                    <MdInsertDriveFile className="text-lg" />
                    <span className="truncate flex-1">
                      {detailsModal.submissionFileName || "View Submission"}
                    </span>
                    <MdOpenInNew className="text-base flex-shrink-0" />
                  </a>
                </div>
              )}

              {/* Feedback */}
              {detailsModal.feedback && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Faculty Feedback
                  </p>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-sm text-blue-800 leading-relaxed">
                      {detailsModal.feedback}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={() => setDetailsModal(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Close
              </button>
              {detailsModal.status === "Pending" && (
                <button
                  onClick={() => {
                    setDetailsModal(null);
                    setSubmitModal(detailsModal);
                  }}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
                >
                  Submit Assignment
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
