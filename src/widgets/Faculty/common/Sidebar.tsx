"use client";

import { facultySideBarMenu, parentSideBarMenu, sideBarMenu } from "@utils/constants";
import { signOut } from "firebase/auth";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { FiLogOut } from "react-icons/fi";
import { auth } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";

export default function Sidebar() {
  const userRole = "faculty"; 
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  // Extract role from the URL path (e.g., /admin/dashboard -> "admin")
  const pathRole = pathname?.split("/")[1] || userRole;

  // Filter menu items based on role
  const filteredMenu = facultySideBarMenu.filter((item) =>
    item.rightsToView.includes(userRole)
  );

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

  return (
    <>
    <div className="w-[17vw] h-screen shadow-sm flex flex-col bg-white fixed left-0 top-0 border-r border-gray-100 z-40">
      {/* Logo */}
      <div className="py-6 px-[2vw] border-b border-gray-50 bg-gradient-to-r from-blue-50/50 to-transparent">
        <Image
          src="/brand/logo.svg"
          alt="logo"
          width={100}
          height={40}
          className="h-8 w-auto"
          priority
        />
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
    </div>

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
