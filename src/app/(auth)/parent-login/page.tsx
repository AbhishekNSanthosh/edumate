"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "../../../config/firebaseConfig";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";

export default function ParentLogin() {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      setIsRedirecting(true);
      router.replace("/parent/dashboard");
    }
  }, [user, authLoading, router]);

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case "auth/invalid-credential":
        return "Incorrect email or password.";
      case "auth/user-not-found":
        return "No account found with this email.";
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
      console.log("✅ Logged in:", userCredential.user);

      toast.success("Welcome back! Redirecting...", { id: toastId });
      setTimeout(() => {
        router.push("/parent/dashboard");
      }, 1000);
    } catch (err: any) {
      console.error(err);
      const message = getErrorMessage(err.code);
      toast.error(message, { id: toastId });
    } finally {
      setLoading(false);
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
            {/* House / home shape */}
            <polygon points="210,30 310,110 310,260 110,260 110,110" fill="white" fillOpacity="0.12" />
            <polygon points="210,30 310,110 310,260 110,260 110,110" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" />
            {/* Roof top ridge */}
            <polyline points="100,118 210,30 320,118" stroke="white" strokeOpacity="0.4" strokeWidth="2" strokeLinejoin="round" />

            {/* Door */}
            <rect x="182" y="196" width="56" height="64" rx="6" fill="white" fillOpacity="0.2" stroke="white" strokeOpacity="0.3" strokeWidth="1" />
            <circle cx="230" cy="229" r="4" fill="white" fillOpacity="0.6" />

            {/* Left window */}
            <rect x="122" y="150" width="52" height="44" rx="6" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.25" strokeWidth="1" />
            <line x1="148" y1="150" x2="148" y2="194" stroke="white" strokeOpacity="0.3" strokeWidth="1" />
            <line x1="122" y1="172" x2="174" y2="172" stroke="white" strokeOpacity="0.3" strokeWidth="1" />

            {/* Right window */}
            <rect x="246" y="150" width="52" height="44" rx="6" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.25" strokeWidth="1" />
            <line x1="272" y1="150" x2="272" y2="194" stroke="white" strokeOpacity="0.3" strokeWidth="1" />
            <line x1="246" y1="172" x2="298" y2="172" stroke="white" strokeOpacity="0.3" strokeWidth="1" />

            {/* Ground / path */}
            <rect x="60" y="260" width="300" height="10" rx="5" fill="white" fillOpacity="0.1" />
            <rect x="182" y="260" width="56" height="10" rx="0" fill="white" fillOpacity="0.15" />

            {/* Floating card — child progress */}
            <rect x="300" y="18" width="112" height="72" rx="12" fill="#0c2461" fillOpacity="0.9" />
            <rect x="300" y="18" width="112" height="72" rx="12" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
            <rect x="312" y="30" width="52" height="6" rx="3" fill="white" fillOpacity="0.55" />
            {/* Mini attendance bar */}
            <rect x="312" y="44" width="88" height="7" rx="3.5" fill="white" fillOpacity="0.15" />
            <rect x="312" y="44" width="70" height="7" rx="3.5" fill="#93c5fd" fillOpacity="0.9" />
            <rect x="312" y="58" width="40" height="5" rx="2.5" fill="white" fillOpacity="0.4" />
            <rect x="312" y="68" width="60" height="5" rx="2.5" fill="white" fillOpacity="0.25" />

            {/* Floating notification — fee due */}
            <rect x="10" y="18" width="136" height="52" rx="12" fill="#0c2461" fillOpacity="0.9" />
            <rect x="10" y="18" width="136" height="52" rx="12" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
            <circle cx="30" cy="44" r="10" fill="#60aeff" fillOpacity="0.85" />
            <rect x="46" y="36" width="86" height="6" rx="3" fill="white" fillOpacity="0.9" />
            <rect x="46" y="47" width="62" height="5" rx="2.5" fill="white" fillOpacity="0.45" />

            {/* Stat cards below house */}
            <rect x="60" y="284" width="86" height="44" rx="10" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.18" strokeWidth="1" />
            <rect x="70" y="294" width="40" height="5" rx="2.5" fill="white" fillOpacity="0.5" />
            <rect x="70" y="305" width="60" height="10" rx="4" fill="white" fillOpacity="0.75" />
            <rect x="70" y="320" width="30" height="4" rx="2" fill="#fdba74" fillOpacity="0.8" />

            <rect x="167" y="284" width="86" height="44" rx="10" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.18" strokeWidth="1" />
            <rect x="177" y="294" width="40" height="5" rx="2.5" fill="white" fillOpacity="0.5" />
            <rect x="177" y="305" width="60" height="10" rx="4" fill="white" fillOpacity="0.75" />
            <rect x="177" y="320" width="30" height="4" rx="2" fill="#86efac" fillOpacity="0.8" />

            <rect x="274" y="284" width="86" height="44" rx="10" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.18" strokeWidth="1" />
            <rect x="284" y="294" width="40" height="5" rx="2.5" fill="white" fillOpacity="0.5" />
            <rect x="284" y="305" width="60" height="10" rx="4" fill="white" fillOpacity="0.75" />
            <rect x="284" y="320" width="30" height="4" rx="2" fill="#a5b4fc" fillOpacity="0.8" />
          </svg>

          {/* Text */}
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Parent Monitoring Portal
            </h2>
            <p className="text-blue-100/80 text-sm leading-relaxed max-w-xs">
              Stay connected with your child's academic journey — track attendance, fees, results, and more from home.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            {["Attendance", "Fee Status", "Results", "Assignments"].map(
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
                Parent Sign In
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Sign in using your child's credentials
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
                Student Email Address
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 px-4 rounded-xl font-semibold shadow-md shadow-primary/25 hover:shadow-primary/40 hover:brightness-105 active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
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
    </div>
  );
}
