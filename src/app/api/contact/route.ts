import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"EduMate Support" <${process.env.SMTP_EMAIL}>`,
      to: process.env.SMTP_EMAIL,
      replyTo: email,
      subject: `[Support] ${subject}`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
          <div style="background: linear-gradient(135deg, #1f75fe, #0050d0); padding: 32px 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">New Support Request</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">EduMate Contact Form</p>
          </div>
          <div style="padding: 32px 24px;">
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 30%;">Name</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Subject</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${subject}</td>
                </tr>
              </table>
            </div>
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 20px;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.05em;">Message</p>
              <p style="margin: 0; font-size: 14px; color: #374151; white-space: pre-line;">${message}</p>
            </div>
          </div>
          <div style="padding: 16px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">EduMate Portal - Support Request</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Contact form error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
