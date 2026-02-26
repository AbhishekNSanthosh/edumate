"use client";
import Image from "next/image";
import React, { useEffect, useState, useRef } from "react";
import { IoIosNotificationsOutline } from "react-icons/io";
import { FaSearch } from "react-icons/fa";
import { useAuth } from "../../../context/AuthContext";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import Link from "next/link";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

// Define searchable faculty routes
const facultySearchRoutes = [
  { title: "Dashboard", link: "/faculty/dashboard" },
  { title: "My Profile", link: "/faculty/profile" },
  { title: "My Attendance", link: "/faculty/my-attendance" },
  { title: "Time Table", link: "/faculty/timetable" },
  { title: "Student Attendance", link: "/faculty/attendance" }, // Assuming this exists or will exist logic
  { title: "Leave Management", link: "/faculty/leave-management" },
  { title: "Student Leaves", link: "/faculty/student-leave-management" },
  { title: "Exam Section", link: "/faculty/exam" },
  { title: "Evaluations", link: "/faculty/evaluation" },
  { title: "My Documents", link: "/faculty/my-documents" },
  { title: "File Storage", link: "/faculty/file-storage" },
  { title: "Message Box", link: "/faculty/message-box" },
  { title: "Staff Appraisal", link: "/faculty/staff-appraisal" },
  { title: "Committees", link: "/faculty/committees" },
  { title: "Transport", link: "/faculty/transport" },
  { title: "Rules & Regulations", link: "/faculty/rules-and-regulations" },
];

export default function Topbar() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);

  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    typeof facultySearchRoutes
  >([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch Profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          // Fetch from faculty_profiles which holds the actual photoUrl and displayName
          const docRef = doc(db, "faculty_profiles", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data());
          }
        } catch (error) {
          console.error("Error fetching faculty profile", error);
        }
      }
    };
    fetchProfile();
  }, [user]);

  // Fetch Notifications
  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc"),
      limit(20),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          time: doc.data().createdAt
            ? new Date(doc.data().createdAt).toLocaleString()
            : "",
        }));
        setNotifications(list);
      },
      (error) => {
        console.error("Notification Error:", error);
      },
    );

    return () => unsubscribe();
  }, []);

  // Handle Search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
    } else {
      const lowerQ = searchQuery.toLowerCase();
      const results = facultySearchRoutes.filter((route) =>
        route.title.toLowerCase().includes(lowerQ),
      );
      setSearchResults(results);
    }
  }, [searchQuery]);

  const handleSearchSelect = (link: string) => {
    router.push(link);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Close dropdowns on outside click and handle escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchResults([]);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowNotifications(false);
        setSearchResults([]);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = async () => {
    const unreadDocs = notifications.filter((n) => !n.read);
    const updatePromises = unreadDocs.map((n) =>
      updateDoc(doc(db, "notifications", n.id), { read: true }),
    );

    try {
      await Promise.all(updatePromises);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error updating notifications", error);
    }
  };

  return (
    <div className="h-[11vh] fixed bg-white/80 backdrop-blur-md w-full md:w-[82vw] flex flex-row items-center justify-between px-4 md:px-[2vw] z-30 border-b border-gray-100/50">
      <div className="flex items-center gap-4 md:gap-10 ml-10 md:ml-0 flex-1 min-w-0">
        <span className="font-bold text-base md:text-xl bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent hidden sm:inline">
          Welcome,{" "}
          {profile?.displayName ||
            profile?.name ||
            user?.displayName ||
            "Faculty Member"}
          👋
        </span>

        {/* Search Bar */}
        <div className="relative group flex-1 md:flex-none" ref={searchRef}>
          <div
            className={`flex items-center bg-gray-50/80 hover:bg-white border text-gray-600 rounded-full px-3 md:px-5 py-2.5 w-full md:w-[350px] transition-all duration-300 ease-in-out
                ${searchResults.length > 0 || searchQuery ? "bg-white shadow-lg ring-2 ring-blue-500/10 border-blue-100" : "border-transparent hover:shadow-md hover:border-gray-200"}
            `}
          >
            <FaSearch
              className={`mr-3 text-lg transition-colors ${searchResults.length > 0 ? "text-blue-500" : "text-gray-400 group-hover:text-blue-500"}`}
            />
            <input
              type="text"
              placeholder="Quick Search (e.g. 'Attendance')..."
              className="bg-transparent border-none outline-none text-sm w-full placeholder-gray-400/80 font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-14 left-0 w-full bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden z-[60] animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="p-2 bg-gray-50/50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4">
                Search Results
              </div>
              <div className="max-h-[350px] overflow-y-auto py-1">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    onClick={() => handleSearchSelect(result.link)}
                    className="px-4 py-3 hover:bg-blue-50/50 cursor-pointer flex items-center justify-between group transition-colors duration-150"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100/50 text-blue-600 flex items-center justify-center text-xs group-hover:bg-blue-500 group-hover:text-white transition-all">
                        <FaSearch className="text-sm" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
                        {result.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 border border-gray-100 px-2 py-0.5 rounded-full group-hover:border-blue-200 group-hover:text-blue-500 transition-all">
                      Jump to ↵
                    </span>
                  </div>
                ))}
              </div>
              <div className="p-2 bg-gray-50 border-t border-gray-100 text-center">
                <span className="text-[10px] text-gray-400">
                  Press Esc to close
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-row gap-3 md:gap-5 items-center flex-shrink-0">
        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-full hover:bg-gray-100 transition-colors outline-none cursor-pointer"
          >
            <IoIosNotificationsOutline className="text-[30px] text-primary" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200 transform origin-top-right">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
                <span
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 cursor-pointer hover:underline"
                >
                  Mark all as read
                </span>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.read ? "bg-blue-50/50" : ""}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span
                          className={`font-medium text-sm ${!notif.read ? "text-gray-900" : "text-gray-700"}`}
                        >
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                          {notif.time
                            ? new Date(notif.time).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {notif.message}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    No new notifications
                  </div>
                )}
              </div>
              <div className="p-3 text-center border-t border-gray-100 bg-gray-50">
                <Link
                  href="/faculty/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-medium text-primary hover:text-blue-700 transition-colors block w-full"
                >
                  View All Notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile Link */}
        <Link
          href="/faculty/profile"
          className="rounded-full p-1 border-2 border-primary cursor-pointer hover:border-blue-500 transition-colors"
        >
          <img
            src={profile?.photoUrl || user?.photoURL || "/assets/profile.png"}
            alt="Profile"
            className="w-[2.5rem] h-[2.5rem] rounded-full object-cover"
          />
        </Link>
      </div>
    </div>
  );
}
