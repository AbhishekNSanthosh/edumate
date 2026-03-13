"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FaRobot,
  FaTimes,
  FaPaperPlane,
  FaUser,
  FaLock,
  FaMicrophone,
  FaVolumeUp,
  FaVolumeMute,
} from "react-icons/fa";
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
  addDoc,
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
  batchId?: string; // student's batch
  regNumber?: string; // student's registration number
  childUid?: string; // parent's child UID
  childName?: string;
  facultySubjects?: string[]; // faculty's subject IDs
}

// ─────────────────────────────────────────────
// Intent → keyword map (no AI needed here)
// ─────────────────────────────────────────────
const INTENT_KEYWORDS: Record<string, string[]> = {
  attendance: [
    "attendance",
    "present",
    "absent",
    "classes missed",
    "attendance report",
    "attendance percentage",
    "how many classes can i skip",
    "how many classes can i miss",
    "how many days can i skip",
    "how many days can i miss",
    "skip",
    "bunk",
    "maintain 75",
    "maintain attendance",
    "75%",
    "shortage",
    // Malayalam / Manglish
    "ഹാജർ",
    "hajr",
    "haazir",
    "class poyi",
    "class poyilla",
    "ethra class",
  ],
  assignments: [
    "assignment",
    "homework",
    "submission",
    "deadline",
    "pending assignment",
    "due",
    // Malayalam / Manglish
    "അസൈൻമെന്റ്",
    "homework kodukkana",
    "submit cheyyanda",
  ],
  timetable: [
    "timetable",
    "schedule",
    "class schedule",
    "period",
    "today's class",
    // Malayalam / Manglish
    "ടൈംടേബിൾ",
    "innathe class",
    "class evide",
    "engane class",
    "class schedule",
  ],
  leaves: [
    "leave",
    "leaves",
    "leave balance",
    "leave application",
    "leave history",
    "applied leave",
    // Malayalam / Manglish
    "ലീവ്",
    "leave edukkan",
    "avanhi edukkan",
  ],
  results: [
    "result", "marks", "grade", "cgpa", "performance", "score", "exam",
    // Malayalam / Manglish
    "മാർക്ക്", "റിസൾട്ട്", "mark kitty", "exam result", "ente marks",
  ],
  notifications: [
    "notification", "notice", "announcement", "alert",
    // Malayalam / Manglish
    "അറിയിപ്പ്", "notice board", "enthenkilum update",
  ],
  profile: [
    "profile",
    "my info",
    "my details",
    "my data",
    "who am i",
    "my name",
    "what's my name",
    "what is my name",
    "tell me my name",
    "my email",
    "my roll",
    "my id",
    "my account",
    "account",
    // Malayalam / Manglish
    "അക്കൗണ്ട്", "പ്രൊഫൈൽ", "എന്റെ വിവരങ്ങൾ", "ente profile", "ente account",
  ],
  students: [
    "student list",
    "list students",
    "students",
    "students in batch",
    "batch students",
    "how many students",
    "student info",
    "student details",
  ],
  faculty: [
    "faculty list",
    "teacher list",
    "faculty info",
    "faculty details",
    "staff",
    "teachers",
  ],
  departments: ["department", "departments", "dept stats", "department info"],
  internals: [
    "internal", "internals", "internal mark", "internal marks",
    "clearing internals", "pass internals", "internal calculation",
    "how much mark", "marks needed", "series exam", "series mark",
    "first series", "second series", "internal assessment",
    // Malayalam / Manglish
    "ഇന്റേണൽ", "internal mark entha", "internal kittan", "series mark",
  ],
  evaluation: ["evaluation", "appraisal", "rating", "faculty rating"],
  student_leaves: [
    "student leave",
    "student leave application",
    "leave requests",
    "pending leaves",
  ],
};

// Greeting / chitchat — handled locally, no DB or AI needed
const GREETING_KEYWORDS = [
  "hi",
  "hello",
  "hey",
  "howdy",
  "sup",
  "what's up",
  "whatsup",
  "how are you",
  "how r u",
  "good morning",
  "good afternoon",
  "good evening",
  "good night",
  "yo",
  "hiya",
  "greetings",
  // Malayalam / Manglish
  "namaskaram",
  "sugham aano",
  "enthaa vishesham",
  "നമസ്കാരം",
  "സുഖമാണോ",
];

function isGreeting(message: string): boolean {
  const lower = message.trim().toLowerCase();
  return GREETING_KEYWORDS.some(
    (kw) =>
      lower === kw || lower.startsWith(kw + " ") || lower.endsWith(" " + kw),
  );
}

// Time/date questions — handled locally
const TIME_DATE_KEYWORDS = [
  "what time",
  "what's the time",
  "current time",
  "time now",
  "what date",
  "what's the date",
  "today's date",
  "current date",
  "what day",
  "what's today",
  "ippol samayam",
  "samayam entha",
  "innu entha divasam",
  "സമയം",
  "തീയതി",
];

function isTimeDateQuery(message: string): string | null {
  const lower = message.toLowerCase();
  const isTime = TIME_DATE_KEYWORDS.some((kw) => lower.includes(kw));
  if (!isTime) return null;

  const now = new Date();
  const hasTime = ["time", "samayam", "സമയം"].some((kw) => lower.includes(kw));
  const hasDate = ["date", "divasam", "today", "തീയതി", "day", "innu"].some((kw) => lower.includes(kw));

  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  if (hasDate && hasTime) return `📅 **${dateStr}**\n🕐 **${timeStr}**`;
  if (hasDate) return `📅 Today is **${dateStr}**`;
  return `🕐 The current time is **${timeStr}**`;
}

// ─────────────────────────────────────────────
// Role → allowed intents (hard gate — 0 crossing)
// ─────────────────────────────────────────────
const ROLE_ALLOWED_INTENTS: Record<Role, string[]> = {
  student: [
    "attendance",
    "assignments",
    "timetable",
    "leaves",
    "results",
    "internals",
    "notifications",
    "profile",
  ],
  faculty: [
    "attendance",
    "assignments",
    "timetable",
    "leaves",
    "results",
    "notifications",
    "profile",
    "students",
    "student_leaves",
    "evaluation",
  ],
  admin: [
    "attendance",
    "assignments",
    "timetable",
    "leaves",
    "results",
    "notifications",
    "profile",
    "students",
    "faculty",
    "departments",
    "student_leaves",
    "evaluation",
  ],
  parent: [
    "attendance",
    "assignments",
    "timetable",
    "results",
    "internals",
    "notifications",
    "profile",
  ],
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
  user: ResolvedUser,
  userMessage?: string,
): Promise<any> {
  const col = collection; // just an alias for readability

  switch (intent) {
    // ── ATTENDANCE ──────────────────────────────
    case "attendance": {
      if (user.role === "student") {
        const q = query(
          col(db, "attendance"),
          where("studentId", "==", user.uid),
        );
        const snap = await getDocs(q);
        const bySubject: Record<string, any> = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          const key = data.subjectId || data.subject || data.subjectName || "Unknown";
          const name = data.subjectName || data.subject || key;
          if (!bySubject[key]) bySubject[key] = { subject: name, totalClasses: 0, attendedClasses: 0 };
          
          if (data.totalClasses !== undefined) {
             // old schema direct mapping
             bySubject[key].totalClasses = data.totalClasses;
             bySubject[key].attendedClasses = data.attendedClasses;
          } else {
             // new per-slot schema
             bySubject[key].totalClasses += 1;
             if (data.status === "Present" || data.status === "Late" || data.status === "DutyLeave") {
                bySubject[key].attendedClasses += 1;
             }
          }
        });
        
        // Pre-calculate predictions so AI doesn't have to do math
        const results = Object.values(bySubject).map((s: any) => {
          const t = s.totalClasses;
          const a = s.attendedClasses;
          const pct = t > 0 ? (a / t) * 100 : 0;
          let skip = Math.floor((a - 0.75 * t) / 0.75);
          skip = skip < 0 ? 0 : skip;
          let need = Math.ceil(3 * t - 4 * a);
          need = need < 0 ? 0 : need;
          
          return {
            ...s,
            attendancePercentage: pct.toFixed(1) + "%",
            classesCanSkip: pct >= 75 ? skip : 0,
            classesNeededToReach75: pct < 75 ? need : 0
          };
        });
        return results;
      }
      if (user.role === "faculty") {
        const q = query(
          col(db, "faculty_attendance"),
          where("facultyId", "==", user.uid),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "parent" && user.childUid) {
        const q = query(
          col(db, "attendance"),
          where("studentId", "==", user.childUid),
        );
        const snap = await getDocs(q);
        const bySubject: Record<string, any> = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          const key = data.subjectId || data.subject || data.subjectName || "Unknown";
          const name = data.subjectName || data.subject || key;
          if (!bySubject[key]) bySubject[key] = { subject: name, totalClasses: 0, attendedClasses: 0 };
          
          if (data.totalClasses !== undefined) {
             bySubject[key].totalClasses = data.totalClasses;
             bySubject[key].attendedClasses = data.attendedClasses;
          } else {
             bySubject[key].totalClasses += 1;
             if (data.status === "Present" || data.status === "Late" || data.status === "DutyLeave") {
                bySubject[key].attendedClasses += 1;
             }
          }
        });
        
        const results = Object.values(bySubject).map((s: any) => {
          const t = s.totalClasses;
          const a = s.attendedClasses;
          const pct = t > 0 ? (a / t) * 100 : 0;
          let skip = Math.floor((a - 0.75 * t) / 0.75);
          skip = skip < 0 ? 0 : skip;
          let need = Math.ceil(3 * t - 4 * a);
          need = need < 0 ? 0 : need;
          
          return {
            ...s,
            attendancePercentage: pct.toFixed(1) + "%",
            classesCanSkip: pct >= 75 ? skip : 0,
            classesNeededToReach75: pct < 75 ? need : 0
          };
        });
        return results;
      }
      if (user.role === "admin") {
        // Admin does NOT have personal attendance — return an institutional overview
        const q = query(col(db, "attendance"), limit(50));
        const snap = await getDocs(q);
        const records = snap.docs.map((d) => d.data());

        // Collect unique student IDs to resolve names
        const studentIds = Array.from(new Set(records.map((r) => r.studentId).filter(Boolean)));
        const nameMap = new Map<string, string>();
        // Batch-resolve student names (doc ID = uid)
        await Promise.all(
          studentIds.map(async (sid) => {
            try {
              const sDoc = await getDoc(doc(db, "students", sid));
              if (sDoc.exists()) {
                nameMap.set(sid, sDoc.data().name || "Unknown");
              }
            } catch { /* skip */ }
          }),
        );

        // Deduplicate by student+subject
        const seen = new Map<string, { studentName: string; subject: string; attended: number; total: number }>();
        for (const r of records) {
          const subject = r.subject || r.subjectName || "N/A";
          const key = `${r.studentId}_${subject}`;
          if (!seen.has(key)) {
            seen.set(key, {
              studentName: nameMap.get(r.studentId) || "Unknown Student",
              subject,
              attended: Number(r.attendedClasses ?? r.present ?? 0),
              total: Number(r.totalClasses ?? r.total ?? 0),
            });
          }
        }

        return {
          _adminOverview: true,
          note: "This is an institutional attendance overview. Admins do not have personal attendance records.",
          totalRecordsSampled: records.length,
          uniqueStudents: studentIds.length,
          summary: Array.from(seen.values()),
        };
      }
      return null;
    }

    // ── ASSIGNMENTS ──────────────────────────────
    case "assignments": {
      if (user.role === "student") {
        const q = query(
          col(db, "assignments"),
          where("studentId", "==", user.uid),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "faculty") {
        // Faculty sees assignments they created (by facultyId)
        const q = query(
          col(db, "assignments"),
          where("facultyId", "==", user.uid),
          limit(20),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "parent" && user.childUid) {
        const q = query(
          col(db, "assignments"),
          where("studentId", "==", user.childUid),
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
      // Pre-process raw timetable doc into clean per-day structure for AI
      const processTT = (docData: any, docId: string) => {
        const entries: any[] = docData.entries || [];
        const timings: any[] = docData.timings || [];
        const satTimings: any[] = docData.saturdayTimings || [];
        const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const schedule: Record<string, any[]> = {};
        for (const day of DAYS) {
          const dayTimings = day === "Saturday" ? satTimings : timings;
          const slots: any[] = [];
          for (const slot of dayTimings) {
            if (slot.type === "interval") {
              slots.push({ time: slot.time, type: "break", label: slot.label || "Break" });
            } else {
              const entry = entries.find((e: any) => e.day === day && e.time === slot.time);
              if (entry) {
                slots.push({ time: entry.time, type: "class", subject: entry.subject, faculty: entry.faculty, room: entry.room || null });
              }
            }
          }
          if (slots.some((s) => s.type === "class")) schedule[day] = slots;
        }
        return { batchId: docId, schedule };
      };

      if (user.role === "student") {
        if (user.batchId) {
          const ttSnap = await getDoc(doc(db, "timetables", user.batchId));
          if (ttSnap.exists()) return processTT(ttSnap.data(), ttSnap.id);
        }
        if (!user.batchId) {
          const allSnap = await getDocs(collection(db, "timetables"));
          if (!allSnap.empty) return processTT(allSnap.docs[0].data(), allSnap.docs[0].id);
        }
        return null;
      }
      if (user.role === "faculty") {
        const snap = await getDocs(collection(db, "timetables"));
        const batchesSnap = await getDocs(collection(db, "batches"));
        const batchMap: Record<string, string> = {};
        batchesSnap.docs.forEach(d => { batchMap[d.id] = d.data().name || d.id; });
        const grouped: Record<string, any[]> = {};
        const normName = user.name.trim().toLowerCase();
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const batchName = batchMap[docSnap.id] || docSnap.id;
          (data.entries || []).forEach((entry: any) => {
            if ((entry.faculty || "").trim().toLowerCase() === normName) {
              if (!grouped[entry.day]) grouped[entry.day] = [];
              grouped[entry.day].push({ time: entry.time, subject: entry.subject, batch: batchName, room: entry.room || null });
            }
          });
        });
        return { schedule: grouped };
      }
      if (user.role === "parent" && user.childUid) {
        const studentSnap = await getDoc(doc(db, "students", user.childUid));
        if (studentSnap.exists()) {
          const batchId = studentSnap.data().batchId;
          if (batchId) {
            const ttSnap = await getDoc(doc(db, "timetables", batchId));
            if (ttSnap.exists()) return processTT(ttSnap.data(), ttSnap.id);
          }
        }
        return null;
      }
      if (user.role === "admin") {
        const q = query(collection(db, "timetables"), limit(10));
        const snap = await getDocs(q);
        return snap.docs.map((d) => processTT(d.data(), d.id));
      }
      return null;
    }



    // ── LEAVES ──────────────────────────────────
    case "leaves": {
      if (user.role === "student") {
        const q = query(
          col(db, "student_leaves"),
          where("studentId", "==", user.uid),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "faculty") {
        let balancesSnap = await getDocs(
          query(
            col(db, "leave_balances"),
            where("facultyId", "==", user.uid),
          )
        );

        // If balances were never initialized (faculty hasn't opened Leave page yet), generate them now
        if (balancesSnap.empty) {
          const balanceRef = col(db, "leave_balances");
          const defaults = [
            { name: "Casual Leave", code: "CL", balance: 12, description: "Personal reasons, max 3 consecutive days" },
            { name: "Sick Leave", code: "SL", balance: 10, description: "Medical reasons with certificate" },
            { name: "On Duty", code: "OD", balance: 5, description: "Official duty outside campus" },
            { name: "Earned Leave", code: "EL", balance: 20, description: "Accumulated leave" },
          ];
          
          for (const type of defaults) {
            await addDoc(balanceRef, { ...type, facultyId: user.uid });
          }
          
          // Re-fetch now that they are populated
          balancesSnap = await getDocs(
            query(
              col(db, "leave_balances"),
              where("facultyId", "==", user.uid),
            )
          );
        }

        const leavesSnap = await getDocs(
          query(
            col(db, "faculty_leaves"),
            where("facultyId", "==", user.uid),
          )
        );

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
          limit(20),
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
          where("studentId", "==", user.uid),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "faculty") {
        // Faculty can see evaluation reports they created
        const q = query(
          col(db, "evaluation_reports"),
          where("facultyId", "==", user.uid),
          limit(20),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "parent" && user.childUid) {
        const q = query(
          col(db, "evaluation_reports"),
          where("studentId", "==", user.childUid),
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
      // Role-wide notifications
      const roleQ = query(
        col(db, "notifications"),
        where("audience", "array-contains", user.role),
        limit(10),
      );
      // Personalized notifications for this user
      const personalQ = query(
        col(db, "notifications"),
        where("targetUid", "==", user.uid),
        limit(10),
      );
      const [roleSnap, personalSnap] = await Promise.all([
        getDocs(roleQ),
        getDocs(personalQ),
      ]);
      const map = new Map<string, any>();
      [...roleSnap.docs, ...personalSnap.docs].forEach((d) =>
        map.set(d.id, { id: d.id, ...d.data() }),
      );
      return Array.from(map.values()).slice(0, 15);
    }

    // ── PROFILE ────────────────────────────────
    case "profile": {
      if (user.role === "student") {
        const snap = await getDoc(doc(db, "students", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          return {
            name: d.name,
            email: d.email,
            phone: d.phone,
            regNumber: d.regNumber,
            batchId: d.batchId,
            bloodGroup: d.bloodGroup,
            dob: d.dob,
          };
        }
        return null;
      }
      if (user.role === "faculty") {
        const [profileSnap, facultySnap] = await Promise.all([
          getDocs(
            query(
              col(db, "faculty_profiles"),
              where("facultyId", "==", user.uid),
            ),
          ),
          getDoc(doc(db, "faculty", user.uid)),
        ]);
        return {
          profile: profileSnap.empty ? null : profileSnap.docs[0].data(),
          faculty: facultySnap.exists() ? facultySnap.data() : null,
        };
      }
      if (user.role === "parent") {
        const q = query(col(db, "parents"), where("email", "==", user.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0].data();
          return {
            name: d.name,
            email: d.email,
            phone: d.phone,
            studentName: d.studentName,
            relation: d.relation,
          };
        }
        return null;
      }
      if (user.role === "admin") {
        const q = query(col(db, "admins"), where("email", "==", user.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0].data();
          // Return all fields except sensitive ones (uid, password, tokens)
          const sensitiveKeys = ["uid", "password", "token", "refreshToken", "createdAt", "updatedAt"];
          const filtered: Record<string, any> = { role: "Admin" };
          for (const [key, value] of Object.entries(d)) {
            if (!sensitiveKeys.includes(key) && value !== undefined && value !== null && value !== "") {
              filtered[key] = value;
            }
          }
          return filtered;
        }
        // Fallback: use resolvedUser info if admins doc not found
        return {
          name: user.name,
          email: user.email,
          role: "Admin",
        };
      }
      return null;
    }

    // ── STUDENTS (faculty & admin only) ────────
    case "students": {
      if (user.role === "faculty") {
        let targetBatchId = user.batchId;
        let targetAcademicYear = "";
        let targetDepartment = "";
        
        if (!targetBatchId) {
           const allBatches = await getDocs(col(db, "batches"));
           const tutorBatch = allBatches.docs.find(d => {
             const b = d.data();
             return (
               b.tutor === user.name ||
               b.tutorId === user.uid ||
               (Array.isArray(b.tutors) && b.tutors.some((t: any) => t.id === user.uid || t.name === user.name))
             );
           });
           
           if (tutorBatch) {
              targetBatchId = tutorBatch.id;
              targetAcademicYear = tutorBatch.data().academicYear || "";
              targetDepartment = tutorBatch.data().department || "";
           }
        }

        if (!targetBatchId && !targetAcademicYear && !targetDepartment) {
            return []; // No batch assigned
        }

        let studentsList: any[] = [];
        
        // 1. Primary: batch == targetAcademicYear
        if (targetAcademicYear) {
           const snap = await getDocs(query(col(db, "students"), where("batch", "==", targetAcademicYear)));
           studentsList = snap.docs.map(d => d.data());
        }
        
        // 2. Fallback: batchId == targetBatchId
        if (studentsList.length === 0 && targetBatchId) {
            const snap = await getDocs(query(col(db, "students"), where("batchId", "==", targetBatchId)));
            studentsList = snap.docs.map(d => d.data());
        }

        // 3. Last Resort: filter all by normalized department
        if (studentsList.length === 0 && targetDepartment) {
           const allSnap = await getDocs(col(db, "students"));
           const normTarget = targetDepartment.toLowerCase().replace(/\s*&amp;\s*/g, " and ").replace(/\s*&\s*/g, " and ").replace(/\s+/g, " ").trim();
           studentsList = allSnap.docs.map(d => d.data()).filter((s:any) => {
              const dNorm = (s.department || "").toLowerCase().replace(/\s*&amp;\s*/g, " and ").replace(/\s*&\s*/g, " and ").replace(/\s+/g, " ").trim();
              return dNorm === normTarget;
           });
        }
        
        return studentsList.map(data => ({
            name: data.name,
            regNumber: data.regNumber,
            rollNumber: data.rollNumber,
            batch: data.batch,
            department: data.department
        }));
      }
      if (user.role === "admin") {
        // Map common abbreviations to possible full department names
        const DEPT_ALIASES: Record<string, string[]> = {
          CS: ["Computer Science", "CS"],
          CSE: ["Computer Science & Engineering", "Computer Science and Engineering", "CSE", "Computer Science"],
          ME: ["Mechanical Engineering", "Mechanical", "ME", "MECH"],
          MECH: ["Mechanical Engineering", "Mechanical", "ME", "MECH"],
          CE: ["Civil Engineering", "Civil", "CE"],
          CIVIL: ["Civil Engineering", "Civil", "CE"],
          ECE: ["Electronics & Communication", "Electronics and Communication", "ECE"],
          EC: ["Electronics & Communication", "Electronics and Communication", "ECE", "EC"],
          EEE: ["Electrical & Electronics", "Electrical and Electronics", "EEE"],
          EE: ["Electrical Engineering", "Electrical", "EEE", "EE"],
          IT: ["Information Technology", "IT"],
        };

        const deptMatch = userMessage?.toUpperCase().match(/\b(CSE|CS|MECH|ME|CIVIL|CE|ECE|EC|EEE|EE|IT)\b/);
        const snap = await getDocs(col(db, "students"));
        let allStudents = snap.docs.map((d) => {
          const data = d.data();
          return {
            name: data.name,
            regNumber: data.regNumber,
            department: data.department,
            batch: data.batch,
          };
        });

        let deptLabel = "All";
        if (deptMatch) {
          const aliases = DEPT_ALIASES[deptMatch[1]] || [deptMatch[1]];
          deptLabel = deptMatch[1];
          allStudents = allStudents.filter((s) =>
            aliases.some((alias) =>
              s.department?.toLowerCase().includes(alias.toLowerCase()),
            ),
          );
        }

        return {
          totalCount: allStudents.length,
          department: deptLabel,
          students: allStudents,
        };
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
          return {
            name: data.name,
            email: data.email,
            department: data.department,
            designation: data.designation,
          };
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
          limit(10),
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
          limit(20),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      if (user.role === "admin") {
        const q = query(
          col(db, "student_leaves"),
          where("status", "==", "pending"),
          limit(20),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      return null;
    }

    // ── INTERNALS (combined: attendance + assignments + series marks) ──
    case "internals": {
      const targetUid =
        user.role === "parent" && user.childUid ? user.childUid : user.uid;

      if (user.role === "student" || user.role === "parent") {
        // Fetch attendance
        const attSnap = await getDocs(
          query(col(db, "attendance"), where("studentId", "==", targetUid)),
        );
        const attendance = attSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Fetch assignments
        const asgSnap = await getDocs(
          query(col(db, "assignments"), where("studentId", "==", targetUid)),
        );
        const assignments = asgSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Fetch series/internal marks
        const intSnap = await getDocs(
          query(
            col(db, "evaluation_internals"),
            where("regNumber", "==", user.regNumber || ""),
          ),
        );
        const seriesMarks = intSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        return { attendance, assignments, seriesMarks };
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
  displayName: string | null,
  roleOverride?: "parent",
): Promise<ResolvedUser | null> {
  try {
    // 0. Explicit Override (Parent Portal)
    if (roleOverride === "parent") {
      const parentSnap = await getDocs(
        query(collection(db, "parents"), where("email", "==", email)),
      );
      if (!parentSnap.empty) {
        const data = parentSnap.docs[0].data();
        const childUid = data.childUid || data.studentUid || null;
        let childName: string | undefined;

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
      return null;
    }

    // 1. Check students — doc ID IS the Firebase Auth UID
    const studentDoc = await getDoc(doc(db, "students", uid));
    if (studentDoc.exists()) {
      const data = studentDoc.data();
      let batchId = data.batchId || "";

      // If batchId is not stored directly, resolve it from the batch name via batches collection
      if (!batchId && data.batch) {
        try {
          const batchSnap = await getDocs(collection(db, "batches"));
          const matchedBatch = batchSnap.docs.find((d) => {
            const bName = d.data().name || "";
            return (
              bName === data.batch ||
              bName.includes(data.batch) ||
              data.batch.includes(bName)
            );
          });
          if (matchedBatch) batchId = matchedBatch.id;
        } catch { /* skip */ }
      }

      return {
        uid,
        name: data.name || displayName || email.split("@")[0],
        email,
        role: "student",
        batchId,
        regNumber: data.regNumber || data.rollNumber || "",
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
      query(collection(db, "admins"), where("email", "==", email)),
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
      query(collection(db, "parents"), where("email", "==", email)),
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

// ────────────────────────────────────────────────────────────
// Preprocess bot message: convert bare image URLs to markdown image syntax
// so ReactMarkdown renders them as <img> tags.
// ────────────────────────────────────────────────────────────

function preprocessMessage(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      // Match: optional "Label:" then a Firebase Storage image URL
      const firebaseMatch = trimmed.match(
        /^([^\n:]*:)?\s*(https?:\/\/firebasestorage\.googleapis\.com\/[^\s]+alt=media[^\s]*)/i,
      );
      if (firebaseMatch) {
        const label = firebaseMatch[1]
          ? firebaseMatch[1].replace(/:$/, "").trim()
          : "";
        const url = firebaseMatch[2];
        return label ? `**${label}**\n\n![photo](${url})` : `![photo](${url})`;
      }

      // Match: optional "Label:" then a bare image URL by file extension
      const imgMatch = trimmed.match(
        /^([^\n:]*:)?\s*(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|webp|gif|svg)(\?[^\s]*)?)$/i,
      );
      if (imgMatch) {
        const label = imgMatch[1] ? imgMatch[1].replace(/:$/, "").trim() : "";
        const url = imgMatch[2];
        return label ? `**${label}**\n\n![image](${url})` : `![image](${url})`;
      }

      return line;
    })
    .join("\n");
}

type MicState = "idle" | "listening" | "processing";

// Detect if text contains Malayalam script
function containsMalayalam(text: string): boolean {
  return /[\u0D00-\u0D7F]/.test(text);
}

// ─────────────────────────────────────────────
// EduBot Component
// ─────────────────────────────────────────────
export default function EduBot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [micState, setMicState] = useState<MicState>("idle");
  const [resolvedUser, setResolvedUser] = useState<ResolvedUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const userResolutionDone = useRef(false);
  const recognitionRef = useRef<any>(null);
  // Synchronous ref mirrors micState — safe to read inside async event handlers
  const micStateRef = useRef<MicState>("idle");
  // Atomic message ID counter — avoids duplicate keys when two messages are
  // created within the same millisecond
  const msgIdRef = useRef(0);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const updateMicState = (s: MicState) => {
    micStateRef.current = s;
    setMicState(s);
  };

  // ── Text-to-Speech ──
  const stopAllSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    if ((window as any).__edubotCancelTTS) {
      (window as any).__edubotCancelTTS();
      (window as any).__edubotCancelTTS = null;
    }
    setSpeakingMsgId(null);
  }, []);

  const speakText = useCallback((text: string, msgId: string) => {
    // If already speaking this message, stop it
    if (speakingMsgId === msgId) {
      stopAllSpeech();
      return;
    }

    // Stop any ongoing speech
    stopAllSpeech();

    // Strip markdown formatting for cleaner speech
    const cleanText = text
      .replace(/#{1,6}\s?/g, "")                    // headers
      .replace(/\*\*(.+?)\*\*/g, "$1")              // bold
      .replace(/\*(.+?)\*/g, "$1")                  // italic
      .replace(/`(.+?)`/g, "$1")                    // inline code
      .replace(/^\|.*\|$/gm, (row) =>               // table rows → readable
        row.replace(/\|/g, " ").replace(/-{2,}/g, "").trim()
      )
      .replace(/\|/g, " ")                          // leftover pipes
      .replace(/-{3,}/g, "")                         // horizontal rules
      .replace(/[📊✅❌📅🤔📋🎓📝😊🔔📌]/g, "")   // emojis
      .replace(/\n{2,}/g, ". ")                      // multiple newlines
      .replace(/\n/g, ". ")                          // single newlines
      .replace(/\s{2,}/g, " ")                       // extra spaces
      .trim();

    // Detect Malayalam content
    const hasMalayalam = /[\u0D00-\u0D7F]/.test(cleanText);

    if (hasMalayalam) {
      // Use Google Translate TTS for reliable Malayalam audio
      // Split into chunks of ~200 chars (Google TTS limit)
      const chunks: string[] = [];
      let remaining = cleanText;
      while (remaining.length > 0) {
        if (remaining.length <= 200) {
          chunks.push(remaining);
          break;
        }
        // Find a natural break point (sentence end or comma)
        let breakIdx = remaining.lastIndexOf(".", 200);
        if (breakIdx < 50) breakIdx = remaining.lastIndexOf(",", 200);
        if (breakIdx < 50) breakIdx = remaining.lastIndexOf(" ", 200);
        if (breakIdx < 50) breakIdx = 200;
        chunks.push(remaining.slice(0, breakIdx + 1));
        remaining = remaining.slice(breakIdx + 1).trim();
      }

      setSpeakingMsgId(msgId);
      let cancelled = false;

      const playChunks = async () => {
        for (const chunk of chunks) {
          if (cancelled) break;
          const encoded = encodeURIComponent(chunk.trim());
          if (!encoded) continue;
          const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=ml&client=tw-ob`;
          try {
            await new Promise<void>((resolve, reject) => {
              const audio = new Audio(url);
              audio.playbackRate = 0.9;
              audio.onended = () => resolve();
              audio.onerror = () => reject(new Error("TTS audio failed"));
              audio.play().catch(reject);
              // Store reference so we can cancel
              const checkCancel = setInterval(() => {
                if (cancelled) {
                  audio.pause();
                  clearInterval(checkCancel);
                  resolve();
                }
              }, 100);
              audio.onended = () => {
                clearInterval(checkCancel);
                resolve();
              };
            });
          } catch {
            // If Google TTS fails, fall back to browser speech synthesis
            await new Promise<void>((resolve) => {
              const utter = new SpeechSynthesisUtterance(chunk);
              utter.lang = "ml-IN";
              const voices = window.speechSynthesis.getVoices();
              const mlVoice = voices.find((v) => v.lang === "ml-IN") ||
                voices.find((v) => v.lang.startsWith("ml"));
              if (mlVoice) utter.voice = mlVoice;
              utter.rate = 0.85;
              utter.onend = () => resolve();
              utter.onerror = () => resolve();
              window.speechSynthesis.speak(utter);
            });
          }
        }
        if (!cancelled) setSpeakingMsgId(null);
      };

      // Store cancel function so clicking stop works
      (window as any).__edubotCancelTTS = () => {
        cancelled = true;
        setSpeakingMsgId(null);
      };

      playChunks();
    } else {
      // English: use browser SpeechSynthesis
      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find((v) => v.lang === "en-IN") ||
        voices.find((v) => v.lang.startsWith("en"));

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "en-IN";
      if (enVoice) utterance.voice = enVoice;
      utterance.rate = 0.95;
      utterance.pitch = 1;

      utterance.onstart = () => setSpeakingMsgId(msgId);
      utterance.onend = () => setSpeakingMsgId(null);
      utterance.onerror = () => setSpeakingMsgId(null);

      window.speechSynthesis.speak(utterance);
    }
  }, [speakingMsgId, stopAllSpeech]);

  // Preload voices (Chrome loads them asynchronously)
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Stop speech when chat is closed
  useEffect(() => {
    if (!isOpen) stopAllSpeech();
  }, [isOpen, stopAllSpeech]);

  // ── Auth listener ─────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && !userResolutionDone.current) {
        userResolutionDone.current = true;

        const path =
          typeof window !== "undefined" ? window.location.pathname : "";
        const roleOverride = path.includes("/parent") ? "parent" : undefined;

        const resolved = await resolveUser(
          firebaseUser.uid,
          firebaseUser.email || "",
          firebaseUser.displayName,
          roleOverride,
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

  // ────────────────────────────────────────
  // Core message handler
  // ─────────────────────────────────────────
  const handleSendMessage = useCallback(
    async (messageText?: string) => {
      const text = (messageText || inputValue).trim();
      if (!text || !resolvedUser) return;

      // Add user message immediately
      const userMsg: Message = {
        id: String(++msgIdRef.current),
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
            id: String(++msgIdRef.current),
            text: content,
            sender: "bot",
            timestamp: new Date(),
          },
        ]);
        setIsTyping(false);
      };

      try {
        // ── Step 0a: Handle time/date locally ─────────
        const timeDateAnswer = isTimeDateQuery(text);
        if (timeDateAnswer) {
          addBotMessage(timeDateAnswer);
          return;
        }

        // ── Step 0b: Handle greetings locally ────────
        if (isGreeting(text)) {
          const roleLabel: Record<Role, string> = {
            admin: "Administrative Assistant",
            faculty: "Faculty Assistant",
            student: "Student Assistant",
            parent: "Parent Portal Assistant",
          };
          addBotMessage(
            `👋 Hey there, **${resolvedUser.name}!** I'm EduBot — your ${roleLabel[resolvedUser.role]}.\n\nI can help you with:\n${ROLE_ALLOWED_INTENTS[
              resolvedUser.role
            ]
              .map((i) => `• ${i.replace(/_/g, " ")}`)
              .join(
                "\n",
              )}\n\nJust tap a quick action above or ask me anything! 😊`,
          );
          return;
        }

        // ── Step 1: Classify intent (keyword match → NLP fallback) ──
        let intent = classifyIntent(text);

        // NLP fallback: if keyword matching fails, use Ollama to classify
        if (!intent) {
          try {
            const classifyRes = await fetch("/api/edubot/classify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: text }),
            });
            if (classifyRes.ok) {
              const { intent: nlpIntent } = await classifyRes.json();
              if (nlpIntent && nlpIntent !== "unknown") {
                intent = nlpIntent;
              }
            }
          } catch {
            // NLP classification failed, fall through to unknown intent message
          }
        }

        if (!intent) {
          // General question — send to Ollama without Firestore data
          try {
            const chatHistory = messages
              .filter((m) => m.id !== "welcome")
              .slice(-10)
              .map((m) => ({
                role: m.sender === "user" ? "user" : "assistant",
                content: m.text,
              }));

            const response = await fetch("/api/edubot", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                role: resolvedUser.role,
                userName: resolvedUser.name,
                intent: "general",
                userMessage: text,
                contextData: null,
                chatHistory,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              addBotMessage(data.response || "I wasn't able to process that right now. Could you try rephrasing your question? 😊");
            } else {
              addBotMessage(
                `😊 I'd love to help, but I'm not quite sure what you're looking for! Here are some things I can assist you with:\n${ROLE_ALLOWED_INTENTS[
                  resolvedUser.role
                ]
                  .map((i) => `• ${i.replace(/_/g, " ")}`)
                  .join("\n")}\n\nFeel free to ask about any of these, or try the quick actions above!`,
              );
            }
          } catch {
            addBotMessage(
              `😊 I'd love to help, but I'm not quite sure what you're looking for! Here are some things I can assist you with:\n${ROLE_ALLOWED_INTENTS[
                resolvedUser.role
              ]
                .map((i) => `• ${i.replace(/_/g, " ")}`)
                .join("\n")}\n\nFeel free to ask about any of these, or try the quick actions above!`,
            );
          }
          return;
        }

        // ── Step 2: Role gate (hard block) ──────────
        if (!isIntentAllowed(resolvedUser.role, intent)) {
          addBotMessage(
            `🔒 **Access Restricted**\n\nSorry, that information isn't available for your role. As a **${resolvedUser.role}**, here's what I can help you with:\n${ROLE_ALLOWED_INTENTS[
              resolvedUser.role
            ]
              .map((i) => `• ${i.replace(/_/g, " ")}`)
              .join("\n")}\n\nJust ask about any of these and I'll be happy to help! 😊`,
          );
          return;
        }

        // ── Step 3: Fetch data from Firestore ───────
        let contextData: any = null;
        try {
          contextData = await fetchForIntent(intent, resolvedUser, text);
        } catch (dbError) {
          console.error("DB fetch error:", dbError);
          addBotMessage(
            "😔 Oops! I'm having trouble reaching the server right now. Please try again in a moment — I'll be ready to help!",
          );
          return;
        }

        // Serialize history for the API (exclude current message which is sent separately as 'intent')
        // Optimisation: Only send the last 10 messages to keep context size manageable
        const chatHistory = messages
          .filter((m) => m.id !== "welcome")
          .slice(-10) // Sliding window: last 10 messages
          .map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          }));

        // ── Step 4: Call Gemini API (server-side) ───
        const response = await fetch("/api/edubot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: resolvedUser.role,
            userName: resolvedUser.name,
            intent,
            userMessage: text, // Pass the original user message for context
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
        addBotMessage("😔 Something unexpected happened on my end. Please try again — I'm sure we'll get it right this time!");
        setIsTyping(false);
      }
    },
    [inputValue, resolvedUser],
  );

  // ── Speech-to-text handler ────────────────
  const handleSpeech = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Try Chrome.");
      return;
    }

    // Use ref for synchronous current state
    if (micStateRef.current === "listening" && recognitionRef.current) {
      // User manually stopped — abort without sending
      recognitionRef.current.onend = null; // detach handler to prevent auto-send
      recognitionRef.current.stop();
      updateMicState("idle");
      setInputValue("");
      return;
    }

    if (micStateRef.current === "processing") return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    // Default to English; Malayalam is handled via NLP on the text input
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      updateMicState("listening");
      setInputValue("");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      setInputValue(final || interim);
    };

    recognition.onend = () => {
      // Only auto-send if we ended naturally (not manual stop)
      if (micStateRef.current !== "listening") return;
      // Read the latest input value from the DOM ref
      const transcript = inputRef.current?.value.trim() ?? "";
      if (transcript) {
        updateMicState("processing");
        setTimeout(() => {
          handleSendMessage(transcript);
          updateMicState("idle");
        }, 300);
      } else {
        updateMicState("idle");
      }
    };

    recognition.onerror = (e: any) => {
      console.warn("Speech error:", e.error);
      updateMicState("idle");
      setInputValue("");
    };

    recognition.start();
  }, [handleSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Don't render on home or login pages, or if not logged in
  const isAuthPage = pathname === "/" || pathname?.includes("-login");
  if (isLoadingUser || !resolvedUser || isAuthPage) return null;

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
          <FaRobot
            size={26}
            className="group-hover:rotate-12 transition-transform duration-300"
          />
          <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse shadow-md">
            AI
          </span>
        </button>
      )}

      {/* ── Chat Window ── */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[440px] h-[620px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100"
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
                  {resolvedUser.role.charAt(0).toUpperCase() +
                    resolvedUser.role.slice(1)}{" "}
                  Assistant
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
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-2">
              Quick Actions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickActions.map((action) => (
                <button
                  key={action.intent}
                  onClick={() =>
                    handleSendMessage(action.label.replace(/^[^\w]+ /, ""))
                  }
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
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.sender === "bot"
                      ? "bg-gradient-to-br from-blue-500 to-violet-600 text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {msg.sender === "bot" ? (
                    <FaRobot size={13} />
                  ) : (
                    <FaUser size={13} />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[78%] min-w-0 overflow-hidden break-words rounded-2xl px-3.5 py-2.5 ${
                    msg.sender === "user"
                      ? "bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-br-sm"
                      : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm"
                  }`}
                >
                  {msg.sender === "bot" ? (
                    <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed prose-headings:font-semibold prose-headings:text-gray-800 prose-h1:text-base prose-h2:text-sm prose-h3:text-sm prose-strong:font-semibold prose-strong:text-gray-900 prose-ul:my-1 prose-ul:pl-4 prose-li:my-0.5 prose-ol:my-1 prose-ol:pl-4 prose-code:text-[11px] prose-code:bg-gray-100 prose-code:text-violet-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-3 prose-pre:text-xs prose-pre:overflow-x-auto prose-pre:my-2 prose-a:text-blue-600 prose-a:underline prose-blockquote:border-l-2 prose-blockquote:border-blue-300 prose-blockquote:pl-2 prose-blockquote:italic prose-blockquote:text-gray-600">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          img: ({ src, alt }) => (
                            <img
                              src={src}
                              alt={alt || "image"}
                              className="rounded-xl max-w-full mt-2 mb-1 border border-gray-200 shadow-sm"
                              style={{
                                maxHeight: 220,
                                objectFit: "contain",
                                display: "block",
                              }}
                            />
                          ),
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-2 rounded-lg border border-gray-200">
                              <table className="w-full text-xs border-collapse">
                                {children}
                              </table>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <thead className="bg-gradient-to-r from-blue-50 to-violet-50">
                              {children}
                            </thead>
                          ),
                          th: ({ children }) => (
                            <th className="px-2.5 py-1.5 text-left font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                              {children}
                            </th>
                          ),
                          tbody: ({ children }) => <tbody>{children}</tbody>,
                          tr: ({ children }) => (
                            <tr className="even:bg-gray-50 hover:bg-blue-50/40 transition-colors">
                              {children}
                            </tr>
                          ),
                          td: ({ children }) => (
                            <td className="px-2.5 py-1.5 text-gray-700 border-b border-gray-100">
                              {children}
                            </td>
                          ),
                        }}
                      >
                        {preprocessMessage(msg.text)}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  )}
                  <div
                    className={`flex items-center gap-1.5 mt-1 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <span
                      className={`text-[10px] ${msg.sender === "user" ? "text-white/60" : "text-gray-400"}`}
                    >
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {msg.sender === "bot" && msg.id !== "welcome" && (
                      <button
                        onClick={() => speakText(msg.text, msg.id)}
                        className={`p-0.5 rounded-full transition-colors ${
                          speakingMsgId === msg.id
                            ? "text-violet-600 hover:text-violet-700"
                            : "text-gray-400 hover:text-gray-600"
                        }`}
                        title={speakingMsgId === msg.id ? "Stop speaking" : "Read aloud"}
                      >
                        {speakingMsgId === msg.id ? (
                          <FaVolumeMute size={11} />
                        ) : (
                          <FaVolumeUp size={11} />
                        )}
                      </button>
                    )}
                  </div>
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
              {/* Mic button */}
              <button
                onClick={handleSpeech}
                disabled={isTyping}
                title={
                  micState === "listening"
                    ? "Tap to stop"
                    : micState === "processing"
                      ? "Processing..."
                      : "Speak your question"
                }
                className={`p-2.5 rounded-full flex-shrink-0 transition-all duration-200 ${
                  micState === "listening"
                    ? "bg-red-500 text-white shadow-lg shadow-red-300 animate-pulse scale-110"
                    : micState === "processing"
                      ? "bg-orange-400 text-white shadow-md cursor-wait"
                      : "bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                aria-label="Speech to text"
              >
                <FaMicrophone size={15} />
              </button>

              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  micState === "listening"
                    ? "🎙️ Listening..."
                    : micState === "processing"
                      ? "⏳ Processing speech..."
                      : "Ask about your data..."
                }
                className={`flex-1 px-4 py-2.5 border rounded-full focus:outline-none text-sm transition-all ${
                  micState === "listening"
                    ? "border-red-300 bg-red-50 focus:ring-2 focus:ring-red-300 focus:border-transparent"
                    : micState === "processing"
                      ? "border-orange-300 bg-orange-50 focus:ring-2 focus:ring-orange-300 focus:border-transparent"
                      : "border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                }`}
                disabled={isTyping || micState === "processing"}
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
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}
