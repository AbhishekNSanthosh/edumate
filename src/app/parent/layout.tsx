"use client";

import React from "react";
import type { Metadata } from "next";
import { usePathname } from "next/navigation";
import "@styles/scss/main.scss";
import Topbar from "@widgets/Student/common/Topbar";
import ParentTopbar from "@widgets/Parent/common/Topbar";
import Sidebar from "@widgets/Student/common/Sidebar";
import ParentSidebar from "@widgets/Parent/common/Sidebar";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const showParentSidebar = pathname.includes("parent");
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  return (
    <div className="w-screen h-screen flex flex-row overflow-x-hidden">
      {showParentSidebar ? (
        <ParentSidebar
          isMobileOpen={isMobileOpen}
          onMobileClose={() => setIsMobileOpen(false)}
        />
      ) : (
        <Sidebar
          isMobileOpen={isMobileOpen}
          onMobileClose={() => setIsMobileOpen(false)}
        />
      )}
      <div className="flex flex-col w-full lg:ml-[17vw] lg:w-[calc(100vw-17vw)]">
        {showParentSidebar ? (
          <ParentTopbar onMenuToggle={() => setIsMobileOpen(true)} />
        ) : (
          <Topbar onMenuToggle={() => setIsMobileOpen(true)} />
        )}

        <div className="bg-primary/5 h-full w-full pt-[11vh] overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
