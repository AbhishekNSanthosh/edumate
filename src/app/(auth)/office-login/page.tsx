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

// Maps short usernames → full Firebase Auth emails
const USERNAME_MAP: Record<string, string> = {
  office: "office@edumate.app",
};

// Resolve username or email → actual Firebase email
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
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      const officeDocRef = doc(db, "office_staff", userCredential.user.uid);
      const officeDocSnap = await getDoc(officeDocRef);

      if (!officeDocSnap.exists()) {
        await auth.signOut();
        toast.error("Access denied. This account is not registered as office staff.");
        setLoading(false);
        return;
      }

      toast.success("Login successful!");
      router.push("/office/dashboard");
    } catch (error: any) {
      toast.error(getErrorMessage(error.code));
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
        // EMAIL_EXISTS means account already exists — that's OK
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
    try {
      await sendPasswordResetEmail(auth, resolveEmail(resetEmail));
      toast.success("Password reset email sent!");
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error: any) {
      toast.error(getErrorMessage(error.code));
    }
  };

  if (authLoading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/brand/logo.svg"
            alt="EduMate"
            width={140}
            height={50}
            className="mx-auto mb-4"
            priority
          />
          <h1 className="text-2xl font-bold text-gray-900">Office Portal</h1>
          <p className="text-sm text-gray-500 mt-1">
            Sign in to manage fees, discounts &amp; scholarships
          </p>
        </div>

        {/* Demo credentials hint */}
        <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex items-center justify-between gap-3">
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

        {/* Login Form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Username or Email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="office"
                autoComplete="username"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* First-time setup divider */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center mb-3">
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
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-4">
              Enter your username or email and we&apos;ll send a password reset link.
            </p>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <input
                type="text"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="office or email address"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail("");
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
                >
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
