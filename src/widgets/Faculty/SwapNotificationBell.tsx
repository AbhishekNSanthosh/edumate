"use client";

import React, { useEffect, useRef, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import { HiArrowsRightLeft, HiBell } from "react-icons/hi2";
import toast from "react-hot-toast";

interface SwapNotification {
  id: string;
  type: "request" | "accepted" | "declined";
  fromFacultyName: string;
  toFacultyId: string;
  subjectName: string;
  day: string;
  date: string;
  time: string;
  read: boolean;
  createdAt: any;
}

export default function SwapNotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<SwapNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [shaking, setShaking] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "swap_notifications"),
      where("toFacultyId", "==", user.uid),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const all = (
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SwapNotification[]
      ).sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
      );

      // On first load, just seed known IDs without showing toasts
      if (isFirstLoad.current) {
        all.forEach((n) => seenIds.current.add(n.id));
        isFirstLoad.current = false;
        setNotifications(all);
        return;
      }

      // Detect new notifications
      const newOnes = all.filter((n) => !seenIds.current.has(n.id));
      newOnes.forEach((n) => {
        seenIds.current.add(n.id);

        // Show popup toast
        if (n.type === "request") {
          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible
                    ? "animate-in slide-in-from-right-5"
                    : "animate-out slide-out-to-right-5"
                } max-w-sm w-full bg-white rounded-xl shadow-2xl border border-orange-200 p-4 pointer-events-auto`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <HiArrowsRightLeft className="text-orange-600 text-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">
                      New Swap Request!
                    </p>
                    <p className="text-gray-600 text-xs mt-0.5">
                      <span className="font-semibold text-orange-700">
                        {n.fromFacultyName}
                      </span>{" "}
                      wants to swap{" "}
                      <span className="font-semibold">{n.subjectName}</span> on{" "}
                      {n.day}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">🕐 {n.time}</p>
                  </div>
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
                <div
                  className="mt-3 text-xs text-blue-600 font-medium cursor-pointer hover:underline"
                  onClick={() => {
                    toast.dismiss(t.id);
                    window.location.href = "/faculty/timetable";
                  }}
                >
                  → View in Timetable
                </div>
              </div>
            ),
            { duration: 8000, position: "top-right" },
          );
        } else if (n.type === "accepted") {
          toast.success(
            `✅ ${n.fromFacultyName} accepted your swap for ${n.subjectName}`,
            {
              duration: 6000,
            },
          );
        } else if (n.type === "declined") {
          toast.error(
            `❌ ${n.fromFacultyName} declined your swap for ${n.subjectName}`,
            {
              duration: 6000,
            },
          );
        }

        // Shake the bell
        setShaking(true);
        setTimeout(() => setShaking(false), 600);
      });

      setNotifications(all);
    });

    return () => unsub();
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotifIcon = (type: string) => {
    if (type === "request") return "🔄";
    if (type === "accepted") return "✅";
    if (type === "declined") return "❌";
    return "📋";
  };

  const getNotifColor = (type: string) => {
    if (type === "request") return "bg-orange-50 border-orange-200";
    if (type === "accepted") return "bg-green-50 border-green-200";
    if (type === "declined") return "bg-red-50 border-red-200";
    return "bg-gray-50 border-gray-200";
  };

  if (!user) return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl hover:bg-orange-50 transition-all duration-300 ${
          shaking ? "animate-bounce" : ""
        }`}
        title="Swap Notifications"
      >
        <HiBell
          className={`text-xl ${unreadCount > 0 ? "text-orange-600" : "text-gray-500"}`}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-[200] overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HiArrowsRightLeft className="text-white text-base" />
              <h3 className="text-sm font-bold text-white">
                Swap Notifications
              </h3>
            </div>
            {unreadCount > 0 && (
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                <div className="text-3xl mb-2">🔔</div>
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 hover:bg-gray-50 transition-colors border-l-4 ${getNotifColor(n.type)}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5">
                      {getNotifIcon(n.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">
                        {n.type === "request"
                          ? `${n.fromFacultyName} sent a swap request`
                          : n.type === "accepted"
                            ? `${n.fromFacultyName} accepted your swap`
                            : `${n.fromFacultyName} declined your swap`}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {n.subjectName} · {n.day}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-center">
              <a
                href="/faculty/timetable"
                className="text-xs font-semibold text-orange-600 hover:underline"
                onClick={() => setIsOpen(false)}
              >
                View All in Timetable →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
