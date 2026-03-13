import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "../../../config/firebaseAdmin";

/**
 * POST /api/delete-student-account
 *
 * Deletes a Firebase Auth user by UID using the Admin SDK.
 * This runs server-side so the admin session is unaffected.
 *
 * Body: { uid: string }  — the Firebase Auth UID of the student to delete
 * Returns: { success: true } on success
 */
export async function POST(req: NextRequest) {
  try {
    const { uid } = await req.json();

    if (!uid || typeof uid !== "string") {
      return NextResponse.json(
        { error: "uid is required" },
        { status: 400 }
      );
    }

    const auth = getAdminAuth();
    await auth.deleteUser(uid);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("delete-student-account error:", err);

    // USER_NOT_FOUND is acceptable — auth was already removed
    if (err?.errorInfo?.code === "auth/user-not-found") {
      return NextResponse.json({ success: true, note: "user-not-found-in-auth" });
    }

    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
