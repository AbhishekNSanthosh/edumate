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
  const showParentSidebar = pathname.includes('parent');

  return (
    <div className="w-screen h-screen flex flex-row overflow-x-hidden">
      {showParentSidebar ? <ParentSidebar /> : <Sidebar />}
      <div className="flex flex-col w-[87vw] ml-[18vw]">
        {showParentSidebar ? <ParentTopbar /> : <Topbar />}
        
        <div className="bg-primary/5 h-full w-full">
          {children}
        </div>
      </div>
    </div>
  );
}