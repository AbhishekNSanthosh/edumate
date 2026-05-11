"use client";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";

const USERNAME_MAP: Record<string, string> = {
  office: "office@edumate.app",
};

function resolveEmail(input: string): string {
  const trimmed = input.trim().toLowerCase();
  return USERNAME_MAP[trimmed] ?? trimmed;
}

export default function OfficeLogin() {
  const { user, loading: authLoading } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupDone, setSetupDone] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const router = useRouter();

  useEffect(() => {
    const checkExistingSession = async () => {
      if (!authLoading && user) {
        try {
          const officeDocRef = doc(db, "office_staff", user.uid);
          const officeDocSnap = await getDoc(officeDocRef);
          if (officeDocSnap.exists()) {
            setIsRedirecting(true);
            router.replace("/office/dashboard");
          }
        } catch (e) {
          console.error("Session verification error:", e);
        }
      }
    };
    checkExistingSession();
  }, [user, authLoading, router]);

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case "auth/invalid-credential":
        return "Incorrect username or password. Use 'Setup Account' if first time.";
      case "auth/user-not-found":
        return "No office account found. Click 'Setup Account' below.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/invalid-email":
        return "Please enter a valid username or email.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later.";
      case "auth/network-request-failed":
        return "Network error. Please check your internet connection.";
      default:
        return "Login failed. Please try again.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    const email = resolveEmail(identifier);
    setLoading(true);
    const toastId = toast.loading("Verifying credentials...");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      const officeDocRef = doc(db, "office_staff", userCredential.user.uid);
      const officeDocSnap = await getDoc(officeDocRef);

      if (!officeDocSnap.exists()) {
        await auth.signOut();
        toast.error("Access denied. This account is not registered as office staff.", { id: toastId });
        setLoading(false);
        return;
      }

      toast.success("Welcome back! Redirecting...", { id: toastId });
      setTimeout(() => router.push("/office/dashboard"), 1000);
    } catch (error: any) {
      toast.error(getErrorMessage(error.code), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleSetupAccount = async () => {
    setSetupLoading(true);
    try {
      const res = await fetch("/api/create-office-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "office@edumate.app",
          password: "office123",
          name: "Office Staff",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "EMAIL_EXISTS") {
          toast.success("Account already set up! You can sign in now.");
          setSetupDone(true);
        } else {
          toast.error(data.error || "Setup failed");
        }
      } else {
        toast.success("Office account created! You can now sign in.");
        setSetupDone(true);
        setIdentifier("office");
        setPassword("office123");
      }
    } catch (e) {
      toast.error("Setup failed. Check your connection.");
    } finally {
      setSetupLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Please enter your email address");
      return;
    }
    const toastId = toast.loading("Sending reset email...");
    try {
      await sendPasswordResetEmail(auth, resolveEmail(resetEmail));
      toast.success("Password reset email sent!", { id: toastId });
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error: any) {
      toast.error(getErrorMessage(error.code), { id: toastId });
    }
  };

  if (authLoading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#0c2461] via-[#1f75fe] to-[#60aeff] flex-col items-center justify-center p-12 overflow-hidden">
        {/* Background circles */}
        <div className="absolute -top-28 -left-28 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-36 -right-24 w-[30rem] h-[30rem] bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[38rem] h-[38rem] bg-white/[0.03] rounded-full" />

        <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-sm">
          {/* Office / Finance SVG illustration */}
          <svg
            viewBox="0 0 420 340"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full drop-shadow-2xl"
          >
            {/* Main surface */}
            <rect x="30" y="30" width="360" height="280" rx="18" fill="white" fillOpacity="0.10" />
            <rect x="30" y="30" width="360" height="280" rx="18" stroke="white" strokeOpacity="0.18" strokeWidth="1.5" />

            {/* Top bar */}
            <rect x="30" y="30" width="360" height="50" rx="18" fill="white" fillOpacity="0.10" />
            <rect x="54" y="48" width="90" height="8" rx="4" fill="white" fillOpacity="0.65" />
            <rect x="54" y="62" width="56" height="6" rx="3" fill="white" fillOpacity="0.3" />
            <circle cx="368" cy="55" r="10" fill="white" fillOpacity="0.15" />
            <circle cx="346" cy="55" r="10" fill="white" fillOpacity="0.15" />

            {/* Fee summary cards */}
            <rect x="46" y="100" width="100" height="68" rx="12" fill="white" fillOpacity="0.14" />
            <rect x="46" y="100" width="100" height="68" rx="12" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
            <rect x="58" y="112" width="36" height="6" rx="3" fill="white" fillOpacity="0.45" />
            <rect x="58" y="124" width="56" height="14" rx="4" fill="white" fillOpacity="0.85" />
            <rect x="58" y="144" width="44" height="6" rx="3" fill="#93c5fd" fillOpacity="0.9" />
            {/* Rupee icon hint */}
            <circle cx="128" cy="113" r="8" fill="#60a5fa" fillOpacity="0.3" />
            <rect x="124" y="110" width="8" height="6" rx="1.5" fill="white" fillOpacity="0.7" />

            <rect x="160" y="100" width="100" height="68" rx="12" fill="white" fillOpacity="0.14" />
            <rect x="160" y="100" width="100" height="68" rx="12" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
            <rect x="172" y="112" width="36" height="6" rx="3" fill="white" fillOpacity="0.45" />
            <rect x="172" y="124" width="56" height="14" rx="4" fill="white" fillOpacity="0.85" />
            <rect x="172" y="144" width="44" height="6" rx="3" fill="#fde68a" fillOpacity="0.9" />

            <rect x="274" y="100" width="110" height="68" rx="12" fill="white" fillOpacity="0.14" />
            <rect x="274" y="100" width="110" height="68" rx="12" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
            <rect x="286" y="112" width="36" height="6" rx="3" fill="white" fillOpacity="0.45" />
            <rect x="286" y="124" width="64" height="14" rx="4" fill="white" fillOpacity="0.85" />
            <rect x="286" y="144" width="50" height="6" rx="3" fill="#a5f3fc" fillOpacity="0.9" />

            {/* Payment table */}
            <rect x="46" y="186" width="338" height="104" rx="12" fill="white" fillOpacity="0.08" />
            <rect x="46" y="186" width="338" height="104" rx="12" stroke="white" strokeOpacity="0.14" strokeWidth="1" />
            {/* Table header */}
            <rect x="46" y="186" width="338" height="26" rx="12" fill="white" fillOpacity="0.08" />
            <rect x="62" y="197" width="44" height="5" rx="2.5" fill="white" fillOpacity="0.5" />
            <rect x="160" y="197" width="44" height="5" rx="2.5" fill="white" fillOpacity="0.5" />
            <rect x="260" y="197" width="44" height="5" rx="2.5" fill="white" fillOpacity="0.5" />
            {/* Rows */}
            {[0, 1, 2].map((i) => (
              <React.Fragment key={i}>
                <rect x="62" y={222 + i * 22} width="60" height="5" rx="2.5" fill="white" fillOpacity={0.35 - i * 0.05} />
                <rect x="160" y={222 + i * 22} width="44" height="5" rx="2.5" fill="white" fillOpacity={0.35 - i * 0.05} />
                <rect x="260" y={222 + i * 22} width={i === 0 ? 52 : i === 1 ? 40 : 48} height="5" rx="2.5" fill={i === 0 ? "#6ee7b7" : "white"} fillOpacity={i === 0 ? 0.85 : 0.25} />
              </React.Fragment>
            ))}

            {/* Floating receipt badge */}
            <rect x="292" y="12" width="118" height="38" rx="10" fill="#1e3a8a" fillOpacity="0.9" />
            <rect x="292" y="12" width="118" height="38" rx="10" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
            <circle cx="311" cy="31" r="9" fill="#60a5fa" fillOpacity="0.85" />
            <rect x="312" y="27" width="2" height="8" rx="1" fill="white" fillOpacity="0.9" />
            <rect x="308" y="31" width="6" height="2" rx="1" fill="white" fillOpacity="0.9" />
            <rect x="326" y="25" width="70" height="6" rx="3" fill="white" fillOpacity="0.85" />
            <rect x="326" y="35" width="48" height="5" rx="2.5" fill="white" fillOpacity="0.45" />
          </svg>

          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Office Management Portal
            </h2>
            <p className="text-blue-100/80 text-sm leading-relaxed max-w-xs">
              Manage student fees, scholarships, discounts and payment records — all in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {["Fee Collection", "Scholarships", "Discounts", "Payment Records"].map((label) => (
              <span
                key={label}
                className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-white/80 border border-white/15"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 bg-white relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 lg:hidden" />

        <div className="w-full max-w-md relative z-10">
          {/* Logo + heading */}
          <div className="mb-8 space-y-3">
            <Image
              src="/brand/logo.svg"
              alt="Edumate Logo"
              width={120}
              height={40}
              priority
              className="h-9 w-auto"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mt-4">Office Sign In</h1>
              <p className="text-gray-500 text-sm mt-1">
                Sign in to manage fees, discounts &amp; scholarships
              </p>
            </div>
          </div>

          {/* Demo credentials */}
          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-blue-700 mb-0.5">Demo Credentials</p>
              <p className="text-xs text-blue-600 font-mono">
                Username: <span className="font-bold">office</span>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                Password: <span className="font-bold">office123</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIdentifier("office");
                setPassword("office123");
                toast.success("Credentials filled!");
              }}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-100 transition"
            >
              Fill
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
                Username or Email
              </label>
              <input
                type="text"
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="office"
                autoComplete="username"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400 text-gray-900"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-11 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400 text-gray-900"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash size={17} /> : <FaEye size={17} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline focus:outline-none"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing In...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* First-time setup */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-3">
              First time? Create the office account in Firebase Auth:
            </p>
            <button
              type="button"
              onClick={handleSetupAccount}
              disabled={setupLoading || setupDone}
              className={`w-full py-2.5 rounded-xl text-sm font-medium border transition ${
                setupDone
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              } disabled:opacity-60`}
            >
              {setupDone
                ? "✓ Account set up — ready to sign in!"
                : setupLoading
                ? "Setting up..."
                : "Setup Office Account (office / office123)"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-sm text-gray-400 hover:text-gray-700 font-medium transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Reset Password</h3>
              <p className="text-gray-500 text-sm mt-1">
                Enter your username or email and we&apos;ll send a reset link.
              </p>
            </div>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <input
                type="text"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="office or email address"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(false); setResetEmail(""); }}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors text-sm"
                >
                  Send Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
