"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { FiLock, FiBell, FiMoon, FiGlobe, FiSmartphone, FiMonitor, FiMapPin, FiClock, FiTrash2 } from "react-icons/fi";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";

interface Session {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string; // ISO string
  isCurrent?: boolean; // Client-side computed
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPass, setLoadingPass] = useState(false);
  
  // Data State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [preferences, setPreferences] = useState({
     emailNotifications: true,
     pushNotifications: false,
     darkMode: false,
     language: "English"
  });

  // 1. Listen to Real-time Profile/Settings Data
  useEffect(() => {
      if (!user) return;
      const unsub = onSnapshot(doc(db, "students", user.uid), (docSnap) => {
          if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.settings) {
                  setPreferences(prev => ({ ...prev, ...data.settings }));
              }
              if (data.sessions && Array.isArray(data.sessions)) {
                  setSessions(data.sessions);
              }
          }
      });
      return () => unsub();
  }, [user]);

  // 2. Register Current Session
  useEffect(() => {
     const registerSession = async () => {
         if (!user) return;
         try {
             // Generate or retrieve persistent Device ID
             let deviceId = localStorage.getItem('edumate_device_id');
             if (!deviceId) {
                 deviceId = Math.random().toString(36).substring(2) + Date.now().toString(36);
                 localStorage.setItem('edumate_device_id', deviceId);
             }

             // Get IP Info
             let ipData = { ip: 'Unknown', city: 'Unknown', country_name: 'Unknown' };
             try {
                const ipRes = await fetch('https://ipapi.co/json/');
                if (ipRes.ok) ipData = await ipRes.json();
             } catch (e) {
                 console.warn("IP Fetch failed", e);
             }

             // Parse UA
             const ua = navigator.userAgent;
             let browser = "Unknown Browser";
             if(ua.includes("Chrome")) browser = "Chrome";
             else if(ua.includes("Safari")) browser = "Safari";
             else if(ua.includes("Firefox")) browser = "Firefox";
             else if(ua.includes("Edg")) browser = "Edge";

             let os = "Desktop";
             if(ua.includes("Win")) os = "Windows PC";
             else if(ua.includes("Mac")) os = "Mac";
             else if(ua.includes("Linux")) os = "Linux";
             else if(ua.includes("Android")) os = "Android Device";
             else if(ua.includes("iPhone") || ua.includes("iPad")) os = "iOS Device";

             const currentSession: Session = {
                 id: deviceId,
                 device: os,
                 browser: browser,
                 ip: ipData.ip || "Unknown",
                 location: ipData.city ? `${ipData.city}, ${ipData.country_name}` : "Unknown Location",
                 lastActive: new Date().toISOString()
             };

             // Update Firestore: Remove old entry for this device ID (to update timestamp) and add new
             // Note: In a real app we'd use a transactional approach or a subcollection. 
             // Here we just pull the current list via ref to be safe or just arrayUnion unique objects.
             // Since 'arrayUnion' only works on primitives or exact object matches, updating timestamp is tricky.
             // We'll read the doc first to check if we need to update.
             
             const userRef = doc(db, "students", user.uid);
             const docSnap = await getDoc(userRef);
             
             if (docSnap.exists()) {
                 const existingSessions = (docSnap.data().sessions || []) as Session[];
                 const otherSessions = existingSessions.filter(s => s.id !== deviceId);
                 
                 await updateDoc(userRef, {
                     sessions: [currentSession, ...otherSessions]
                 });
             } else {
                 // Create doc if missing
                 await setDoc(userRef, {
                     sessions: [currentSession]
                 }, { merge: true });
             }

         } catch (e) {
             console.error("Session Registration Error", e);
         }
     };

     registerSession();
  }, [user]);

  // Handlers
  const handlePreferenceToggle = async (key: keyof typeof preferences) => {
      if (!user) return;
      const newVal = !preferences[key];
      // Optimistic update
      setPreferences(prev => ({ ...prev, [key]: newVal }));
      
      try {
          await updateDoc(doc(db, "students", user.uid), {
             [`settings.${key}`]: newVal
          });
          toast.success("Settings saved");
      } catch (e) {
          console.error(e);
          toast.error("Failed to save setting");
          setPreferences(prev => ({ ...prev, [key]: !newVal })); // Revert
      }
  };

  const handleLogoutSession = async (session: Session) => {
     if (!user) return;
     if (!confirm(`Remove ${session.device} session?`)) return;

     try {
         await updateDoc(doc(db, "students", user.uid), {
             sessions: arrayRemove(session)
         });
         toast.success("Session removed");
     } catch (e) {
         console.error(e);
         toast.error("Failed to remove session");
     }
  };

  const handleLogoutAll = async () => {
      if (!user) return;
      if (!confirm("Log out of all other devices?")) return;
      
      try {
          // Keep only current device
          const deviceId = localStorage.getItem('edumate_device_id');
          const current = sessions.find(s => s.id === deviceId);
          
          await updateDoc(doc(db, "students", user.uid), {
              sessions: current ? [current] : []
          });
           toast.success("All other sessions removed");
      } catch (e) {
          console.error(e);
          toast.error("Failed");
      }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password should be at least 6 characters");
      return;
    }

    setLoadingPass(true);
    const toastId = toast.loading("Updating password...");

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      toast.success("Password updated successfully", { id: toastId });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error(error);
      const msg = error.code === 'auth/wrong-password' ? 'Incorrect current password' : error.message;
      toast.error(msg, { id: toastId });
    } finally {
      setLoadingPass(false);
    }
  };

  // Helper to check if a session in the list is the current one
  const isCurrentSession = (sid: string) => {
      if (typeof window === 'undefined') return false;
      return sid === localStorage.getItem('edumate_device_id');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen mt-[80px] mb-[60px]">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your application preferences and active sessions.</p>
        </div>

         {/* Device History / Active Sessions */}
         <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg text-green-600 border border-green-100">
                        <FiMonitor size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Active Sessions</h2>
                        <p className="text-sm text-gray-500">Devices logged into your account</p>
                    </div>
                </div>
                {sessions.length > 1 && (
                    <button 
                        onClick={handleLogoutAll}
                        className="text-sm text-red-600 font-medium hover:bg-red-50 px-3 py-1.5 rounded-lg transition"
                    >
                        Log out all other devices
                    </button>
                )}
            </div>
            
            <div className="divide-y divide-gray-100">
                {sessions.length === 0 && <p className="p-6 text-gray-400 italic">No active sessions info</p>}
                {sessions.map(session => {
                    const current = isCurrentSession(session.id);
                    return (
                        <div key={session.id} className={`p-5 flex items-start justify-between hover:bg-gray-50 transition border-l-4 ${current ? 'border-l-green-500 bg-green-50/10' : 'border-l-transparent'}`}>
                            <div className="flex gap-4">
                                <div className={`mt-1 p-2 rounded-full ${current ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                    {session.device.includes('iPhone') || session.device.includes('iOS') || session.device.includes('Android') 
                                        ? <FiSmartphone size={20}/> 
                                        : <FiMonitor size={20}/> 
                                    }
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        {session.device}
                                        {current && (
                                            <span className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-bold shadow-sm">This Device</span>
                                        )}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-0.5 font-medium">{session.browser} • {session.ip}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                        <span className="flex items-center gap-1"><FiMapPin size={12}/> {session.location}</span>
                                        <span className="flex items-center gap-1"><FiClock size={12}/> Last active: {new Date(session.lastActive).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            {!current && (
                                <button 
                                    onClick={() => handleLogoutSession(session)}
                                    className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition"
                                    title="Remove this session"
                                >
                                    <FiTrash2 size={18}/>
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
                <FiLock size={20} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-900">Security</h2>
                <p className="text-sm text-gray-500">Update your password</p>
            </div>
          </div>
          
          <div className="p-6">
            <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                    required
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input 
                            type="password" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New</label>
                        <input 
                            type="password" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                            required
                        />
                    </div>
               </div>
               
               <button 
                type="submit" 
                disabled={loadingPass}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium shadow-sm shadow-blue-200"
               >
                 {loadingPass ? "Updating..." : "Update Password"}
               </button>
            </form>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center gap-3">
             <div className="p-2 bg-purple-50 rounded-lg text-purple-600 border border-purple-100">
                <FiGlobe size={20} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-900">Preferences</h2>
                <p className="text-sm text-gray-500">Customize your experience</p>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
             {/* Email Notifications */}
             <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FiBell className="text-gray-400" size={20}/>
                    <div>
                        <p className="font-medium text-gray-900">Email Notifications</p>
                        <p className="text-sm text-gray-500">Receive updates regarding assignments</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={preferences.emailNotifications} 
                    onChange={() => handlePreferenceToggle('emailNotifications')} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
             </div>

             {/* Dark Mode */}
             <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FiMoon className="text-gray-400" size={20}/>
                    <div>
                        <p className="font-medium text-gray-900">Dark Mode</p>
                        <p className="text-sm text-gray-500">Use dark theme across the application</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={preferences.darkMode} 
                    onChange={() => handlePreferenceToggle('darkMode')} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
