"use client";
import Image from "next/image";
import React, { useState, useEffect, useRef } from "react";
import { IoIosNotificationsOutline } from "react-icons/io";
import { useAuth } from "../../../context/AuthContext";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import { IoTimeOutline, IoClose } from "react-icons/io5";
import { FiMenu } from "react-icons/fi";

interface TopbarProps {
  onMenuToggle?: () => void;
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const { user } = useAuth();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // 1. Fetch User Profile Photo (Real-time to sync with Profile page uploads)
  useEffect(() => {
    if (!user) return;

    // Set initial from Auth
    setProfilePhoto(user.photoURL);
    setUserName(user.displayName);

    const unsub = onSnapshot(doc(db, "students", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.info?.photoUrl) {
          setProfilePhoto(data.info.photoUrl);
        }
        if (data.name) {
          setUserName(data.name);
        }
      }
    });
    return () => unsub();
  }, [user]);

  // 2. Fetch Notifications (Student specific)
  useEffect(() => {
    if (!user) return;

    // Query for notifications where audience array contains 'student'
    // Removing orderBy to avoid index creation requirement error. Sorting client-side instead.
    const q = query(
      collection(db, "notifications"),
      where("audience", "array-contains", "student"),
      limit(20),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Client-side sort
      items.sort((a: any, b: any) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });

      setNotifications(items);
      setUnreadCount(items.length);
    });

    return () => unsub();
  }, [user]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const formatDate = (date: any) => {
    if (!date) return "";
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    // Simple format: "2 hrs ago" or date
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHrs < 24)
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString();
  };

  return (
    <div className="h-[11vh] fixed left-0 lg:left-[17vw] w-full lg:w-[calc(100vw-17vw)] bg-white flex flex-row items-center justify-between px-4 lg:px-[2vw] z-40 border-b border-gray-100">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          aria-label="Open menu"
        >
          <FiMenu size={22} />
        </button>

        <span className="font-semibold text-base sm:text-xl text-primary capitalize truncate max-w-[45vw] sm:max-w-none">
          Welcome,{" "}
          {(
            userName ||
            user?.displayName ||
            user?.email?.split("@")[0] ||
            "Student"
          ).toLowerCase()}{" "}
          👋
        </span>
      </div>

      <div className="flex flex-row gap-6 items-center">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <div
            className="relative cursor-pointer group"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <IoIosNotificationsOutline className="text-[30px] text-gray-600 group-hover:text-blue-600 transition" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>

          {/* Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 origin-top-right z-[60]">
              <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <IoClose size={20} />
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {notifications.map((notif: any) => (
                      <div
                        key={notif.id}
                        className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-sm font-semibold text-gray-800 line-clamp-1">
                            {notif.title}
                          </h4>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2 flex items-center gap-1">
                            <IoTimeOutline /> {formatDate(notif.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                    <IoIosNotificationsOutline
                      size={30}
                      className="mb-2 opacity-20"
                    />
                    <p className="text-sm">No new notifications</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar */}
        <div className="rounded-full p-0.5 border-2 border-primary/20 hover:border-blue-500 transition-colors overflow-hidden w-[2.8rem] h-[2.8rem] flex items-center justify-center relative cursor-pointer shadow-sm">
          {profilePhoto ? (
            <img
              src={profilePhoto}
              alt="Profile"
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <div className="w-full h-full bg-blue-50 flex items-center justify-center rounded-full text-sm font-bold text-blue-600">
              {user?.displayName
                ? user.displayName.charAt(0).toUpperCase()
                : "S"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
