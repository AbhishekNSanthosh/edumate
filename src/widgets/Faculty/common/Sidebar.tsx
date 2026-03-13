"use client";

import { facultySideBarMenu, parentSideBarMenu, sideBarMenu } from "@utils/constants";
import { signOut } from "firebase/auth";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { FiLogOut, FiMenu, FiX } from "react-icons/fi";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../../../config/firebaseConfig";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";

export default function Sidebar() {
  const { user } = useAuth();
  const userRole = "faculty";
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isTutor, setIsTutor] = useState<boolean | null>(null);

  // Extract role from the URL path (e.g., /admin/dashboard -> "admin")
  const pathRole = pathname?.split("/")[1] || userRole;

  // Filter menu items based on role
  let filteredMenu = facultySideBarMenu.filter((item) =>
    item.rightsToView.includes(userRole)
  );

  if (isTutor === false) {
     filteredMenu = filteredMenu.filter(m => m.link !== "my-batch");
  }

  useEffect(() => {
    const checkTutorStatus = async () => {
      if (!user) return;
      try {
        let facultyDoc = (await getDocs(query(collection(db, "faculty"), where("authUid", "==", user.uid)))).docs[0];
        if (!facultyDoc) {
          facultyDoc = (await getDocs(query(collection(db, "faculty"), where("email", "==", user.email)))).docs[0];
        }
        if (!facultyDoc) { setIsTutor(false); return; }

        const fName = facultyDoc.data().name || user.displayName || "";
        const fDocId = facultyDoc.id;

        const allBatches = await getDocs(collection(db, "batches"));
        const tutorBatch = allBatches.docs.find(d => {
          const b = d.data();
          return (
            b.tutor === fName ||
            b.tutorId === user.uid ||
            b.tutorId === fDocId ||
            (Array.isArray(b.tutors) && b.tutors.some((t: any) => t.id === fDocId || t.name === fName))
          );
        });

        setIsTutor(!!tutorBatch);
      } catch (err) {
        console.error("Tutor check error:", err);
        setIsTutor(false);
      }
    };
    checkTutorStatus();
  }, [user]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully 🚀");
      router.push("/"); // redirect to landing page
    } catch (err: any) {
      console.error(err);
      toast.error("Logout failed ❌");
    } finally {
        setShowLogoutConfirm(false);
    }
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="py-6 px-4 md:px-[2vw] border-b border-gray-50 bg-gradient-to-r from-blue-50/50 to-transparent flex items-center justify-between">
        <Image
          src="/brand/logo.svg"
          alt="logo"
          width={100}
          height={40}
          className="h-8 w-auto"
          priority
        />
        {/* Close button on mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <FiX className="text-xl text-gray-600" />
        </button>
      </div>

      {/* Menu Items */}
      <div className="flex-1 mt-6 space-y-1.5 overflow-y-auto sidebarScroll px-3">
        {filteredMenu.map((menu) => {
          const menuPath = `/${pathRole}/${menu.link}`;
          const isActive = pathname === menuPath;

          return (
            <Link
              key={menu.link}
              href={menuPath}
              className={`flex items-center gap-3 h-12 px-4 relative rounded-xl transition-all duration-200 group
                ${isActive
                    ? "bg-blue-50 text-blue-600 font-semibold shadow-sm shadow-blue-100"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }
              `}
            >
              {/* Active Indicator */}
              {isActive && (
                <div className="w-1 h-6 bg-blue-600 absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"></div>
              )}

              {/* Icon */}
              <menu.icon
                className={`text-xl transition-colors ${
                  isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                }`}
              />

              {/* Label */}
              <span className="truncate text-sm">{menu.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all duration-200 shadow-sm text-sm font-medium group"
        >
          <FiLogOut className="text-lg text-gray-400 group-hover:text-red-500 transition-colors" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <FiMenu className="text-xl text-gray-700" />
      </button>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-[17vw] h-screen flex-col bg-white fixed left-0 top-0 border-r border-gray-100 z-40">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[90]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Sidebar Drawer */}
          <div className="absolute left-0 top-0 h-full w-[75vw] max-w-[300px] bg-white flex flex-col animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Custom Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <FiLogOut className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Logout</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to end your current session?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                >
                  Yes, Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
