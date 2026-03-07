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

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // 2. Fetch Notifications (role-wide + personalized)
  useEffect(() => {
    if (!user) return;

    let roleNotifs: any[] = [];
    let personalNotifs: any[] = [];
    let prevPersonalIds = new Set<string>();
    let isFirstLoad = true;

    const mergeAndSet = () => {
      // Deduplicate by id, merge both sources
      const map = new Map<string, any>();
      [...roleNotifs, ...personalNotifs].forEach((n) => map.set(n.id, n));
      const merged = Array.from(map.values());

      // Client-side sort by createdAt descending
      merged.sort((a: any, b: any) => {
        const tA = a.createdAt?.seconds || new Date(a.createdAt || 0).getTime() / 1000;
        const tB = b.createdAt?.seconds || new Date(b.createdAt || 0).getTime() / 1000;
        return tB - tA;
      });

      setNotifications(merged.slice(0, 20));
      setUnreadCount(merged.filter((n: any) => !n.read).length);
    };

    // Show browser notification for new personal alerts
    const showBrowserNotification = (notif: any) => {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;

      const icon = notif.type === "warning" ? "/warning-icon.png" : "/info-icon.png";
      const n = new Notification(notif.title || "EduMate Alert", {
        body: notif.message || "",
        icon,
        badge: "/favicon.ico",
        tag: notif.id, // prevents duplicate browser notifications
      });
      // Auto-close after 8 seconds
      setTimeout(() => n.close(), 8000);
    };

    // Query 1: Role-wide notifications
    const roleQ = query(
      collection(db, "notifications"),
      where("audience", "array-contains", "student"),
      limit(20),
    );
    const unsub1 = onSnapshot(roleQ, (snapshot) => {
      roleNotifs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      mergeAndSet();
    });

    // Query 2: Personalized notifications (targetUid = this student)
    const personalQ = query(
      collection(db, "notifications"),
      where("targetUid", "==", user.uid),
      limit(20),
    );
    const unsub2 = onSnapshot(personalQ, (snapshot) => {
      personalNotifs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Trigger browser notification for NEW items only (not on first load)
      if (!isFirstLoad) {
        const currentIds = new Set(snapshot.docs.map((d) => d.id));
        snapshot.docs.forEach((d) => {
          if (!prevPersonalIds.has(d.id)) {
            showBrowserNotification({ id: d.id, ...d.data() });
          }
        });
        prevPersonalIds = currentIds;
      } else {
        prevPersonalIds = new Set(snapshot.docs.map((d) => d.id));
        isFirstLoad = false;
      }

      mergeAndSet();
    });

    return () => { unsub1(); unsub2(); };
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
                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                          notif.type === "warning" ? "border-l-4 border-amber-400 bg-amber-50/50" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`text-sm font-semibold line-clamp-1 ${
                            notif.type === "warning" ? "text-amber-700" : "text-gray-800"
                          }`}>
                            {notif.type === "warning" ? "⚠️ " : ""}{notif.title}
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
