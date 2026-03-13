"use client";
import React, { useState, useRef, useEffect } from "react";
import { IoIosNotificationsOutline } from "react-icons/io";
import { FiMenu, FiSearch } from "react-icons/fi";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../config/firebaseConfig";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

const officeSearchRoutes = [
  { title: "Dashboard", link: "/office/dashboard", icon: "📊", section: "Overview" },
  { title: "Batch Fee Management", link: "/office/batch-fees", icon: "👥", section: "Fees" },
  { title: "Hostel & Transport", link: "/office/hostel-transport", icon: "🏠", section: "Services" },
  { title: "Student Fees", link: "/office/student-fees", icon: "💰", section: "Fees" },
  { title: "Fee Discounts", link: "/office/fee-discounts", icon: "🏷️", section: "Fees" },
  { title: "Scholarships", link: "/office/scholarships", icon: "🎓", section: "Scholarships" },
  { title: "Staff Directory", link: "/office/staff", icon: "👥", section: "Staff" },
  { title: "Payment History", link: "/office/payment-history", icon: "📋", section: "Payments" },
  { title: "Reports", link: "/office/reports", icon: "📈", section: "Reports" },
];

interface TopbarProps {
  onMenuClick?: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof officeSearchRoutes>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeResultIdx, setActiveResultIdx] = useState(-1);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useAuth();
  const [staffName, setStaffName] = useState("Office");

  // Fetch staff name
  useEffect(() => {
    if (user) {
      const unsub = onSnapshot(doc(db, "office_staff", user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.name) setStaffName(data.name);
        }
      });
      return () => unsub();
    }
  }, [user]);

  // Fetch real-time notifications
  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc"),
      limit(20),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().createdAt
          ? new Date(doc.data().createdAt).toLocaleString()
          : "",
      }));
      setNotifications(list);
    });
    return () => unsubscribe();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = async () => {
    const unreadDocs = notifications.filter((n) => !n.read);
    try {
      await Promise.all(
        unreadDocs.map((n) => updateDoc(doc(db, "notifications", n.id), { read: true })),
      );
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error updating notifications", error);
    }
  };

  // Search filter
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      setActiveResultIdx(-1);
    } else {
      const lowerQ = searchQuery.toLowerCase();
      setSearchResults(
        officeSearchRoutes.filter(
          (r) =>
            r.title.toLowerCase().includes(lowerQ) ||
            r.section.toLowerCase().includes(lowerQ),
        ),
      );
      setActiveResultIdx(-1);
    }
  }, [searchQuery]);

  const handleSearchSelect = (link: string) => {
    router.push(link);
    setSearchQuery("");
    setSearchResults([]);
    setSearchFocused(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([]);
        setSearchFocused(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === "Escape") {
        setShowNotifications(false);
        setSearchResults([]);
        setSearchQuery("");
        setSearchFocused(false);
        searchInputRef.current?.blur();
      }
      if (searchResults.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveResultIdx((i) => Math.min(i + 1, searchResults.length - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveResultIdx((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter" && activeResultIdx >= 0) {
          e.preventDefault();
          handleSearchSelect(searchResults[activeResultIdx].link);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchResults, activeResultIdx]);

  const showDropdown = searchResults.length > 0 && (searchFocused || searchQuery.trim() !== "");

  return (
    <div className="h-16 lg:h-[11vh] fixed bg-white w-full lg:w-[82vw] lg:left-[17vw] flex flex-row items-center justify-between px-4 sm:px-6 lg:px-[2vw] z-50 border-b border-gray-100">
      <div className="flex items-center gap-3 sm:gap-5 lg:gap-8 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
          aria-label="Open menu"
        >
          <FiMenu className="text-2xl text-gray-600" />
        </button>

        <span className="font-semibold text-gray-700 text-base sm:text-lg truncate flex-shrink-0">
          Welcome, {staffName}
        </span>

        {/* Search Bar */}
        <div
          className="relative hidden sm:block flex-1 max-w-md lg:max-w-lg"
          ref={searchRef}
        >
          <div
            className={`flex items-center rounded-xl px-3.5 py-2 w-full transition-all duration-200 border ${
              searchFocused || searchQuery
                ? "bg-white border-blue-200 ring-2 ring-blue-500/10"
                : "bg-gray-50 border-gray-100 hover:border-gray-200 hover:bg-white"
            }`}
          >
            <FiSearch
              className={`mr-2.5 text-base flex-shrink-0 transition-colors ${
                searchFocused || searchQuery ? "text-blue-500" : "text-gray-400"
              }`}
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search pages..."
              className="bg-transparent border-none outline-none text-sm w-full placeholder-gray-400 text-gray-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
            />
            {!searchFocused && !searchQuery && (
              <kbd className="hidden lg:flex items-center gap-0.5 text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 font-mono flex-shrink-0 bg-white">
                Ctrl K
              </kbd>
            )}
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                className="text-gray-300 hover:text-gray-500 text-xs ml-1 flex-shrink-0"
              >
                ✕
              </button>
            )}
          </div>

          {showDropdown && (
            <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden z-[60]">
              <div className="px-4 py-2 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                </span>
                <span className="text-[10px] text-gray-400">↑↓ navigate · ↵ open</span>
              </div>
              <div className="max-h-72 overflow-y-auto py-1">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSearchSelect(result.link)}
                    className={`w-full px-4 py-2.5 flex items-center justify-between group transition-colors text-left ${
                      idx === activeResultIdx ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base w-7 text-center flex-shrink-0">{result.icon}</span>
                      <div>
                        <span className={`text-sm font-medium ${idx === activeResultIdx ? "text-blue-700" : "text-gray-700"}`}>
                          {result.title}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-2">{result.section}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] border rounded-full px-2 py-0.5 transition-all flex-shrink-0 ${
                      idx === activeResultIdx
                        ? "border-blue-200 text-blue-500 bg-blue-50"
                        : "border-gray-100 text-gray-400 group-hover:border-blue-200 group-hover:text-blue-500"
                    }`}>
                      Jump ↵
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-full hover:bg-gray-100 transition-colors outline-none"
          >
            <IoIosNotificationsOutline className="text-2xl sm:text-[28px] text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center bg-red-500 text-white text-[10px] sm:text-xs font-bold rounded-full border-2 border-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[100]">
              <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-semibold text-sm text-gray-800">Notifications</h3>
                <span
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 cursor-pointer hover:underline"
                >
                  Mark all read
                </span>
              </div>
              <div className="max-h-[280px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.read ? "bg-blue-50/40" : ""}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`font-medium text-xs ${!notif.read ? "text-gray-900" : "text-gray-600"}`}>
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                          {notif.time
                            ? new Date(notif.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : ""}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{notif.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-gray-400 text-sm">No new notifications</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile placeholder */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm border-2 border-blue-50">
          {staffName.charAt(0).toUpperCase()}
        </div>
      </div>
    </div>
  );
}
