"use client";
import React from "react";
import "@styles/scss/main.scss";
import Sidebar from "@widgets/Admin/Sidebar";
import Topbar from "@widgets/Admin/Topbar";
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

  useEffect(() => {
    if (!loading && !user) {
      router.push("/admin-login");
    }
  }, [user, loading, router]);

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
        <Sidebar />
      <div className="flex flex-col w-[87vw] ml-[18vw]">
      <Topbar />
        <div className="bg-primary/5 h-full w-full">
            {children}
        </div>
      </div>
    </div>
  );
}
