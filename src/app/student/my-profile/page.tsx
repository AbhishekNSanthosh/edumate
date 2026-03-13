"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { db, storage, auth } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import {
  IoCamera,
  IoSave,
  IoRefresh,
  IoCheckmarkCircle,
} from "react-icons/io5";

interface PersonalInfo {
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  regNumber?: string;
  batch?: string;
}

interface Passwords {
  current: string;
  new: string;
  confirm: string;
}

export default function ProfileSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    fullName: "",
    studentId: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    regNumber: "",
    batch: "",
  });

  const [passwords, setPasswords] = useState<Passwords>({
    current: "",
    new: "",
    confirm: "",
  });

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, "students", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPersonalInfo({
            fullName: data.name || user.displayName || "",
            studentId: data.studentId || "N/A",
            email: user.email || "",
            phone: data.phone || "",
            address1: data.address?.line1 || "",
            address2: data.address?.line2 || "",
            city: data.address?.city || "",
            state: data.address?.state || "",
            zip: data.address?.zip || "",
            country: data.address?.country || "India",
            regNumber: data.regNumber || "",
            batch: data.batch || "",
          });
          if (data.info?.photoUrl) setProfilePhoto(data.info.photoUrl);
          else if (user.photoURL) setProfilePhoto(user.photoURL);
        } else {
          setPersonalInfo((prev) => ({
            ...prev,
            fullName: user.displayName || "",
            email: user.email || "",
          }));
        }
      } catch (error) {
        console.error("Error fetching profile", error);
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handlePersonalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPersonalInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File size must be less than 5MB"); return; }
    setUploadingPhoto(true);
    const toastId = toast.loading("Uploading photo...");
    try {
      const fileRef = ref(storage, `profiles/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      await updateDoc(doc(db, "students", user.uid), { "info.photoUrl": url });
      setProfilePhoto(url);
      toast.success("Profile photo updated", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload photo", { id: toastId });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const toastId = toast.loading("Saving changes...");
    try {
      await updateDoc(doc(db, "students", user.uid), {
        name: personalInfo.fullName,
        phone: personalInfo.phone,
        address: {
          line1: personalInfo.address1,
          line2: personalInfo.address2,
          city: personalInfo.city,
          state: personalInfo.state,
          zip: personalInfo.zip,
          country: personalInfo.country,
        },
        emailNotifications,
      });
      if (passwords.new) {
        if (passwords.new !== passwords.confirm) throw new Error("New passwords do not match");
        if (passwords.new.length < 6) throw new Error("Password must be at least 6 characters");
        if (!passwords.current) throw new Error("Current password is required to change password");
        const credential = EmailAuthProvider.credential(user.email!, passwords.current);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, passwords.new);
        setPasswords({ current: "", new: "", confirm: "" });
        toast.success("Password updated successfully", { id: toastId });
      } else {
        toast.success("Profile updated successfully", { id: toastId });
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.code === "auth/wrong-password" ? "Incorrect current password" : error.message;
      toast.error(msg || "Failed to save changes", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition bg-white";
  const disabledCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed";
  const sectionCls = "bg-white rounded-xl border border-gray-200 p-6";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-64 bg-gray-100 rounded mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center">
              <div className="w-28 h-28 bg-gray-200 rounded-full mb-4" />
              <div className="h-5 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-40 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 h-48" />
            <div className="bg-white rounded-xl border border-gray-200 h-56" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your academic profile and account settings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Avatar card */}
        <div className="lg:col-span-1 space-y-4">
          <div className={`${sectionCls} text-center`}>
            <div className="relative inline-block mb-4 group">
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-gray-200 relative">
                {uploadingPhoto ? (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-white" />
                  </div>
                ) : profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-2xl">
                    {personalInfo.fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "S"}
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

            <h2 className="text-lg font-bold text-gray-900">{personalInfo.fullName || "—"}</h2>
            <p className="text-xs text-gray-500 mb-3">{personalInfo.regNumber || user?.email}</p>

            <div className="flex flex-wrap gap-2 justify-center">
              {personalInfo.batch && (
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
                  {personalInfo.batch}
                </span>
              )}
              <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-100 flex items-center gap-1">
                <IoCheckmarkCircle className="text-green-500" /> Active
              </span>
            </div>
          </div>

          <div className={sectionCls}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</p>
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
              <h2 className="text-base font-semibold text-gray-900 mb-5">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                  <input name="fullName" value={personalInfo.fullName} onChange={handlePersonalChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Register Number</label>
                  <input value={personalInfo.regNumber} disabled className={disabledCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email (Official)</label>
                  <input value={personalInfo.email} disabled className={disabledCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                  <input name="phone" value={personalInfo.phone} onChange={handlePersonalChange} className={inputCls} placeholder="+91..." />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className={sectionCls}>
              <h2 className="text-base font-semibold text-gray-900 mb-5">Address & Location</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address Line 1</label>
                  <input name="address1" value={personalInfo.address1} onChange={handlePersonalChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address Line 2</label>
                  <input name="address2" value={personalInfo.address2} onChange={handlePersonalChange} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                    <input name="city" value={personalInfo.city} onChange={handlePersonalChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                    <input name="state" value={personalInfo.state} onChange={handlePersonalChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Pincode</label>
                    <input name="zip" value={personalInfo.zip} onChange={handlePersonalChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                    <input name="country" value={personalInfo.country} onChange={handlePersonalChange} className={inputCls} />
                  </div>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className={sectionCls}>
              <h2 className="text-base font-semibold text-gray-900 mb-5">Security Settings</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
                  <input type="password" name="current" value={passwords.current} onChange={handlePasswordChange} className={inputCls} placeholder="Required to change password" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
                    <input type="password" name="new" value={passwords.new} onChange={handlePasswordChange} className={inputCls} placeholder="Min 6 characters" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
                    <input type="password" name="confirm" value={passwords.confirm} onChange={handlePasswordChange} className={inputCls} placeholder="Confirm new password" />
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
                  <><IoSave size={16} /> Save Changes</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
