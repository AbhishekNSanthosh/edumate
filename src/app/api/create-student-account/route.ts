import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/create-student-account
 *
 * Creates a Firebase Auth account for a student using the Firebase REST API.
 * This runs server-side so it doesn't affect the admin's signed-in session.
 *
 * Body: { email: string, password: string }
 * Returns: { uid: string } on success
 */
export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: "email and password are required" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "Firebase API key not configured" },
                { status: 500 }
            );
        }

        // Firebase Auth REST API — signUp endpoint
        const response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    password,
                    returnSecureToken: false,
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            const errorCode = data?.error?.message || "UNKNOWN_ERROR";

            let friendlyMessage = "Failed to create account";
            if (errorCode === "EMAIL_EXISTS")
                friendlyMessage = `Email ${email} is already registered`;
            else if (errorCode === "WEAK_PASSWORD : Password should be at least 6 characters")
                friendlyMessage = "Password is too weak (min 6 characters)";
            else if (errorCode.includes("INVALID_EMAIL"))
                friendlyMessage = `Invalid email format: ${email}`;

            return NextResponse.json(
                { error: friendlyMessage, code: errorCode },
                { status: 400 }
            );
        }

        return NextResponse.json({ uid: data.localId });
    } catch (err: any) {
        console.error("create-student-account error:", err);
        return NextResponse.json(
            { error: "Internal server error", details: err.message },
            { status: 500 }
        );
    }
}
