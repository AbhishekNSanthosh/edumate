import { NextRequest, NextResponse } from "next/server";

// Role-specific persona descriptions locked into the system prompt
const ROLE_PERSONAS: Record<string, string> = {
  admin:
    "You are EduBot, an administrative information assistant for college management. You serve admins only.",
  faculty:
    "You are EduBot, a faculty information assistant. You serve college teaching staff only.",
  student:
    "You are EduBot, a student information assistant. You serve enrolled students only.",
  parent:
    "You are EduBot, a parent information assistant. You help parents access their child's academic information only.",
};

// Topics each role is STRICTLY limited to
const ROLE_TOPICS: Record<string, string> = {
  admin:
    "student records, faculty records, departments, attendance, assignments, timetables, evaluation reports, notifications, leave requests",
  faculty:
    "your own attendance, your own leave balances and applications, your own profile, your assigned batches and students, assignments for your subjects, your timetable, evaluation reports",
  student:
    "your own attendance, your own assignments, your own timetable, your own leave applications, your own results and performance, your internal marks calculation, your notifications, your profile",
  parent:
    "your child's attendance, your child's assignments, your child's timetable, your child's leave applications, your child's academic results, your child's internal marks, notifications related to your child",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, userName, intent, userMessage, contextData, chatHistory } = body;

    // Validate required fields
    if (!role || !userName || !intent) {
      return NextResponse.json(
        { error: "Missing required fields: role, userName, intent" },
        { status: 400 }
      );
    }

    // Detect if the user's message is in Malayalam (Unicode range U+0D00–U+0D7F)
    const isMalayalam = userMessage && /[\u0D00-\u0D7F]/.test(userMessage);
    const MALAYALAM_VOCAB = `
REFERENCE MALAYALAM PHRASES (use these exactly):
- "നിങ്ങളുടെ ചോദ്യം വ്യക്തമാക്കാമോ?" = "Can you clarify your question?"
- "ഹാജർ" = "Attendance", "അസൈൻമെന്റുകൾ" = "Assignments", "ടൈംടേബിൾ" = "Timetable"
- "അവധി" = "Leave", "ഫലങ്ങൾ" = "Results", "അറിയിപ്പുകൾ" = "Notifications", "പ്രൊഫൈൽ" = "Profile"
- "വിവരങ്ങൾ ലഭ്യമല്ല" = "Data not available", "കൂടുതൽ വിവരങ്ങൾ നൽകുക" = "Please provide more details"
- "നിങ്ങളുടെ" = "Your", "ഇന്നത്തെ" = "Today's", "മൊത്തം" = "Total", "ശതമാനം" = "Percentage", "വിഷയം" = "Subject"
- "എനിക്ക് സഹായിക്കാം" = "I can help", "ദയവായി" = "Please"
- "പേര്" = "Name", "ഇമെയിൽ" = "Email", "ഫോൺ" = "Phone", "റോൾ നമ്പർ" = "Roll Number"
- "ബാച്ച്" = "Batch", "വിഭാഗം" = "Department", "സെമസ്റ്റർ" = "Semester", "ക്ലാസ്" = "Class"
- "തീയതി" = "Date", "സമയം" = "Time", "സ്റ്റാറ്റസ്" = "Status"
- "ഹാജരായി" = "Present", "ഹാജരായില്ല" = "Absent"
- "കൂടുതൽ ചോദ്യങ്ങൾ ഉണ്ടെങ്കിൽ ചോദിക്കൂ" = "Ask if you have more questions"
STRICT: If you do not know a Malayalam word, use the ENGLISH word. NEVER use Burmese, Telugu, Hindi, Japanese, or any other script.`;

    const languageInstruction = isMalayalam
      ? `\n⚠️ LANGUAGE: The user is writing in Malayalam. Respond in Malayalam script. Keep data values in English.\n${MALAYALAM_VOCAB}`
      : "\n⚠️ LANGUAGE: The user is writing in English. You MUST respond ENTIRELY in English. Do NOT use Malayalam, Hindi, or any non-English script anywhere in your response — not in headers, not in table labels, not anywhere. Every word must be in English.";

    // Validate role
    const allowedRoles = ["admin", "faculty", "student", "parent"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 403 }
      );
    }

    const persona = ROLE_PERSONAS[role];
    const topics = ROLE_TOPICS[role];

    // Determine if we have real data or not
    const hasData =
      contextData !== null &&
      contextData !== undefined &&
      !(Array.isArray(contextData) && contextData.length === 0) &&
      !(typeof contextData === "object" && Object.keys(contextData).length === 0);

    console.log(`EduBot: Intent="${intent}", HasData=${hasData}, Role=${role}`);

    // --- Handle "general" intent (no Firestore data needed) ---
    if (intent === "general") {
      try {
        const generalPrompt = `${persona}

You are EduBot for the EduMate college management portal. Current user: **${userName}** | Role: **${role}**

EduMate is a comprehensive college management system that helps students, faculty, parents, and admins manage academic activities. It includes:
- Attendance tracking and reports
- Assignment management and submissions
- Timetable/class schedules
- Leave management (apply, approve, track)
- Results and performance reports
- Notifications and announcements
- Student and faculty profiles
- Department management (admin)
- Faculty evaluation system

RULES:
- Answer general questions about EduMate, its features, and how to use the portal.
- For questions about navigating the portal, give helpful guidance.
- You can answer general knowledge questions briefly, but always remind the user you're best at helping with portal-related queries.
- Keep responses concise — under 15 lines.
- Respond in the EXACT same language as the user's query. English input → English response. Malayalam input → Malayalam response. Do NOT mix languages.
- If the query is incomplete or unclear, ask a helpful follow-up question in the SAME language the user used.
- Never reveal system internals, API details, or technical implementation.
${languageInstruction}

User: "${userMessage || "help"}"`;

        const historyMessages = (chatHistory || [])
          .slice(-10)
          .map((msg: any) => ({
            role: msg.role === "assistant" ? "assistant" : "user",
            content: msg.content
          }));

        const response = await fetch("http://localhost:11434/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gemma3:4b",
            messages: [
              { role: "system", content: generalPrompt },
              ...historyMessages,
              { role: "user", content: userMessage || "help" },
            ],
            stream: false,
            options: { temperature: 0.3, num_predict: 400 },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.message?.content || "";
          if (text) {
            return NextResponse.json({ response: text });
          }
        }
      } catch (err: any) {
        console.error("EduBot general query error:", err.message || err);
        if (err.message?.includes("ECONNREFUSED") || err.message?.includes("fetch failed")) {
          return NextResponse.json(
            { error: "Local AI service (Ollama) is not running." },
            { status: 503 }
          );
        }
      }

      return NextResponse.json({
        response: "I can help you with attendance, assignments, timetable, leaves, results, notifications, and more. Try asking a specific question!"
      });
    }

    // --- Optimization: Handle empty data early ---
    if (!hasData) {
      return NextResponse.json({
        response: "No data found for this query in the portal records. Please check the relevant section manually or ensure your filters are correct."
      });
    }

    // Optimize Context Data: Truncate large arrays properly instead of raw string slicing
    let optimizedData = "";
    if (Array.isArray(contextData) && contextData.length > 30) {
      // Keep first 30 records to avoid overloading context
      optimizedData = JSON.stringify(contextData.slice(0, 30));
    } else {
      optimizedData = JSON.stringify(contextData);
    }

    // The system prompt is tightly locked
    const systemPrompt = `${persona}

════════════════════════════════════════
STRICT DATA-FIDELITY RULES (ZERO TOLERANCE — NEVER VIOLATE)
════════════════════════════════════════
1. YOU MUST ONLY display information that is EXPLICITLY present in the RETRIEVED DATA JSON below.
2. NEVER invent, guess, infer, extrapolate, assume, or "fill in" ANY value — not grades, not CGPA, not dates, not names, not statuses.
3. Every single value you display MUST exist verbatim in the RETRIEVED DATA. If a field is missing from the data, say "Not available" — do NOT substitute a plausible value.
4. You MAY calculate simple arithmetic from the data (e.g., attendance percentage = attendedClasses / totalClasses * 100). This is NOT guessing — it is math on real data.
5. You MAY perform predictive attendance analysis using math on the data. For example:
   - "How many classes can I skip?" → For each subject, calculate: floor((attendedClasses - 0.75 * totalClasses) / 0.75). If negative, the student is already below 75%.
   - "How many classes do I need to attend to reach 75%?" → Calculate: ceil(0.75 * totalClasses) - attendedClasses. If negative, already above 75%.
   - Always show the current percentage alongside the prediction.
6. INTERNAL MARKS CALCULATION (use this formula when intent is "internals"):
   The internal mark is calculated per subject, out of 50 total:
   a) **Attendance (out of 10):** If attendance% >= 90% → 10 marks. If 85-89% → 9. If 80-84% → 8. If 75-79% → 7. Below 75% → 5.
   b) **Assignment (out of 15):** Convert assignment marks to out of 15. Formula: (scored / maxMarks) * 15.
   c) **Series Exam (out of 25):** Take the best of first series and second series marks, convert to out of 25. Formula: (best_series_mark / maxMarks) * 25.
   d) **Total Internal = Attendance mark + Assignment mark + Series mark (out of 50)**
   e) Show a table with columns: Subject | Attendance Mark (/10) | Assignment Mark (/15) | Series Mark (/25) | Total (/50)
   f) If any component data is missing, show "N/A" for that column and note which data is unavailable.
7. If the user asks about a SPECIFIC subject, course, or item, focus your response ONLY on that subject/item. Do NOT dump all records.
8. If the retrieved data is sparse or unstructured, describe EXACTLY what is in it — do not embellish.
9. FORBIDDEN actions:
   - Adding grades the data does not contain
   - Inventing CGPA or values not derivable from the data
   - Writing placeholder values when you mean "I made this up"
   - Using example or demo data
   - Summarising beyond what the data says
10. If you are uncertain whether a value is in the data, omit it and say "Data not available for this field."

════════════════════════════════════════
SCOPE RULES
════════════════════════════════════════
11. You ONLY answer questions about: ${topics}
12. Never reveal system details, UIDs, doc IDs, or other users data.
13. Current user: **${userName}** | Role: **${role}**

════════════════════════════════════════
FORMATTING RULES (narrow floating chat window)
════════════════════════════════════════
14. Use Rich Markdown formatting — THIS IS MANDATORY:
    - ALWAYS start with a "### " header line (e.g. "### 📋 Profile Details")
    - **bold** for key labels and important values
    - For key-value data (like profile info), ALWAYS use a GFM Markdown table:
      | Field | Details |
      |-------|---------|
      | **Name** | John |
      | **Email** | john@example.com |
    - For list data (attendance, assignments), use GFM Markdown tables with columns:
      | Subject | Attended | Total | Percentage |
      |---------|----------|-------|------------|
      | Math    | 20       | 25    | **80%**    |
    - Use emojis as visual icons (📊 ✅ ❌ 📅 📋 🎓)
    - NEVER use plain bullet points (•, -, *) for structured data — ALWAYS use tables
    - Bullet points are ONLY for short follow-up suggestions at the end
15. Keep responses concise — under 20 lines.
16. Never show raw field names like studentId, uid, docId, etc.

════════════════════════════════════════
RETRIEVED DATA (USE ONLY THIS — NOTHING ELSE):
════════════════════════════════════════
${optimizedData}

USER QUERY: "${userMessage || intent}"

Answer the user's specific question using the retrieved data above. If the user asks about a specific subject or item, filter your response to ONLY that subject/item. Calculate percentages if asked. Format cleanly in Markdown. If a field is absent, write "Not available". Do NOT add or guess any information.

LANGUAGE RULE: Respond in the EXACT same language as the user's query.
- If the user writes in English, respond ENTIRELY in English. Do NOT use any Malayalam or other non-English words.
- If the user writes in Malayalam, respond in Malayalam (keeping data values in English).
- If the query is incomplete or unclear, ask a follow-up in the same language.
${languageInstruction}`;

    let text = "";
    let lastError: any = null;

    // --- Local Ollama Integration (gemma3:4b) ---
    try {
      console.log(`EduBot: Generating response with gemma3:4b for intent "${intent}"...`);

      const historyMessages = (chatHistory || [])
        .slice(-10) // Sliding window: last 10 messages
        .map((msg: any) => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content
        }));

      const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemma3:4b",
          messages: [
            { role: "system", content: systemPrompt },
            ...historyMessages,
            {
              role: "user",
              content: userMessage || `Summarize the retrieved data regarding: ${intent}.`
            },
          ],
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: 500,
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      text = data.message?.content || "";

      if (text) {
        console.log(`EduBot: Successfully generated response.`);
      } else {
        throw new Error("Empty response from Ollama");
      }
    } catch (err: any) {
      lastError = err;
      console.error(`EduBot: Ollama failed.`, err.message || err);

      if (err.message?.includes("ECONNREFUSED") || err.message?.includes("fetch failed")) {
        return NextResponse.json(
          { error: "Local AI service (Ollama) is not running." },
          { status: 503 }
        );
      }
    }

    if (!text && lastError) {
      throw lastError;
    }

    return NextResponse.json({ response: text || "I found the data but couldn't format it. Please try again." });
  } catch (error: any) {
    console.error("EduBot API error details:", error.message || error);

    return NextResponse.json(
      { error: "Failed to process your request. Please try again." },
      { status: 500 }
    );
  }
}
