import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../config/firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";

/**
 * POST /api/create-office-account
 *
 * Creates a Firebase Auth account for the office user using the Firebase REST API,
 * then writes the office_staff document so the login flow can verify membership.
 *
 * Body: { email: string, password: string, name?: string }
 * Returns: { uid: string } on success
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password, name = "Office Staff" } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
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

    // Step 1: Create Firebase Auth account
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: false }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorCode = data?.error?.message || "UNKNOWN_ERROR";
      let friendlyMessage = "Failed to create account";
      if (errorCode === "EMAIL_EXISTS")
        friendlyMessage = `Email ${email} is already registered — account may already exist`;
      else if (errorCode.includes("INVALID_EMAIL"))
        friendlyMessage = `Invalid email format: ${email}`;
      else if (errorCode.includes("WEAK_PASSWORD"))
        friendlyMessage = "Password is too weak (min 6 characters)";

      // If email already exists, try to look up the UID via sign-in (read-only verify)
      return NextResponse.json(
        { error: friendlyMessage, code: errorCode },
        { status: 400 }
      );
    }

    const uid: string = data.localId;

    // Step 2: Write office_staff document so the login verification passes
    await setDoc(doc(db, "office_staff", uid), {
      uid,
      email,
      name,
      role: "office",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ uid, message: "Office account created successfully" });
  } catch (err: any) {
    console.error("create-office-account error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}
