"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import {
  MdUpload,
  MdDelete,
  MdFolder,
  MdInsertDriveFile,
  MdPictureAsPdf,
  MdVideoLibrary,
  MdImage,
  MdClose,
  MdSearch,
  MdCloudUpload,
  MdDownload,
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
  uploadedBy: string;
  uploadedByName: string;
  createdAt: any;
}

const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf: <MdPictureAsPdf className="text-red-500 text-2xl" />,
  video: <MdVideoLibrary className="text-purple-500 text-2xl" />,
  image: <MdImage className="text-green-500 text-2xl" />,
  default: <MdInsertDriveFile className="text-blue-500 text-2xl" />,
};

function getFileIcon(fileType: string) {
  if (fileType.includes("pdf")) return FILE_ICONS.pdf;
  if (fileType.includes("video")) return FILE_ICONS.video;
  if (fileType.includes("image")) return FILE_ICONS.image;
  return FILE_ICONS.default;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function FacultyStudyMaterials() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("All");
  const [profile, setProfile] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    subject: "",
    batch: "",
    file: null as File | null,
  });

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    fetchMaterials();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "faculty"), where("authUid", "==", user!.uid))
      );
      if (!snap.empty) setProfile(snap.docs[0].data());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, "study_materials"),
        where("uploadedBy", "==", user!.uid)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudyMaterial));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setMaterials(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
      return;
    }
    setForm((prev) => ({ ...prev, file }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
      return;
    }
    setForm((prev) => ({ ...prev, file }));
  };

  const handleUpload = async () => {
    if (!form.title || !form.subject || !form.batch || !form.file) {
      toast.error("Please fill all required fields and select a file");
      return;
    }

    try {
      setUploading(true);
      const storageRef = ref(
        storage,
        `study_materials/${user!.uid}/${Date.now()}_${form.file.name}`
      );

      const uploadTask = uploadBytesResumable(storageRef, form.file);

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
          toast.error("Upload failed");
          setUploading(false);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, "study_materials"), {
            title: form.title,
            description: form.description,
            subject: form.subject,
            batch: form.batch,
            fileUrl: url,
            fileName: form.file!.name,
            fileType: form.file!.type,
            fileSize: form.file!.size,
            uploadedBy: user!.uid,
            uploadedByName: profile?.name || "Faculty",
            createdAt: serverTimestamp(),
          });
          toast.success("Material uploaded successfully!");
          setForm({ title: "", description: "", subject: "", batch: "", file: null });
          setShowUploadModal(false);
          setUploading(false);
          setUploadProgress(0);
          fetchMaterials();
        }
      );
    } catch (e) {
      console.error(e);
      toast.error("Upload failed");
      setUploading(false);
    }
  };

  const handleDelete = async (material: StudyMaterial) => {
    if (!confirm("Delete this material? Students will lose access.")) return;
    try {
      await deleteDoc(doc(db, "study_materials", material.id));
      const fileRef = ref(storage, material.fileUrl);
      await deleteObject(fileRef).catch(() => {});
      toast.success("Material deleted");
      fetchMaterials();
    } catch (e) {
      console.error(e);
      toast.error("Delete failed");
    }
  };

  const subjects = ["All", ...Array.from(new Set(materials.map((m) => m.subject)))];
  const filtered = materials.filter((m) => {
    const matchSearch =
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSubject = filterSubject === "All" || m.subject === filterSubject;
    return matchSearch && matchSubject;
  });

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MdFolder className="text-blue-600 text-3xl" />
            Study Materials
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Upload and manage course resources for your students
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-200"
        >
          <MdUpload className="text-xl" />
          Upload Material
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Materials", value: materials.length, color: "blue" },
          {
            label: "Subjects Covered",
            value: new Set(materials.map((m) => m.subject)).size,
            color: "green",
          },
          {
            label: "Total Size",
            value: formatBytes(materials.reduce((s, m) => s + (m.fileSize || 0), 0)),
            color: "purple",
          },
          {
            label: "Batches",
            value: new Set(materials.map((m) => m.batch)).size,
            color: "orange",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
          >
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
          <input
            type="text"
            placeholder="Search materials..."
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
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Materials Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-3 w-3/4" />
              <div className="h-4 bg-gray-100 rounded mb-2 w-1/2" />
              <div className="h-4 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((material) => (
            <div
              key={material.id}
              className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100">
                    {getFileIcon(material.fileType)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                      {material.title}
                    </h3>
                    <p className="text-xs text-gray-500">{material.fileName}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(material)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <MdDelete className="text-lg" />
                </button>
              </div>

              {material.description && (
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                  {material.description}
                </p>
              )}

              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                  {material.subject}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {material.batch}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <span className="text-xs text-gray-400">
                  {formatBytes(material.fileSize)}
                </span>
                <a
                  href={material.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  <MdDownload className="text-sm" />
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <MdFolder className="text-4xl text-blue-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No materials yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            Upload your first study material to get started
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Upload Material
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Upload Study Material</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setForm({ title: "", description: "", subject: "", batch: "", file: null });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <MdClose className="text-xl text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g., Data Structures - Unit 2 Notes"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                    placeholder="e.g., Mathematics"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.batch}
                    onChange={(e) => setForm((p) => ({ ...p, batch: e.target.value }))}
                    placeholder="e.g., CSE 2024"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of this material..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Dropzone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition"
              >
                {form.file ? (
                  <div className="flex items-center justify-center gap-3">
                    {getFileIcon(form.file.type)}
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{form.file.name}</p>
                      <p className="text-xs text-gray-500">{formatBytes(form.file.size)}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setForm((p) => ({ ...p, file: null }));
                      }}
                      className="ml-auto text-gray-400 hover:text-red-500"
                    >
                      <MdClose />
                    </button>
                  </div>
                ) : (
                  <>
                    <MdCloudUpload className="text-4xl text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-600">
                      Drop file here or click to browse
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PDF, Word, PowerPoint, Video, Images (max 50MB)
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.jpg,.jpeg,.png,.xlsx"
                />
              </div>

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

            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setForm({ title: "", description: "", subject: "", batch: "", file: null });
                }}
                disabled={uploading}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-60"
              >
                {uploading ? `Uploading ${uploadProgress}%` : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
