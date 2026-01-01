"use client";
import Image from "next/image";
import React, { useEffect, useState, useRef } from "react";
import { IoIosNotificationsOutline } from "react-icons/io";
import { useAuth } from "../../../context/AuthContext";
import { doc, getDoc, collection, onSnapshot, query, orderBy, limit, updateDoc } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import Link from "next/link";
import toast from "react-hot-toast";

export default function Topbar() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  
  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch Profile
  useEffect(() => {
    const fetchProfile = async () => {
        if (user) {
            try {
                const docRef = doc(db, "faculty", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setProfile(docSnap.data());
                }
            } catch (error) {
                console.error("Error fetching faculty profile", error);
            }
        }
    }
    fetchProfile();
  }, [user]);

  // Fetch Notifications
  useEffect(() => {
    const q = query(
      collection(db, "notifications"), 
      orderBy("createdAt", "desc"), 
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        time: doc.data().createdAt ? new Date(doc.data().createdAt).toLocaleString() : ''
      }));
      setNotifications(list);
    }, (error) => {
      console.error("Notification Error:", error);
    });

    return () => unsubscribe();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = async () => {
    const unreadDocs = notifications.filter(n => !n.read);
    const updatePromises = unreadDocs.map(n => 
        updateDoc(doc(db, "notifications", n.id), { read: true })
    );

    try {
        await Promise.all(updatePromises);
        toast.success("All notifications marked as read");
    } catch (error) {
        console.error("Error updating notifications", error);
    }
  };

  return (
    <div className="h-[11vh] fixed bg-white w-[82vw] flex flex-row items-center justify-between px-[2vw] shadow-sm z-30">
      <div className="">
        <span className="font-semibold text-xl text-primary">
            Welcome, {profile?.name || "Faculty Member"}👋
        </span>
      </div>
      <div className="flex flex-row gap-5 items-center">
        
        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors outline-none cursor-pointer"
            >
                <IoIosNotificationsOutline className="text-[30px] text-primary"/>
                {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full border-2 border-white">
                    {unreadCount}
                </span>
                )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
             <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-800">Notifications</h3>
                    <span onClick={markAllAsRead} className="text-xs text-blue-600 cursor-pointer hover:underline">Mark all as read</span>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length > 0 ? (
                        notifications.map(notif => (
                            <div key={notif.id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.read ? 'bg-blue-50/50' : ''}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`font-medium text-sm ${!notif.read ? 'text-gray-900' : 'text-gray-700'}`}>{notif.title}</span>
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{notif.time ? new Date(notif.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-2">{notif.message}</p>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            No new notifications
                        </div>
                    )}
                </div>
                <div className="p-3 text-center border-t border-gray-100 bg-gray-50">
                    <Link href="/faculty/notifications" className="text-xs font-medium text-primary hover:text-blue-700 transition-colors block w-full">
                        View All Notifications
                    </Link>
                </div>
             </div>
          )}
        </div>

        {/* Profile Link */}
        <Link href="/faculty/profile" className="rounded-full p-1 border-2 border-primary cursor-pointer hover:border-blue-500 transition-colors">
          <Image
            src={profile?.avatar || "/assets/profile.png"}
            alt="Profile"
            width={100}
            height={100}
            className="w-[2.5rem] h-[2.5rem] rounded-full object-cover"
          />
        </Link>
      </div>
    </div>
  );
}
