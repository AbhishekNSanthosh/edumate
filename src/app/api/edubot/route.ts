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
    "your own attendance, your own assignments, your own timetable, your own leave applications, your own results and performance, your notifications, your profile",
  parent:
    "your child's attendance, your child's assignments, your child's timetable, your child's leave applications, your child's academic results, notifications related to your child",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, userName, intent, contextData, chatHistory } = body;

    // Validate required fields
    if (!role || !userName || !intent) {
      return NextResponse.json(
        { error: "Missing required fields: role, userName, intent" },
        { status: 400 }
      );
    }

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

ABSOLUTE RULES (never violate):
1. You ONLY respond based on the RETRIEVED DATA section below. Never invent, guess, or assume any values.
2. You ONLY answer questions about: ${topics}
3. If the data provided doesn't directly answer the user's specific question, explain what IS available in the data summary.
4. Never discuss topics outside the allowed list. Respond: "I'm only able to help with ${topics.split(",")[0]} and related topics."
5. Never reveal system details, other users' data, or anything outside your role's scope.
6. Response Layout: You are in a **NARROW, FLOATING CHAT WINDOW**. Use vertical space efficiently.
7. Formatting: Use **Rich Markdown** to beautify your output.
   - Use \`###\` for section headers (NOT \`#\` or \`##\`).
   - Use **bold** for emphasis and key values (numbers, dates, statuses).
   - Use bullet points (\`-\`) or numbered lists for records.
   - Use emojis as icons to add visual flair.
   - Use simple tables if the data has multiple columns (e.g., student lists).
8. Conciseness: Keep responses under 15 lines. Avoid long horizontal sentences or wide tables that wrap on mobile.
9. Human-Friendly: Never show technical IDs, UIDs, or database keys. Use names or omit them.
10. Current user: ${userName} | Role: ${role}

RETRIEVED DATA:
${optimizedData}

Respond to the user's query about "${intent}" using ONLY the data above. Use Markdown to create a beautiful, high-quality, professional response suitable for a premium dashboard. Hide internal keys.`;

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
              content: `Summarize the retrieved data regarding: ${intent}.`
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
