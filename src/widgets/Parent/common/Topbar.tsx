"use client";
import React, { useEffect, useState, useRef } from "react";
import { IoIosNotificationsOutline } from "react-icons/io";
import { IoTimeOutline, IoClose } from "react-icons/io5";
import { useAuth } from "../../../context/AuthContext";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  limit,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import Image from "next/image";
import { FiMenu } from "react-icons/fi";

interface TopbarProps {
  onMenuToggle?: () => void;
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const { user } = useAuth();
  const [parentData, setParentData] = useState<{
    name?: string;
    photoUrl?: string;
  } | null>(null);

  // Notification State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // Fetch Parent Data
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "parents", user.uid), (doc) => {
      if (doc.exists()) {
        setParentData(doc.data() as any);
      }
    });
    return () => unsub();
  }, [user]);

  // Fetch Notifications (Student specific query as requested)
  useEffect(() => {
    if (!user) return;

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
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHrs < 24)
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString();
  };

  return (
    <div className="h-[11vh] fixed left-0 lg:left-[17vw] top-0 bg-white w-full lg:w-[calc(100vw-17vw)] flex flex-row items-center justify-between px-4 lg:px-[2vw] shadow-sm z-30 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiMenu className="text-2xl" />
        </button>
        <span className="font-semibold text-base sm:text-xl text-primary truncate max-w-[40vw] sm:max-w-none">
          Welcome, {parentData?.name || "Parent"}! 👋
        </span>
      </div>
      <div className="flex flex-row gap-3 sm:gap-5 items-center">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <div
            className="relative cursor-pointer group"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <IoIosNotificationsOutline className="text-[30px] text-primary hover:text-blue-600 transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>

          {/* Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 origin-top-right z-50">
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
        <div className="rounded-full border-2 border-primary overflow-hidden w-[2.8rem] h-[2.8rem] relative">
          {parentData?.photoUrl ? (
            <img
              src={parentData.photoUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <Image
              src={"/assets/profile.png"}
              alt="Default Profile"
              width={100}
              height={100}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </div>
    </div>
  );
}
