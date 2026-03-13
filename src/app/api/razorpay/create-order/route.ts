import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, feeId, studentId } = body;

    // Validate env
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("Razorpay keys not configured");
      return NextResponse.json(
        { error: "Payment gateway not configured. Contact admin." },
        { status: 500 }
      );
    }

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (!feeId || !studentId) {
      return NextResponse.json(
        { error: "Missing required fields: feeId, studentId" },
        { status: 400 }
      );
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Razorpay receipt must be ≤40 chars
    const receipt = `fee_${String(feeId).slice(-28)}_${Date.now().toString(36)}`.slice(0, 40);

    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100), // paise
      currency: "INR",
      receipt,
      notes: {
        feeId: String(feeId).slice(0, 50),
        studentId: String(studentId).slice(0, 50),
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error: any) {
    console.error("Razorpay order creation failed:", error);
    // Surface the actual Razorpay error message if available
    const msg =
      error?.error?.description ||
      error?.message ||
      "Failed to create order";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
