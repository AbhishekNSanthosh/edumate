"use client";

import { signOut } from "firebase/auth";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { FiLogOut } from "react-icons/fi";
import toast from "react-hot-toast";
import { auth } from "../../config/firebaseConfig";
import { adminSideBarMenu } from "@utils/constants";

export default function Sidebar() {
  const userRole = "admin"; // Replace with dynamic role (from context, auth, etc.)
  const pathname = usePathname();
  const router = useRouter();

  // Extract role from the URL path (e.g., /admin/dashboard -> "admin")
  const pathRole = pathname?.split("/")[1] || userRole;

  // Filter menu items based on role
  const filteredMenu = adminSideBarMenu.filter((item) =>
    item.rightsToView.includes(userRole)
  );

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully 🚀");
      router.push("/parent-login"); // redirect to login page
    } catch (err: any) {
      console.error(err);
      toast.error("Logout failed ❌");
    }
  };

  return (
    <div className="w-[17vw] h-screen shadow-sm flex flex-col bg-white fixed">
      {/* Logo */}
      <div className="py-3 px-[2vw]">
        <Image
          src="/brand/logo.svg"
          alt="logo"
          width={1000}
          height={1000}
          className="h-[1.8rem] mt-5 w-auto"
          priority
        />
      </div>

      {/* Menu Items */}
      <div className="flex-1 mt-[40px] space-y-1 overflow-y-auto sidebarScroll">
        {filteredMenu.map((menu) => {
          const menuPath = `/${pathRole}/${menu.link}`;
          const isActive = pathname === menuPath;

          return (
            <Link
              key={menu.link}
              href={menuPath}
              className={`flex items-center gap-2 h-[3.4rem] px-[2vw] relative rounded-md transition-all duration-200
                ${isActive ? "bg-azure-100 text-azure-600 font-semibold" : "text-gray-700 hover:bg-primary/10"}
              `}
            >
              {/* Active Indicator */}
              {isActive && (
                <div className="w-[4px] h-[70%] bg-azure-600 absolute left-0 rounded-r-md"></div>
              )}

              {/* Icon */}
              <menu.icon
                className={`text-xl ${
                  isActive ? "text-azure-600" : "text-gray-500"
                }`}
              />

              {/* Label */}
              <span className="truncate">{menu.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Logout Button */}
      <div className="p-4 border-t bg-white">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition"
        >
          <FiLogOut className="text-lg" />
          Logout
        </button>
      </div>
    </div >
  );
}
