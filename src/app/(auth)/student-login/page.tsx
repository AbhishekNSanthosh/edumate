"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
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

export default function StudentLogin() {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const router = useRouter();

  useEffect(() => {
    const checkExistingSession = async () => {
      if (!authLoading && user) {
        try {
          const studentDocRef = doc(db, "students", user.uid);
          const studentDocSnap = await getDoc(studentDocRef);
          if (studentDocSnap.exists()) {
            setIsRedirecting(true);
            router.replace("/student/dashboard");
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
        return "Incorrect email or password.";
      case "auth/user-not-found":
        return "No student account found with this email.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later.";
      case "auth/network-request-failed":
        return "Network error. Please check your internet connection.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    const toastId = toast.loading("Verifying credentials...");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      const studentDocRef = doc(db, "students", userCredential.user.uid);
      const studentDocSnap = await getDoc(studentDocRef);

      if (!studentDocSnap.exists()) {
        await auth.signOut();
        throw { code: "auth/user-not-found" };
      }

      toast.success("Welcome back! Redirecting...", { id: toastId });
      setTimeout(() => {
        router.push("/student/dashboard");
      }, 1000);
    } catch (err: any) {
      console.error(err);
      const message = getErrorMessage(err.code);
      toast.error(message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Please enter your email address.");
      return;
    }
    const toastId = toast.loading("Sending reset email...");
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success("Password reset email sent! Check your inbox.", {
        id: toastId,
      });
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error: any) {
      console.error(error);
      const message = getErrorMessage(error.code);
      toast.error(message, { id: toastId });
    }
  };

  if (authLoading || isRedirecting)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#0c2461] via-[#1f75fe] to-[#60aeff] flex-col items-center justify-center p-12 overflow-hidden">
        {/* Background circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] bg-white/[0.03] rounded-full" />

        {/* Illustration */}
        <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-sm">
          <svg
            viewBox="0 0 420 340"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full drop-shadow-2xl"
          >
            {/* Open book — main centerpiece */}
            <rect x="60" y="100" width="130" height="160" rx="6" fill="white" fillOpacity="0.18" />
            <rect x="60" y="100" width="130" height="160" rx="6" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
            <rect x="230" y="100" width="130" height="160" rx="6" fill="white" fillOpacity="0.14" />
            <rect x="230" y="100" width="130" height="160" rx="6" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
            {/* Book spine */}
            <rect x="188" y="96" width="44" height="168" rx="4" fill="white" fillOpacity="0.22" />
            <line x1="210" y1="96" x2="210" y2="264" stroke="white" strokeOpacity="0.4" strokeWidth="1.5" />

            {/* Left page — text lines */}
            <rect x="74" y="120" width="100" height="6" rx="3" fill="white" fillOpacity="0.55" />
            <rect x="74" y="133" width="85" height="6" rx="3" fill="white" fillOpacity="0.38" />
            <rect x="74" y="146" width="96" height="6" rx="3" fill="white" fillOpacity="0.45" />
            <rect x="74" y="159" width="70" height="6" rx="3" fill="white" fillOpacity="0.32" />
            <rect x="74" y="172" width="92" height="6" rx="3" fill="white" fillOpacity="0.42" />
            <rect x="74" y="185" width="60" height="6" rx="3" fill="white" fillOpacity="0.28" />
            <rect x="74" y="198" width="88" height="6" rx="3" fill="white" fillOpacity="0.38" />
            {/* Left page small image placeholder */}
            <rect x="74" y="218" width="100" height="30" rx="6" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
            <rect x="80" y="224" width="50" height="5" rx="2.5" fill="white" fillOpacity="0.4" />
            <rect x="80" y="234" width="36" height="5" rx="2.5" fill="#6ee7b7" fillOpacity="0.8" />

            {/* Right page — text lines */}
            <rect x="244" y="120" width="100" height="6" rx="3" fill="white" fillOpacity="0.45" />
            <rect x="244" y="133" width="78" height="6" rx="3" fill="white" fillOpacity="0.32" />
            <rect x="244" y="146" width="92" height="6" rx="3" fill="white" fillOpacity="0.42" />
            <rect x="244" y="159" width="66" height="6" rx="3" fill="white" fillOpacity="0.28" />
            <rect x="244" y="172" width="88" height="6" rx="3" fill="white" fillOpacity="0.38" />
            <rect x="244" y="185" width="74" height="6" rx="3" fill="white" fillOpacity="0.35" />
            <rect x="244" y="198" width="96" height="6" rx="3" fill="white" fillOpacity="0.4" />
            {/* Right page chart */}
            <rect x="244" y="218" width="100" height="30" rx="6" fill="white" fillOpacity="0.1" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
            <rect x="254" y="234" width="10" height="10" rx="2" fill="white" fillOpacity="0.35" />
            <rect x="268" y="228" width="10" height="16" rx="2" fill="white" fillOpacity="0.55" />
            <rect x="282" y="224" width="10" height="20" rx="2" fill="#6ee7b7" fillOpacity="0.85" />
            <rect x="296" y="230" width="10" height="14" rx="2" fill="white" fillOpacity="0.45" />
            <rect x="310" y="226" width="10" height="18" rx="2" fill="white" fillOpacity="0.6" />
            <rect x="324" y="232" width="10" height="12" rx="2" fill="white" fillOpacity="0.38" />

            {/* Pencil on top of book */}
            <rect x="140" y="72" width="140" height="14" rx="7" fill="#fde68a" fillOpacity="0.9" transform="rotate(-18 140 72)" />
            <polygon points="140,72 126,78 132,86" fill="#fbbf24" fillOpacity="0.9" transform="rotate(-18 140 72)" />
            <rect x="270" y="53" width="16" height="14" rx="2" fill="#f87171" fillOpacity="0.8" transform="rotate(-18 140 72)" />

            {/* Floating grade badge */}
            <rect x="310" y="20" width="96" height="52" rx="12" fill="#065f46" fillOpacity="0.9" />
            <rect x="310" y="20" width="96" height="52" rx="12" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
            <text x="358" y="48" textAnchor="middle" fill="#6ee7b7" fontSize="22" fontWeight="bold" fontFamily="sans-serif">A+</text>
            <rect x="322" y="58" width="72" height="5" rx="2.5" fill="white" fillOpacity="0.45" />

            {/* Notification pill — assignment due */}
            <rect x="14" y="24" width="140" height="36" rx="10" fill="#0c2461" fillOpacity="0.9" />
            <rect x="14" y="24" width="140" height="36" rx="10" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
            <circle cx="32" cy="42" r="8" fill="#34d399" fillOpacity="0.85" />
            <rect x="46" y="36" width="94" height="6" rx="3" fill="white" fillOpacity="0.9" />
            <rect x="46" y="46" width="66" height="5" rx="2.5" fill="white" fillOpacity="0.45" />

            {/* Bottom — attendance meter */}
            <rect x="60" y="284" width="300" height="38" rx="10" fill="white" fillOpacity="0.1" stroke="white" strokeOpacity="0.18" strokeWidth="1" />
            <rect x="72" y="294" width="60" height="6" rx="3" fill="white" fillOpacity="0.5" />
            <rect x="72" y="305" width="220" height="8" rx="4" fill="white" fillOpacity="0.15" />
            <rect x="72" y="305" width="176" height="8" rx="4" fill="#34d399" fillOpacity="0.8" />
            <rect x="302" y="294" width="46" height="16" rx="4" fill="white" fillOpacity="0.2" />
            <rect x="308" y="299" width="34" height="6" rx="3" fill="white" fillOpacity="0.7" />
          </svg>

          {/* Text */}
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Student Learning Portal
            </h2>
            <p className="text-blue-100/80 text-sm leading-relaxed max-w-xs">
              Access your classes, assignments, grades, and study materials — everything you need to succeed in one place.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            {["Assignments", "Attendance", "Results", "Study Materials"].map(
              (label) => (
                <span
                  key={label}
                  className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-white/80 border border-white/15"
                >
                  {label}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 bg-white relative">
        {/* Subtle top-right blob for mobile */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 lg:hidden" />

        <div className="w-full max-w-md relative z-10">
          {/* Logo + heading */}
          <div className="mb-10 space-y-3">
            <Image
              src="/brand/logo.svg"
              alt="Edumate Logo"
              width={120}
              height={40}
              priority
              className="h-9 w-auto"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mt-4">
                Student Sign In
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Sign in to access your dashboard
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 placeholder-gray-400 text-gray-900 text-sm"
                placeholder="student@example.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-11 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 placeholder-gray-400 text-gray-900 text-sm"
                  placeholder="••••••••"
                  autoComplete="current-password"
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
                className="text-sm text-primary hover:text-primary/80 font-medium hover:underline focus:outline-none"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 px-4 rounded-xl font-semibold shadow-md shadow-primary/25 hover:shadow-primary/40 hover:brightness-105 active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing In...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Reset Password</h3>
              <p className="text-gray-500 text-sm mt-1">
                Enter your email to receive a reset link
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label
                  htmlFor="reset-email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="reset-email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                  placeholder="Enter your registered email"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail("");
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors text-sm"
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
