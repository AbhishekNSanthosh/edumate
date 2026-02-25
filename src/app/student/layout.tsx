"use client";
import React, { useState } from "react";
import "@styles/scss/main.scss";
import Topbar from "@widgets/Student/common/Topbar";
import Sidebar from "@widgets/Student/common/Sidebar";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="w-screen h-screen flex flex-row overflow-x-hidden">
      <Sidebar
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />
      {/* Content: full-width on mobile, offset by exactly 17vw on lg+ */}
      <div className="flex flex-col w-full lg:ml-[17vw] lg:w-[calc(100vw-17vw)]">
        <Topbar onMenuToggle={() => setIsMobileOpen(true)} />
        <div className="bg-primary/5 h-full w-full pt-[11vh] overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
