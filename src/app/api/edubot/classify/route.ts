import { NextRequest, NextResponse } from "next/server";

const VALID_INTENTS = [
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
  "evaluation",
  "student_leaves",
] as const;

const CLASSIFICATION_PROMPT = `You are an intent classifier for a college portal chatbot. Classify the user's message into EXACTLY ONE of these intents:

- attendance: questions about attendance, being present/absent, skipping classes, bunking, attendance percentage, shortage
- assignments: questions about homework, assignments, submissions, deadlines, due dates
- timetable: questions about class schedule, periods, today's classes, when is next class, weekly schedule
- leaves: questions about leave applications, leave balance, applying for leave, leave history
- results: questions about marks, grades, CGPA, performance, scores, exam results, how am I doing academically
- notifications: questions about notices, announcements, alerts, updates
- profile: questions about personal info, name, email, roll number, identity details
- students: questions about student lists, batch students, student info (admin/faculty only)
- faculty: questions about teacher/faculty lists, staff info (admin only)
- departments: questions about departments (admin only)
- evaluation: questions about faculty evaluations, appraisals, ratings
- student_leaves: questions about student leave requests, pending leave approvals (admin/faculty only)

RULES:
- The message may be in English, Malayalam, or a mix of both (Manglish). Understand the meaning regardless of language.
- Reply with ONLY the intent name in English, nothing else.
- If the message does not match any intent, reply with "unknown".
- Do NOT explain your reasoning.

User message: `;

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ intent: "unknown" });
    }

    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma3:4b",
        messages: [
          {
            role: "user",
            content: CLASSIFICATION_PROMPT + `"${message}"`,
          },
        ],
        stream: false,
        options: {
          temperature: 0,
          num_predict: 20,
        },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ intent: "unknown" });
    }

    const data = await response.json();
    const raw = (data.message?.content || "").trim().toLowerCase().replace(/[^a-z_]/g, "");

    // Validate the response is a known intent
    if (VALID_INTENTS.includes(raw as any)) {
      return NextResponse.json({ intent: raw });
    }

    return NextResponse.json({ intent: "unknown" });
  } catch {
    return NextResponse.json({ intent: "unknown" });
  }
}
