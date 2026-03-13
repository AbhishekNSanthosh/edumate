"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import {
  MdSearch,
  MdFolder,
  MdPictureAsPdf,
  MdVideoLibrary,
  MdImage,
  MdInsertDriveFile,
  MdDownload,
  MdPerson,
  MdCalendarToday,
} from "react-icons/md";

interface StudyMaterial {
  id: string;
  title: string;
  description: string;
  subject: string;
  batch: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedByName: string;
  createdAt: any;
}

function getFileIcon(fileType: string) {
  if (fileType.includes("pdf")) return <MdPictureAsPdf className="text-red-500 text-2xl" />;
  if (fileType.includes("video")) return <MdVideoLibrary className="text-purple-500 text-2xl" />;
  if (fileType.includes("image")) return <MdImage className="text-green-500 text-2xl" />;
  return <MdInsertDriveFile className="text-blue-500 text-2xl" />;
}

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatFileExtension(fileType: string) {
  if (fileType.includes("pdf")) return "PDF";
  if (fileType.includes("video")) return "VIDEO";
  if (fileType.includes("image")) return "IMAGE";
  if (fileType.includes("word") || fileType.includes("document")) return "DOC";
  if (fileType.includes("sheet") || fileType.includes("excel")) return "XLSX";
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return "PPT";
  return "FILE";
}

export default function StudentStudyMaterials() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("All");
  const [studentBatch, setStudentBatch] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchStudentAndMaterials();
  }, [user]);

  const fetchStudentAndMaterials = async () => {
    try {
      setLoading(true);

      // Get student's batch
      const studentSnap = await getDocs(
        query(collection(db, "students"), where("__name__", "==", user!.uid))
      );

      let batch = "";
      if (!studentSnap.empty) {
        batch = studentSnap.docs[0].data().batch || "";
        setStudentBatch(batch);
      }

      if (!batch) {
        // No batch assigned — show nothing
        setMaterials([]);
        return;
      }

      // Fetch materials for this batch only
      const snap = await getDocs(
        query(collection(db, "study_materials"), where("batch", "==", batch))
      );
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudyMaterial));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setMaterials(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load study materials");
    } finally {
      setLoading(false);
    }
  };

  const subjects = ["All", ...Array.from(new Set(materials.map((m) => m.subject).filter(Boolean)))];

  const filtered = materials.filter((m) => {
    const matchSearch =
      m.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.uploadedByName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSubject = filterSubject === "All" || m.subject === filterSubject;
    return matchSearch && matchSubject;
  });

  const grouped = filtered.reduce((acc, m) => {
    const key = m.subject || "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {} as Record<string, StudyMaterial[]>);

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MdFolder className="text-blue-600 text-3xl" />
          Study Materials
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Course notes, videos, and resources shared by your faculty
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Available Materials
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{materials.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Subjects
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {new Set(materials.map((m) => m.subject)).size}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 hidden md:block">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Your Batch
          </p>
          <p className="text-lg font-bold text-gray-900 mt-1 truncate">{studentBatch || "—"}</p>
        </div>
      </div>

      {/* No batch warning */}
      {!loading && !studentBatch && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-sm text-yellow-800">
          Your account is not assigned to a batch yet. Contact your administrator.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
          <input
            type="text"
            placeholder="Search by title, subject, or faculty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          {subjects.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-5 bg-gray-200 rounded mb-3 w-1/4" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="bg-white rounded-xl p-5 border border-gray-100">
                    <div className="h-4 bg-gray-100 rounded mb-2 w-3/4" />
                    <div className="h-3 bg-gray-50 rounded w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : Object.keys(grouped).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(grouped).map(([subject, items]) => (
            <div key={subject}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-base font-bold text-gray-900">{subject}</h2>
                <span className="bg-blue-50 text-blue-600 text-xs font-medium px-2 py-0.5 rounded-full">
                  {items.length} file{items.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((material) => (
                  <div
                    key={material.id}
                    className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        {getFileIcon(material.fileType)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                          {material.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                          <span className="bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded font-mono text-[10px]">
                            {formatFileExtension(material.fileType)}
                          </span>
                          <span>·</span>
                          <span>{formatBytes(material.fileSize)}</span>
                        </div>
                      </div>
                    </div>

                    {material.description && (
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                        {material.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                      <div className="flex items-center gap-1">
                        <MdPerson className="text-sm" />
                        <span className="truncate max-w-[120px]">
                          {material.uploadedByName || "Faculty"}
                        </span>
                      </div>
                      {material.createdAt?.seconds && (
                        <div className="flex items-center gap-1">
                          <MdCalendarToday className="text-xs" />
                          <span>
                            {new Date(material.createdAt.seconds * 1000).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <a
                      href={material.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                    >
                      <MdDownload className="text-lg" />
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <MdFolder className="text-3xl text-gray-300" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No study materials found</h3>
          <p className="text-gray-500 text-sm">
            {searchTerm || filterSubject !== "All"
              ? "Try adjusting your search or filter"
              : studentBatch
              ? "Your faculty hasn't uploaded any materials yet"
              : "No batch assigned to your account"}
          </p>
        </div>
      )}
    </div>
  );
}
