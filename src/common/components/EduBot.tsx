"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { FaRobot, FaTimes, FaPaperPlane, FaUser, FaLock } from "react-icons/fa";
import { auth, db } from "../../config/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  limit,
  orderBy,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Role = "admin" | "faculty" | "student" | "parent";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

interface ResolvedUser {
  uid: string;
  name: string;
  email: string;
  role: Role;
  // role-specific extras
  batchId?: string;       // student's batch
  childUid?: string;      // parent's child UID
  childName?: string;
  facultySubjects?: string[]; // faculty's subject IDs
}

// ─────────────────────────────────────────────
// Intent → keyword map (no AI needed here)
// ─────────────────────────────────────────────
const INTENT_KEYWORDS: Record<string, string[]> = {
  attendance: ["attendance", "present", "absent", "classes missed", "attendance report", "attendance percentage"],
  assignments: ["assignment", "homework", "submission", "deadline", "pending assignment", "due"],
  timetable: ["timetable", "schedule", "class schedule", "period", "today's class"],
  leaves: ["leave", "leaves", "leave balance", "leave application", "leave history", "applied leave"],
  results: ["result", "marks", "grade", "cgpa", "performance", "score", "exam"],
  notifications: ["notification", "notice", "announcement", "alert"],
  profile: ["profile", "my info", "my details", "my data", "who am i"],
  students: ["student list", "students in batch", "batch students", "how many students", "student info", "student details"],
  faculty: ["faculty list", "teacher list", "faculty info", "faculty details", "staff", "teachers"],
  departments: ["department", "departments", "dept stats", "department info"],
  evaluation: ["evaluation", "appraisal", "rating", "faculty rating"],
  student_leaves: ["student leave", "student leave application", "leave requests", "pending leaves"],
};

// ─────────────────────────────────────────────
// Role → allowed intents (hard gate — 0 crossing)
// ─────────────────────────────────────────────
const ROLE_ALLOWED_INTENTS: Record<Role, string[]> = {
  student: ["attendance", "assignments", "timetable", "leaves", "results", "notifications", "profile"],
  faculty: ["attendance", "assignments", "timetable", "leaves", "results", "notifications", "profile", "students", "student_leaves", "evaluation"],
  admin: ["attendance", "assignments", "timetable", "leaves", "results", "notifications", "profile", "students", "faculty", "departments", "student_leaves", "evaluation"],
  parent: ["attendance", "assignments", "timetable", "results", "notifications", "profile"],
};

// Quick action chips per role
const QUICK_ACTIONS: Record<Role, { label: string; intent: string }[]> = {
  student: [
    { label: "📊 My Attendance", intent: "attendance" },
    { label: "📝 Assignments", intent: "assignments" },
    { label: "📅 Timetable", intent: "timetable" },
    { label: "🏖️ My Leaves", intent: "leaves" },
    { label: "🎯 Results", intent: "results" },
    { label: "🔔 Notifications", intent: "notifications" },
  ],
  faculty: [
    { label: "📊 My Attendance", intent: "attendance" },
    { label: "🏖️ Leave Balance", intent: "leaves" },
    { label: "👥 Batch Students", intent: "students" },
    { label: "📝 Assignments", intent: "assignments" },
    { label: "📅 Timetable", intent: "timetable" },
    { label: "🔔 Notifications", intent: "notifications" },
  ],
  admin: [
    { label: "👥 Students", intent: "students" },
    { label: "👨‍🏫 Faculty", intent: "faculty" },
    { label: "🏢 Departments", intent: "departments" },
    { label: "🏖️ Leave Requests", intent: "student_leaves" },
    { label: "📊 Attendance", intent: "attendance" },
    { label: "🔔 Notifications", intent: "notifications" },
  ],
  parent: [
    { label: "📊 Child's Attendance", intent: "attendance" },
    { label: "📝 Child's Assignments", intent: "assignments" },
    { label: "🎯 Child's Results", intent: "results" },
    { label: "📅 Child's Timetable", intent: "timetable" },
    { label: "🔔 Notifications", intent: "notifications" },
    { label: "👤 Child's Profile", intent: "profile" },
  ],
};

// ─────────────────────────────────────────────
// Intent classifier (pure JS, no DB, no AI)
// ─────────────────────────────────────────────
function classifyIntent(message: string): string | null {
  const lower = message.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return intent;
  }
  return null;
}

// ─────────────────────────────────────────────
// Role gate check
// ─────────────────────────────────────────────
function isIntentAllowed(role: Role, intent: string): boolean {
  return ROLE_ALLOWED_INTENTS[role]?.includes(intent) ?? false;
}

// ─────────────────────────────────────────────
// Firestore data fetchers — each fetches ONLY
// what is needed for the specific intent & user.
// All queries are scoped with uid/role constraints.
// ─────────────────────────────────────────────
async function fetchForIntent(
  intent: string,
  user: ResolvedUser
): Promise<any> {
  const col = collection; // just an alias for readability

  switch (intent) {
    // ── ATTENDANCE ──────────────────────────────
    case "attendance": {
      if (user.role === "student") {
        const q = query(
          col(db, "attendance"),
          where("studentId", "==", user.uid)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "faculty") {
        const q = query(
          col(db, "faculty_attendance"),
          where("facultyId", "==", user.uid)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "parent" && user.childUid) {
        const q = query(
          col(db, "attendance"),
          where("studentId", "==", user.childUid)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "admin") {
        // Admin: summarise overall — fetch limited records to avoid cost
        const q = query(col(db, "attendance"), limit(50));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      return null;
    }

    // ── ASSIGNMENTS ──────────────────────────────
    case "assignments": {
      if (user.role === "student") {
        const q = query(
          col(db, "assignments"),
          where("studentId", "==", user.uid)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "faculty") {
        // Faculty sees assignments they created (by facultyId)
        const q = query(
          col(db, "assignments"),
          where("facultyId", "==", user.uid),
          limit(20)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "parent" && user.childUid) {
        const q = query(
          col(db, "assignments"),
          where("studentId", "==", user.childUid)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "admin") {
        const q = query(col(db, "assignments"), limit(20));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      return null;
    }

    // ── TIMETABLE ──────────────────────────────
    case "timetable": {
      if (user.role === "student" && user.batchId) {
        const q = query(
          col(db, "timetables"),
          where("batchId", "==", user.batchId)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "faculty") {
        const q = query(
          col(db, "timetables"),
          where("facultyId", "==", user.uid)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "parent" && user.childUid) {
        // Get child's batchId first
        const studentSnap = await getDocs(
          query(col(db, "students"), where("uid", "==", user.childUid))
        );
        if (!studentSnap.empty) {
          const studentData = studentSnap.docs[0].data();
          const batchId = studentData.batchId;
          if (batchId) {
            const q = query(
              col(db, "timetables"),
              where("batchId", "==", batchId)
            );
            const snap = await getDocs(q);
            return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          }
        }
      }
      if (user.role === "admin") {
        const q = query(col(db, "timetables"), limit(20));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      return null;
    }

    // ── LEAVES ──────────────────────────────────
    case "leaves": {
      if (user.role === "student") {
        const q = query(
          col(db, "student_leaves"),
          where("studentId", "==", user.uid)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "faculty") {
        // Fetch both leave applications and balances
        const [leavesSnap, balancesSnap] = await Promise.all([
          getDocs(
            query(col(db, "faculty_leaves"), where("facultyId", "==", user.uid))
          ),
          getDocs(
            query(col(db, "leave_balances"), where("facultyId", "==", user.uid))
          ),
        ]);
        return {
          applications: leavesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          balances: balancesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        };
      }
      if (user.role === "admin") {
        // Admin sees all pending faculty leaves
        const q = query(
          col(db, "faculty_leaves"),
          where("status", "==", "pending"),
          limit(20)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      return null;
    }

    // ── RESULTS / PERFORMANCE ──────────────────
    case "results": {
      if (user.role === "student") {
        const q = query(
          col(db, "evaluation_reports"),
          where("studentId", "==", user.uid)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "faculty") {
        // Faculty can see evaluation reports they created
        const q = query(
          col(db, "evaluation_reports"),
          where("facultyId", "==", user.uid),
          limit(20)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "parent" && user.childUid) {
        const q = query(
          col(db, "evaluation_reports"),
          where("studentId", "==", user.childUid)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "admin") {
        const q = query(col(db, "evaluation_reports"), limit(20));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      return null;
    }

    // ── NOTIFICATIONS ──────────────────────────
    case "notifications": {
      const q = query(
        col(db, "notifications"),
        where("targetRole", "in", [user.role, "all"]),
        limit(10)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }

    // ── PROFILE ────────────────────────────────
    case "profile": {
      if (user.role === "student") {
        const snap = await getDoc(doc(db, "students", user.uid));
        return snap.exists() ? snap.data() : null;
      }
      if (user.role === "faculty") {
        const [profileSnap, facultySnap] = await Promise.all([
          getDocs(query(col(db, "faculty_profiles"), where("facultyId", "==", user.uid))),
          getDoc(doc(db, "faculty", user.uid)),
        ]);
        return {
          profile: profileSnap.empty ? null : profileSnap.docs[0].data(),
          faculty: facultySnap.exists() ? facultySnap.data() : null,
        };
      }
      if (user.role === "parent") {
        // Parents may be stored by email — try email-based query
        const q = query(col(db, "parents"), where("email", "==", user.email));
        const snap = await getDocs(q);
        return snap.empty ? null : snap.docs[0].data();
      }
      if (user.role === "admin") {
        // Admins: try by email since admins collection structure may vary
        const q = query(col(db, "admins"), where("email", "==", user.email));
        const snap = await getDocs(q);
        return snap.empty ? null : snap.docs[0].data();
      }
      return null;
    }

    // ── STUDENTS (faculty & admin only) ────────
    case "students": {
      if (user.role === "faculty" && user.batchId) {
        const q = query(
          col(db, "students"),
          where("batchId", "==", user.batchId)
        );
        const snap = await getDocs(q);
        // Return only non-sensitive fields
        return snap.docs.map((d) => {
          const data = d.data();
          return { name: data.name, regNumber: data.regNumber, batchId: data.batchId };
        });
      }
      if (user.role === "admin") {
        const q = query(col(db, "students"), limit(30));
        const snap = await getDocs(q);
        return snap.docs.map((d) => {
          const data = d.data();
          return { name: data.name, regNumber: data.regNumber, department: data.department, batch: data.batch };
        });
      }
      return null;
    }

    // ── FACULTY (admin only) ───────────────────
    case "faculty": {
      if (user.role === "admin") {
        const q = query(col(db, "faculty"), limit(30));
        const snap = await getDocs(q);
        return snap.docs.map((d) => {
          const data = d.data();
          return { name: data.name, email: data.email, department: data.department, designation: data.designation };
        });
      }
      return null;
    }

    // ── DEPARTMENTS (admin only) ───────────────
    case "departments": {
      if (user.role === "admin") {
        const snap = await getDocs(col(db, "departments"));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      return null;
    }

    // ── EVALUATION (faculty & admin only) ─────
    case "evaluation": {
      if (user.role === "faculty") {
        const q = query(
          col(db, "evaluation_reports"),
          where("facultyId", "==", user.uid),
          limit(10)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "admin") {
        const q = query(col(db, "evaluation_reports"), limit(20));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      return null;
    }

    // ── STUDENT LEAVES (faculty & admin only) ──
    case "student_leaves": {
      if (user.role === "faculty" && user.batchId) {
        const q = query(
          col(db, "student_leaves"),
          where("batchId", "==", user.batchId),
          where("status", "==", "pending"),
          limit(20)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "admin") {
        const q = query(
          col(db, "student_leaves"),
          where("status", "==", "pending"),
          limit(20)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      return null;
    }

    default:
      return null;
  }
}

// ─────────────────────────────────────────────
// Resolve user role & extras from Firestore
// Called ONCE when chat opens (not on every message)
// ─────────────────────────────────────────────
async function resolveUser(
  uid: string,
  email: string,
  displayName: string | null
): Promise<ResolvedUser | null> {
  try {
    // 1. Check students — doc ID IS the Firebase Auth UID
    const studentDoc = await getDoc(doc(db, "students", uid));
    if (studentDoc.exists()) {
      const data = studentDoc.data();
      return {
        uid,
        name: data.name || displayName || email.split("@")[0],
        email,
        role: "student",
        batchId: data.batchId,
      };
    }

    // 2. Check faculty — doc ID IS the Firebase Auth UID
    const facultyDoc = await getDoc(doc(db, "faculty", uid));
    if (facultyDoc.exists()) {
      const data = facultyDoc.data();
      return {
        uid,
        name: data.name || displayName || email.split("@")[0],
        email,
        role: "faculty",
        batchId: data.batchId,
        facultySubjects: data.subjects || [],
      };
    }

    // 3. Check admins — query by email (admins may not use uid as doc ID)
    const adminSnap = await getDocs(
      query(collection(db, "admins"), where("email", "==", email))
    );
    if (!adminSnap.empty) {
      const data = adminSnap.docs[0].data();
      return {
        uid,
        name: data.name || displayName || "Admin",
        email,
        role: "admin",
      };
    }

    // 4. Check parents — query by email
    const parentSnap = await getDocs(
      query(collection(db, "parents"), where("email", "==", email))
    );
    if (!parentSnap.empty) {
      const data = parentSnap.docs[0].data();
      const childUid = data.childUid || data.studentUid || null;
      let childName: string | undefined;

      // Fetch child's name using doc ID lookup
      if (childUid) {
        const childDoc = await getDoc(doc(db, "students", childUid));
        if (childDoc.exists()) {
          childName = childDoc.data().name;
        }
      }

      return {
        uid,
        name: data.name || displayName || "Parent",
        email,
        role: "parent",
        childUid,
        childName,
      };
    }

    return null; // user not found in any role collection
  } catch (error) {
    console.error("Error resolving user:", error);
    return null;
  }
}

// ─────────────────────────────────────────────
// EduBot Component
// ─────────────────────────────────────────────
export default function EduBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [resolvedUser, setResolvedUser] = useState<ResolvedUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const userResolutionDone = useRef(false);

  // ── Auth listener ─────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && !userResolutionDone.current) {
        userResolutionDone.current = true;
        const resolved = await resolveUser(
          firebaseUser.uid,
          firebaseUser.email || "",
          firebaseUser.displayName
        );
        setResolvedUser(resolved);
      } else if (!firebaseUser) {
        setResolvedUser(null);
        userResolutionDone.current = false;
      }
      setIsLoadingUser(false);
    });
    return () => unsub();
  }, []);

  // ── Welcome message ───────────────────────
  useEffect(() => {
    if (resolvedUser && messages.length === 0) {
      const roleLabel: Record<Role, string> = {
        admin: "Administrative Assistant",
        faculty: "Faculty Assistant",
        student: "Student Assistant",
        parent: "Parent Portal Assistant",
      };
      setMessages([
        {
          id: "welcome",
          text: `👋 Hello, **${resolvedUser.name}!**\n\nI'm EduBot — your ${roleLabel[resolvedUser.role]}. I only provide information from the institution's records. Use the quick actions below or type your question.`,
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    }
  }, [resolvedUser, messages.length]);

  // ── Scroll to bottom ──────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Focus input on open ───────────────────
  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  // ─────────────────────────────────────────
  // Core message handler
  // ─────────────────────────────────────────
  const handleSendMessage = useCallback(
    async (messageText?: string) => {
      const text = (messageText || inputValue).trim();
      if (!text || !resolvedUser) return;

      // Add user message immediately
      const userMsg: Message = {
        id: Date.now().toString(),
        text,
        sender: "user",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputValue("");
      setIsTyping(true);

      const addBotMessage = (content: string) => {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: content,
            sender: "bot",
            timestamp: new Date(),
          },
        ]);
        setIsTyping(false);
      };

      try {
        // ── Step 1: Classify intent (no DB, no AI) ──
        const intent = classifyIntent(text);

        if (!intent) {
          addBotMessage(
            `I can only help you with specific information from the portal.\n\nTry asking about:\n${ROLE_ALLOWED_INTENTS[resolvedUser.role]
              .map((i) => `• ${i.replace(/_/g, " ")}`)
              .join("\n")}`
          );
          return;
        }

        // ── Step 2: Role gate (hard block) ──────────
        if (!isIntentAllowed(resolvedUser.role, intent)) {
          addBotMessage(
            `🔒 Access Denied\n\nYou don't have permission to view that information. As a **${resolvedUser.role}**, you can only access:\n${ROLE_ALLOWED_INTENTS[resolvedUser.role]
              .map((i) => `• ${i.replace(/_/g, " ")}`)
              .join("\n")}`
          );
          return;
        }

        // ── Step 3: Fetch data from Firestore ───────
        let contextData: any = null;
        try {
          contextData = await fetchForIntent(intent, resolvedUser);
        } catch (dbError) {
          console.error("DB fetch error:", dbError);
          addBotMessage("⚠️ Could not retrieve data from the server. Please try again.");
          return;
        }

        // Serialize history for the API (exclude current message which is sent separately as 'intent')
        // Optimisation: Only send the last 10 messages to keep context size manageable
        const chatHistory = messages
          .filter(m => m.id !== "welcome")
          .slice(-10) // Sliding window: last 10 messages
          .map(m => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text
          }));

        // ── Step 4: Call Gemini API (server-side) ───
        const response = await fetch("/api/edubot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: resolvedUser.role,
            userName: resolvedUser.name,
            intent,
            contextData,
            chatHistory, // Pass history to backend
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        addBotMessage(data.response || "No response from server.");
      } catch (error) {
        console.error("EduBot error:", error);
        addBotMessage("⚠️ Something went wrong. Please try again.");
        setIsTyping(false);
      }
    },
    [inputValue, resolvedUser]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Don't render if not logged in or session loading
  if (isLoadingUser || !resolvedUser) return null;

  const quickActions = QUICK_ACTIONS[resolvedUser.role] || [];

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────
  return (
    <>
      {/* ── Toggle Button ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-br from-blue-600 via-violet-600 to-purple-700 text-white p-4 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300 group"
          aria-label="Open EduBot"
        >
          <FaRobot size={26} className="group-hover:rotate-12 transition-transform duration-300" />
          <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse shadow-md">
            AI
          </span>
        </button>
      )}

      {/* ── Chat Window ── */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[440px] h-[620px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100"
          style={{ animation: "slideUp 0.25s ease-out" }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-violet-600 to-purple-700 text-white p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
                  <FaRobot size={18} />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">EduBot</h3>
                <p className="text-xs text-white/80 flex items-center gap-1">
                  <FaLock size={9} />
                  {resolvedUser.role.charAt(0).toUpperCase() + resolvedUser.role.slice(1)} Assistant
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close EduBot"
            >
              <FaTimes size={18} />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-b from-slate-50 to-white px-3 py-2.5 border-b border-gray-100 flex-shrink-0">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-2">Quick Actions</p>
            <div className="flex flex-wrap gap-1.5">
              {quickActions.map((action) => (
                <button
                  key={action.intent}
                  onClick={() => handleSendMessage(action.label.replace(/^[^\w]+ /, ""))}
                  disabled={isTyping}
                  className="text-[11px] bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.sender === "bot"
                    ? "bg-gradient-to-br from-blue-500 to-violet-600 text-white"
                    : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {msg.sender === "bot" ? <FaRobot size={13} /> : <FaUser size={13} />}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${msg.sender === "user"
                    ? "bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-br-sm"
                    : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm"
                  }`}
                >
                  {msg.sender === "bot" ? (
                    <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed prose-headings:font-semibold prose-headings:text-gray-800 prose-h1:text-base prose-h2:text-sm prose-h3:text-sm prose-strong:font-semibold prose-strong:text-gray-900 prose-ul:my-1 prose-ul:pl-4 prose-li:my-0.5 prose-ol:my-1 prose-ol:pl-4 prose-code:text-[11px] prose-code:bg-gray-100 prose-code:text-violet-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-3 prose-pre:text-xs prose-pre:overflow-x-auto prose-pre:my-2 prose-a:text-blue-600 prose-a:underline prose-blockquote:border-l-2 prose-blockquote:border-blue-300 prose-blockquote:pl-2 prose-blockquote:italic prose-blockquote:text-gray-600">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  )}
                  <p className={`text-[10px] mt-1 ${msg.sender === "user" ? "text-white/60 text-right" : "text-gray-400"}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-white flex items-center justify-center">
                  <FaRobot size={13} />
                </div>
                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your data..."
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm bg-gray-50"
                disabled={isTyping}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isTyping}
                className="bg-gradient-to-br from-blue-600 to-violet-600 text-white p-2.5 rounded-full hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                aria-label="Send"
              >
                <FaPaperPlane size={16} />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 text-center flex items-center justify-center gap-1">
              <FaLock size={9} />
              Responses are limited to your role · {resolvedUser.name}
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
