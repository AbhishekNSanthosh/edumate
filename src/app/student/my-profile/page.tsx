"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { db, storage, auth } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";
import { IoCamera, IoSave, IoRefresh, IoCheckmarkCircle } from "react-icons/io5";

interface PersonalInfo {
  fullName: string;
  studentId: string; // Read-only usually
  email: string;     // Read-only
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
  
  // State for personal information
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
    batch: ""
  });

  // State for password fields
  const [passwords, setPasswords] = useState<Passwords>({
    current: "",
    new: "",
    confirm: "",
  });

  const [profilePhoto, setProfilePhoto] = useState<string>("/assets/profile.png");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);

  // Fetch User Data
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
            studentId: data.studentId || "N/A", // Often internal ID
            email: user.email || "",
            phone: data.phone || "",
            address1: data.address?.line1 || "",
            address2: data.address?.line2 || "",
            city: data.address?.city || "",
            state: data.address?.state || "",
            zip: data.address?.zip || "",
            country: data.address?.country || "India",
            regNumber: data.regNumber || "",
            batch: data.batch || ""
          });
          if (data.info?.photoUrl) {
              setProfilePhoto(data.info.photoUrl);
          } else if (user.photoURL) {
              setProfilePhoto(user.photoURL);
          }
        } else {
            // Fallback if no specific student doc, use Auth info
            setPersonalInfo(prev => ({
                ...prev,
                fullName: user.displayName || "",
                email: user.email || ""
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

  // Handlers
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

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploadingPhoto(true);
    const toastId = toast.loading("Uploading photo...");

    try {
        // Upload to Firebase Storage
        const fileRef = ref(storage, `profiles/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);

        // Update Firestore & Local State
        await updateDoc(doc(db, "students", user.uid), {
            "info.photoUrl": url
        });
        
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
        // 1. Update Personal Info in Firestore
        const studentRef = doc(db, "students", user.uid);
        await updateDoc(studentRef, {
            name: personalInfo.fullName,
            phone: personalInfo.phone,
            address: {
                line1: personalInfo.address1,
                line2: personalInfo.address2,
                city: personalInfo.city,
                state: personalInfo.state,
                zip: personalInfo.zip,
                country: personalInfo.country
            },
            emailNotifications // Assuming we store this preference
        });

        // 2. Handle Password Change if requested
        if (passwords.new) {
            if (passwords.new !== passwords.confirm) {
                throw new Error("New passwords do not match");
            }
            if (passwords.new.length < 6) {
                throw new Error("Password must be at least 6 characters");
            }
            if (!passwords.current) {
                throw new Error("Current password is required to change password");
            }

            // Re-authenticate
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
        const msg = error.code === 'auth/wrong-password' ? 'Incorrect current password' : error.message;
        toast.error(msg || "Failed to save changes", { id: toastId });
    } finally {
        setSaving(false);
    }
  };

  if (loading) {
     return (
        <div className="flex items-center justify-center min-h-[60vh] mt-[80px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
     )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col mt-[80px] p-6 mb-[50px]">
        
      <div className="w-full">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-500 mt-1">Manage your academic profile and account settings.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Photo & Core Info */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
                    <div className="relative inline-block mb-4 group">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-50 mx-auto relative">
                             {uploadingPhoto ? (
                                 <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                 </div>
                             ) : (
                                <img 
                                    src={profilePhoto}
                                    alt="Profile" 
                                    className="w-full h-full object-cover"
                                />
                             )}
                        </div>
                        <label 
                            htmlFor="photo-upload" 
                            className="absolute bottom-0 right-2 p-2 bg-blue-600 text-white rounded-full cursor-pointer hover:bg-blue-700 transition shadow-lg"
                            title="Update Photo"
                        >
                            <IoCamera size={18}/>
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
                    
                    <h2 className="text-xl font-bold text-gray-900">{personalInfo.fullName}</h2>
                    <p className="text-sm text-gray-500 mb-4">{personalInfo.regNumber || user?.email}</p>
                    
                    <div className="flex flex-wrap gap-2 justify-center">
                         {personalInfo.batch && (
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
                                {personalInfo.batch}
                            </span>
                         )}
                         <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-100 flex items-center gap-1">
                             <IoCheckmarkCircle className="text-green-500"/> Active Student
                         </span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                   <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Quick Actions</h3>
                   <div className="space-y-2">
                       <button 
                         onClick={() => window.location.reload()}
                         className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-left text-gray-700 transition-colors text-sm font-medium"
                       >
                           <IoRefresh size={18} className="text-gray-400"/>
                           Refresh Profile Data
                       </button>
                   </div>
                </div>
            </div>

            {/* Right Column: Edit Form */}
            <div className="lg:col-span-2">
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Basics */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            Personal Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input 
                                    name="fullName"
                                    value={personalInfo.fullName}
                                    onChange={handlePersonalChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Register Number</label>
                                <input 
                                    value={personalInfo.regNumber}
                                    disabled
                                    className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email (Official)</label>
                                <input 
                                    value={personalInfo.email}
                                    disabled
                                    className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input 
                                    name="phone"
                                    value={personalInfo.phone}
                                    onChange={handlePersonalChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder="+91..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">Address & Location</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                                <input 
                                    name="address1"
                                    value={personalInfo.address1}
                                    onChange={handlePersonalChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                                <input 
                                    name="address2"
                                    value={personalInfo.address2}
                                    onChange={handlePersonalChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                    <input 
                                        name="city"
                                        value={personalInfo.city}
                                        onChange={handlePersonalChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                    <input 
                                        name="state"
                                        value={personalInfo.state}
                                        onChange={handlePersonalChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                                    <input 
                                        name="zip"
                                        value={personalInfo.zip}
                                        onChange={handlePersonalChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    />
                                </div>
                                <div>
                                     <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                    <input 
                                        name="country"
                                        value={personalInfo.country}
                                        onChange={handlePersonalChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security */}
                     <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">Security Settings</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password (Required to change)</label>
                                <input 
                                    type="password"
                                    name="current"
                                    value={passwords.current}
                                    onChange={handlePasswordChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                    <input 
                                        type="password"
                                        name="new"
                                        value={passwords.new}
                                        onChange={handlePasswordChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                        placeholder="Min 6 characters"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                    <input 
                                        type="password"
                                        name="confirm"
                                        value={passwords.confirm}
                                        onChange={handlePasswordChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                        placeholder="Confirm new password"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-4 p-4 sticky bottom-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 z-10 rounded-xl">
                        <button 
                            type="button"
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition"
                        >
                            Discard
                        </button>
                        <button 
                            type="submit"
                            disabled={saving}
                            className="px-8 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {saving ? (
                                <><div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div> Saving...</>
                            ) : (
                                <><IoSave size={18}/> Save Changes</>
                            )}
                        </button>
                    </div>

                </form>
            </div>
          </div>
      </div>
    </div>
  );
}
