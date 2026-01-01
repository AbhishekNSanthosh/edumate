"use client"
import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { IoCameraOutline, IoSaveOutline, IoLogOutOutline } from "react-icons/io5";

export default function AdminProfilePage() {
    const { user, logout } = useAuth()
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    
    const [profile, setProfile] = useState({
        name: '',
        phone: '',
        role: 'Administrator',
        department: '',
        bio: '',
        avatar: '/assets/profile.png' // Default
    })
    
    const [sessionInfo, setSessionInfo] = useState({
        ip: 'Loading...',
        browser: 'Unknown',
        os: 'Unknown'
    })

    useEffect(() => {
        // Simple User Agent Parser
        const ua = window.navigator.userAgent;
        let browser = "Unknown";
        let os = "Unknown";

        if (ua.indexOf("Firefox") > -1) browser = "Mozilla Firefox";
        else if (ua.indexOf("SamsungBrowser") > -1) browser = "Samsung Internet";
        else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) browser = "Opera";
        else if (ua.indexOf("Trident") > -1) browser = "Microsoft Internet Explorer";
        else if (ua.indexOf("Edge") > -1) browser = "Microsoft Edge";
        else if (ua.indexOf("Chrome") > -1) browser = "Google Chrome";
        else if (ua.indexOf("Safari") > -1) browser = "Apple Safari";

        if (ua.indexOf("Win") > -1) os = "Windows";
        else if (ua.indexOf("Mac") > -1) os = "MacOS";
        else if (ua.indexOf("Linux") > -1) os = "Linux";
        else if (ua.indexOf("Android") > -1) os = "Android";
        else if (ua.indexOf("like Mac") > -1) os = "iOS";

        setSessionInfo(prev => ({ ...prev, browser, os }));

        // Fetch IP
        fetch('https://api64.ipify.org?format=json')
            .then(res => res.json())
            .then(data => setSessionInfo(prev => ({ ...prev, ip: data.ip })))
            .catch(() => setSessionInfo(prev => ({ ...prev, ip: 'Unavailable' })));
    }, []);

    useEffect(() => {
        const fetchProfile = async () => {
            if (user) {
                try {
                    const docRef = doc(db, "admins", user.uid)
                    const docSnap = await getDoc(docRef)
                    
                    if (docSnap.exists()) {
                        setProfile({ ...profile, ...docSnap.data() })
                    } else {
                        // Init profile if not exists
                        setProfile(p => ({ ...p, name: user.displayName || 'Admin', email: user.email }))
                    }
                } catch (error) {
                    console.error("Error fetching profile", error)
                } finally {
                    setLoading(false)
                }
            }
        }
        fetchProfile()
    }, [user])

    const handleSave = async () => {
        if (!user) return;
        try {
            await setDoc(doc(db, "admins", user.uid), {
                ...profile,
                email: user.email, // Ensure email stays synced
                updatedAt: new Date().toISOString()
            }, { merge: true })
            
            setIsEditing(false)
            toast.success("Profile updated successfully")
        } catch (error) {
            console.error(error)
            toast.error("Failed to update profile")
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !user) return;
        
        const file = e.target.files[0];
        setUploading(true);

        try {
            const storageRef = ref(storage, `admin_avatars/${user.uid}/${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            
            setProfile(prev => ({ ...prev, avatar: downloadURL }));
            
            // Auto update in Firestore
            await setDoc(doc(db, "admins", user.uid), {
                avatar: downloadURL
            }, { merge: true });

            toast.success("Profile picture updated");
        } catch (error) {
            console.error("Upload error", error);
            toast.error("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>

    return (
        <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                    
                    {/* Cover / Header */}
                    <div className="h-48 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
                        <div className="absolute -bottom-16 left-8">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-white">
                                    <Image 
                                        src={profile.avatar || "/assets/profile.png"} 
                                        alt="Profile" 
                                        width={128} 
                                        height={128}
                                        className={`object-cover w-full h-full ${uploading ? 'opacity-50' : ''}`}
                                    />
                                     {uploading && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-2 right-2 p-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer"
                                    title="Change Profile Picture"
                                >
                                    <IoCameraOutline />
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleImageUpload} 
                                    className="hidden" 
                                    accept="image/*"
                                />
                            </div>
                        </div>
                        <div className="absolute top-4 right-4 flex space-x-2">
                             <button 
                                onClick={logout}
                                className="flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-colors text-sm font-medium"
                             >
                                <IoLogOutOutline className="mr-2 text-lg"/>
                                Logout
                             </button>
                        </div>
                    </div>

                    <div className="pt-20 px-8 pb-8">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{profile.name || 'Admin User'}</h1>
                                <p className="text-gray-500">{user?.email}</p>
                            </div>
                            <button
                                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                    isEditing 
                                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-md transform hover:-translate-y-0.5' 
                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                                }`}
                            >
                                {isEditing ? (
                                    <>
                                        <IoSaveOutline className="mr-2 text-lg"/>
                                        Save Changes
                                    </>
                                ) : (
                                    'Edit Profile'
                                )}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Personal Info */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Personal Information</h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
                                        <input 
                                            type="text" 
                                            disabled={!isEditing}
                                            value={profile.name}
                                            onChange={e => setProfile({...profile, name: e.target.value})}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-600 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 mb-1">Phone Number</label>
                                        <input 
                                            type="tel" 
                                            disabled={!isEditing}
                                            value={profile.phone}
                                            onChange={e => setProfile({...profile, phone: e.target.value})}
                                            placeholder="+1 (555) 000-0000"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-600 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 mb-1">Bio</label>
                                        <textarea 
                                            disabled={!isEditing}
                                            value={profile.bio}
                                            onChange={e => setProfile({...profile, bio: e.target.value})}
                                            rows={3}
                                            placeholder="Write a short bio..."
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-600 transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Job Info */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Role & Department</h3>
                                
                                <div className="space-y-4">
                                     <div>
                                        <label className="block text-sm font-medium text-gray-500 mb-1">Role</label>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                disabled
                                                value={profile.role}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                                            />
                                            <span className="absolute right-3 top-2.5 text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                                System
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 mb-1">Department</label>
                                        <input 
                                            type="text" 
                                            disabled={!isEditing}
                                            value={profile.department}
                                            onChange={e => setProfile({...profile, department: e.target.value})}
                                            placeholder="e.g. Administration"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-600 transition-all"
                                        />
                                    </div>
                                    
                                    <div className="bg-blue-50 rounded-lg p-4 mt-6">
                                        <h4 className="text-sm font-semibold text-blue-800 mb-2">Account Status</h4>
                                        <div className="flex items-center space-x-2 mb-3">
                                            <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                                            <span className="text-sm text-blue-900">Active</span>
                                        </div>
                                        
                                        <div className="border-t border-blue-200 pt-3 space-y-2">
                                            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Current Session</p>
                                            <div className="flex justify-between items-center text-xs text-blue-700">
                                                <span>IP Address:</span>
                                                <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">{sessionInfo.ip}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-blue-700">
                                                <span>Device:</span>
                                                <span className="font-medium">{sessionInfo.os} - {sessionInfo.browser}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-blue-700">
                                                <span>Last Login:</span>
                                                <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}
