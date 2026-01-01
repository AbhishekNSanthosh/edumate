"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";

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

export default function MyProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [parentData, setParentData] = useState<ParentProfile>({
    name: "",
    email: "",
    phone: "",
    address: "",
    occupation: "",
    relationship: "",
    studentName: "",
    studentId: "",
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
            // 1. Fetch Student Data (for reference)
            const studentDoc = await getDoc(doc(db, "students", user.uid));
            const sData = studentDoc.exists() ? studentDoc.data() : {};

            // 2. Fetch Parent Data
            const parentDocRef = doc(db, "parents", user.uid);
            const parentDoc = await getDoc(parentDocRef);
            
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
                 // Fallback if no parent doc exists yet (should exist from creation, but safety)
                 setParentData({
                    name: "",
                    email: user.email || "",
                    phone: "",
                    address: "",
                    occupation: "",
                    relationship: "Parent",
                    studentName: sData.name || "Student",
                    studentId: sData.regNumber || "",
                 });
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setParentData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File details too large (max 2MB)");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setParentData(prev => ({ ...prev, photoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const toastId = toast.loading("Saving changes...");

    try {
        // 1. Update Firestore Profile
        await updateDoc(doc(db, "parents", user.uid), {
            name: parentData.name,
            email: parentData.email,
            phone: parentData.phone,
            address: parentData.address,
            occupation: parentData.occupation,
            relationship: parentData.relationship,
            photoUrl: parentData.photoUrl
        });

        // 2. Handle Password Change (if provided)
        if (passwords.new) {
            if (passwords.new !== passwords.confirm) {
                toast.error("New passwords do not match", { id: toastId });
                setSaving(false);
                return;
            }
            if (passwords.new.length < 6) {
                toast.error("Password too short", { id: toastId });
                setSaving(false);
                return;
            }
            if (!passwords.current) {
                toast.error("Current password required to change password", { id: toastId });
                setSaving(false);
                return;
            }

            // Re-authenticate
            const credential = EmailAuthProvider.credential(user.email!, passwords.current);
            await reauthenticateWithCredential(user, credential);
            
            // Update
            await updatePassword(user, passwords.new);
            setPasswords({ current: "", new: "", confirm: "" });
            toast.success("Profile & Password Updated!", { id: toastId });
        } else {
            toast.success("Profile Updated!", { id: toastId });
        }

    } catch (error: any) {
        console.error("Update error", error);
        if (error.code === 'auth/wrong-password') {
             toast.error("Incorrect current password", { id: toastId });
        } else {
             toast.error("Failed to update profile", { id: toastId });
        }
    } finally {
        setSaving(false);
    }
  };

  if (loading) return <div className="mt-[100px] flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col mt-[80px] p-6 mb-[50px]">
      <div className="max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Parent Profile</h1>
                    <p className="text-gray-500 text-sm">Manage your contact information and linked student details.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
                {/* Photo & Basic Info */}
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex flex-col items-center space-y-3">
                         <div className="relative w-32 h-32 rounded-full border-4 border-gray-100 shadow overflow-hidden bg-gray-200">
                            {parentData.photoUrl ? (
                                <img src={parentData.photoUrl} alt="Profile" className="w-full h-full object-cover"/>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400 font-bold">
                                    {parentData.name ? parentData.name.charAt(0).toUpperCase() : "P"}
                                </div>
                            )}
                         </div>
                         <label className="cursor-pointer text-sm text-blue-600 font-medium hover:text-blue-700">
                             Change Photo
                             <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload}/>
                         </label>
                    </div>

                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Parent Name</label>
                             <input
                                name="name"
                                value={parentData.name}
                                onChange={handleChange}
                                placeholder="Your Full Name"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                             />
                         </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                             <input
                                name="occupation"
                                value={parentData.occupation}
                                onChange={handleChange}
                                placeholder="e.g. Engineer"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                             />
                         </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Relationship to Student</label>
                             <select
                                name="relationship"
                                value={parentData.relationship}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                             >
                                 <option value="Father">Father</option>
                                 <option value="Mother">Mother</option>
                                 <option value="Guardian">Guardian</option>
                                 <option value="Other">Other</option>
                             </select>
                         </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                             <input
                                name="phone"
                                value={parentData.phone}
                                onChange={handleChange}
                                type="tel"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                             />
                         </div>
                         <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-gray-700 mb-1">Email Address (Login)</label>
                             <div className="flex items-center gap-2">
                                <input
                                    name="email"
                                    value={parentData.email}
                                    readOnly
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                                />
                                <span className="text-xs text-gray-400 shrink-0">Controlled by Student ID</span>
                             </div>
                         </div>
                         <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-gray-700 mb-1">Residential Address</label>
                             <textarea
                                name="address"
                                value={parentData.address}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                             ></textarea>
                         </div>
                    </div>
                </div>

                <hr className="border-gray-100"/>

                {/* Linked Student Info (Read Only) */}
                <div>
                     <h2 className="text-lg font-semibold text-gray-900 mb-4">Linked Student Information</h2>
                     <div className="bg-blue-50 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-blue-100">
                         <div>
                             <p className="text-sm text-blue-800 font-medium">Student Name</p>
                             <p className="text-lg font-bold text-gray-900">{parentData.studentName}</p>
                         </div>
                         <div>
                             <p className="text-sm text-blue-800 font-medium">Register Number</p>
                             <p className="text-lg font-bold text-gray-900">{parentData.studentId}</p>
                         </div>
                         <div className="bg-white px-3 py-1 rounded border border-blue-200 text-xs text-blue-600">
                             Verified Link
                         </div>
                     </div>
                </div>

                <hr className="border-gray-100"/>

                {/* Password Change Warning */}
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
                     <h3 className="text-orange-800 font-semibold mb-1">Account Security</h3>
                     <p className="text-sm text-orange-700 mb-4">
                        Note: You are logged in using Student Credentials. Changing the password here will change it for the student account as well.
                     </p>
                    
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            type="password"
                            name="current"
                            placeholder="Current Password"
                            value={passwords.current}
                            onChange={handlePasswordChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                        <input
                            type="password"
                            name="new"
                            placeholder="New Password"
                            value={passwords.new}
                            onChange={handlePasswordChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                        <input
                            type="password"
                            name="confirm"
                            placeholder="Confirm New Password"
                            value={passwords.confirm}
                            onChange={handlePasswordChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                     </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30"
                    >
                        {saving ? "Saving Changes..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
}