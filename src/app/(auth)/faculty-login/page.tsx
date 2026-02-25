"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";

export default function FacultyLogin() {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const router = useRouter();

  useEffect(() => {
    const checkExistingSession = async () => {
      if (!authLoading && user) {
        try {
          const facultyDocRef = doc(db, "faculty", user.uid);
          const facultyDocSnap = await getDoc(facultyDocRef);
          if (facultyDocSnap.exists()) {
            setIsRedirecting(true);
            router.replace("/faculty/dashboard");
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
        return "No faculty account found with this email.";
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

      // Verify if the logged-in user is actually a faculty member
      const facultyDocRef = doc(db, "faculty", userCredential.user.uid);
      const facultyDocSnap = await getDoc(facultyDocRef);

      if (!facultyDocSnap.exists()) {
        await auth.signOut();
        throw { code: "auth/user-not-found" };
      }

      console.log("✅ Logged in:", userCredential.user);

      toast.success("Welcome back! Redirecting...", { id: toastId });
      setTimeout(() => {
        router.push("/faculty/dashboard");
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      // Handled by onSubmit
    }
  };

  if (authLoading || isRedirecting)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#1f75fe]/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-purple-400/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-8 border border-white/20">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto rounded-full flex items-center justify-center">
            <Image
              src={"/brand/logo.svg"}
              alt="Edumate Logo"
              width={120}
              height={40}
              priority
              className="h-10 w-auto"
            />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
            Faculty Portal
          </h2>
          <p className="text-gray-500 text-sm">
            Sign in to manage classes and students
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
          onKeyDown={handleKeyDown}
        >
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 ml-1"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder-gray-400 text-gray-900"
              placeholder="faculty@example.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 ml-1"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder-gray-400 text-gray-900"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <div className="flex items-center justify-end text-sm">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-blue-600 hover:text-blue-700 font-medium hover:underline focus:outline-none"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
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
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Signing In...
              </span>
            ) : (
              "Sign In"
            )}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Reset Password
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                Enter your email to receive a reset link
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label
                  htmlFor="reset-email"
                  className="block text-sm font-medium text-gray-700 ml-1 mb-1"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="reset-email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Entet your registered email"
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
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
