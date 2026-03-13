import * as admin from "firebase-admin";

/**
 * Initialises Firebase Admin SDK (singleton).
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY env var containing the service-account
 * JSON as a base64-encoded string, or a raw JSON string.
 *
 * How to get your service account key:
 *  Firebase Console → Project Settings → Service Accounts
 *  → "Generate new private key" → download the JSON file
 *  → base64-encode it:  `base64 -i serviceAccount.json`  (Linux/Mac)
 *  →  or in PowerShell:  [Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccount.json"))
 *  → paste the result as  FIREBASE_SERVICE_ACCOUNT_KEY=<base64string>  in .env.local
 */

function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) return admin.apps[0]!;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY env var is not set. " +
        "Add your service-account JSON (base64-encoded) to .env.local."
    );
  }

  let serviceAccount: admin.ServiceAccount;
  try {
    // Accept both plain JSON and base64-encoded JSON
    const decoded = Buffer.from(raw, "base64").toString("utf-8");
    serviceAccount = JSON.parse(decoded);
  } catch {
    try {
      serviceAccount = JSON.parse(raw);
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON or base64-encoded JSON.");
    }
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export function getAdminAuth(): admin.auth.Auth {
  return getAdminApp().auth();
}
