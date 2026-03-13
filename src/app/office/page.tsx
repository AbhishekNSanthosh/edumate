"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OfficePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/office/dashboard");
  }, [router]);
  return null;
}
