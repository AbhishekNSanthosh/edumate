"use client";
import React, { useState } from "react";
import "@styles/scss/main.scss";
import Sidebar from "@widgets/Office/Sidebar";
import Topbar from "@widgets/Office/Topbar";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/office-login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-50">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-row overflow-x-hidden">
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex flex-col w-full lg:w-[82vw] lg:ml-[17vw]">
        <Topbar onMenuClick={() => setIsMobileMenuOpen(true)} />
        <div className="bg-primary/5 h-full w-full pt-16 lg:pt-[11vh] overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
