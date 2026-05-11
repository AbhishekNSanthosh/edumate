"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import {
  IoCamera,
  IoSave,
  IoRefresh,
  IoCheckmarkCircle,
  IoPersonOutline,
  IoShieldOutline,
  IoSchoolOutline,
} from "react-icons/io5";

interface ParentProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  occupation: string;
  relationship: string;
  studentName: string;
  studentId: string;
  photoUrl?: string;
}

const inputCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition bg-white";
const disabledCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed";
const sectionCls = "bg-white rounded-lg border border-gray-200 p-6";

export default function MyProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [parentData, setParentData] = useState<ParentProfile>({
    name: "",
    email: "",
    phone: "",
    address: "",
    occupation: "",
    relationship: "Parent",
    studentName: "",
    studentId: "",
    photoUrl: "",
  });

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const studentDoc = await getDoc(doc(db, "students", user.uid));
        const sData = studentDoc.exists() ? studentDoc.data() : {};

        const parentDoc = await getDoc(doc(db, "parents", user.uid));

        if (parentDoc.exists()) {
          const pData = parentDoc.data();
          setParentData({
            name: pData.name || "",
            email: pData.email || user.email || "",
            phone: pData.phone || "",
            address: pData.address || "",
            occupation: pData.occupation || "",
            relationship: pData.relationship || "Parent",
            studentName: sData.name || "Student",
            studentId: sData.regNumber || "",
            photoUrl: pData.photoUrl || "",
          });
        } else {
          setParentData((prev) => ({
            ...prev,
            email: user.email || "",
            studentName: sData.name || "Student",
            studentId: sData.regNumber || "",
          }));
        }
      } catch (error) {
        console.error("Error fetching profile", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setParentData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 0.5 * 1024 * 1024) {
      toast.error("File size too large. Please upload an image under 500KB.");
      return;
    }

    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setParentData((prev) => ({ ...prev, photoUrl: reader.result as string }));
      }
      setUploadingPhoto(false);
    };
    reader.onerror = () => {
      toast.error("Failed to read image");
      setUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const toastId = toast.loading("Saving changes...");

    try {
      await setDoc(
        doc(db, "parents", user.uid),
        {
          name: parentData.name,
          email: parentData.email,
          phone: parentData.phone,
          address: parentData.address,
          occupation: parentData.occupation,
          relationship: parentData.relationship,
          photoUrl: parentData.photoUrl,
        },
        { merge: true },
      );

      if (passwords.new) {
        if (passwords.new !== passwords.confirm) {
          toast.error("New passwords do not match", { id: toastId });
          setSaving(false);
          return;
        }
        if (passwords.new.length < 6) {
          toast.error("Password too short — minimum 6 characters", { id: toastId });
          setSaving(false);
          return;
        }
        if (!passwords.current) {
          toast.error("Current password required", { id: toastId });
          setSaving(false);
          return;
        }
        const credential = EmailAuthProvider.credential(user.email!, passwords.current);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, passwords.new);
        setPasswords({ current: "", new: "", confirm: "" });
        toast.success("Profile & password updated!", { id: toastId });
      } else {
        toast.success("Profile updated!", { id: toastId });
      }
    } catch (error: any) {
      console.error("Update error", error);
      const msg =
        error.code === "auth/wrong-password"
          ? "Incorrect current password"
          : "Failed to update profile";
      toast.error(msg, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const initials =
    parentData.name?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "P";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-64 bg-gray-100 rounded mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col items-center">
              <div className="w-28 h-28 bg-gray-200 rounded-full mb-4" />
              <div className="h-5 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-40 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 h-48" />
            <div className="bg-white rounded-lg border border-gray-200 h-56" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage your contact information and account settings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Avatar card */}
        <div className="lg:col-span-1 space-y-4">
          <div className={`${sectionCls} text-center`}>
            <div className="relative inline-block mb-4">
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-gray-200 relative">
                {uploadingPhoto ? (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-white" />
                  </div>
                ) : parentData.photoUrl ? (
                  <img
                    src={parentData.photoUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-2xl">
                    {initials}
                  </div>
                )}
              </div>
              <label
                htmlFor="photo-upload"
                className="absolute bottom-0 right-1 p-1.5 bg-blue-600 text-white rounded-full cursor-pointer hover:bg-blue-700 transition"
                title="Update Photo"
              >
                <IoCamera size={16} />
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
              />
            </div>

            <h2 className="text-lg font-bold text-gray-900">
              {parentData.name || "—"}
            </h2>
            <p className="text-xs text-gray-500 mb-1">{parentData.email}</p>
            <p className="text-xs text-gray-400 mb-3">{parentData.occupation || "Parent / Guardian"}</p>

            <div className="flex flex-wrap gap-2 justify-center">
              <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full border border-purple-100">
                {parentData.relationship || "Parent"}
              </span>
              <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-100 flex items-center gap-1">
                <IoCheckmarkCircle className="text-green-500" /> Active
              </span>
            </div>
          </div>

          {/* Linked Student Card */}
          <div className={sectionCls}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <IoSchoolOutline size={14} /> Linked Student
            </p>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-400">Student Name</p>
                <p className="text-sm font-semibold text-gray-800">
                  {parentData.studentName || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Register Number</p>
                <p className="text-sm font-semibold text-gray-800">
                  {parentData.studentId || "—"}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 mt-1 text-xs text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                <IoCheckmarkCircle size={11} /> Verified Link
              </span>
            </div>
          </div>

          <div className={sectionCls}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Quick Actions
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 text-left text-gray-700 transition-colors text-sm"
            >
              <IoRefresh size={16} className="text-gray-400" />
              Refresh Profile Data
            </button>
          </div>
        </div>

        {/* Right — Edit form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Personal Information */}
            <div className={sectionCls}>
              <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
                <IoPersonOutline size={17} className="text-gray-400" />
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Full Name
                  </label>
                  <input
                    name="name"
                    value={parentData.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Occupation
                  </label>
                  <input
                    name="occupation"
                    value={parentData.occupation}
                    onChange={handleChange}
                    placeholder="e.g. Engineer"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Relationship to Student
                  </label>
                  <select
                    name="relationship"
                    value={parentData.relationship}
                    onChange={handleChange}
                    className={inputCls}
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Contact Number
                  </label>
                  <input
                    name="phone"
                    value={parentData.phone}
                    onChange={handleChange}
                    type="tel"
                    placeholder="+91..."
                    className={inputCls}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Email Address
                  </label>
                  <input
                    value={parentData.email}
                    disabled
                    className={disabledCls}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Residential Address
                  </label>
                  <textarea
                    name="address"
                    value={parentData.address}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Enter your address..."
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </div>
            </div>

            {/* Security */}
            <div className={sectionCls}>
              <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <IoShieldOutline size={17} className="text-gray-400" />
                Security Settings
              </h2>
              <p className="text-xs text-orange-600 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 mb-4">
                Changing the password here will also update the linked student account.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="current"
                    value={passwords.current}
                    onChange={handlePasswordChange}
                    placeholder="Required to change password"
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      name="new"
                      value={passwords.new}
                      onChange={handlePasswordChange}
                      placeholder="Min 6 characters"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="confirm"
                      value={passwords.confirm}
                      onChange={handlePasswordChange}
                      placeholder="Confirm new password"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 py-2 rounded-lg text-gray-600 text-sm font-medium border border-gray-200 hover:bg-gray-50 transition"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <IoSave size={16} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
