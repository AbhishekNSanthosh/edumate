import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            toEmail,
            toName,
            fromName,
            subject,
            date,
            day,
            time,
            subjectName,
            batch,
            room,
            reason,
            type, // "request" | "accepted" | "declined"
        } = body;

        if (!toEmail) {
            return NextResponse.json({ error: "No recipient email" }, { status: 400 });
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD,
            },
        });

        let emailSubject = "";
        let emailBody = "";

        if (type === "request") {
            emailSubject = `📋 Class Swap Request from ${fromName}`;
            emailBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
          <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 32px 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">Class Swap Request</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">EduMate Faculty Portal</p>
          </div>
          <div style="padding: 32px 24px;">
            <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">
              Hello <strong>${toName}</strong>,<br><br>
              <strong>${fromName}</strong> has sent you a class swap request. Please review the details below and respond at your earliest convenience.
            </p>
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
              <h3 style="font-size: 13px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px;">Class Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;">📚 Subject</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${subjectName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">📅 Date</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${day}, ${date}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">🕐 Time</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${time}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">👥 Batch</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${batch}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">🏫 Room</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${room}</td>
                </tr>
              </table>
            </div>
            <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 13px; font-weight: 700; color: #c2410c; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Reason for Swap</p>
              <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.6;">${reason}</p>
            </div>
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px;">
              <p style="margin: 0; font-size: 14px; color: #1d4ed8;">
                🔔 Please log in to <strong>EduMate Faculty Portal</strong> and go to <strong>Timetable → Swap Requests</strong> to accept or decline this request.
              </p>
            </div>
          </div>
          <div style="padding: 16px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">EduMate Faculty Portal · This is an automated notification</p>
          </div>
        </div>
      `;
        } else if (type === "accepted") {
            emailSubject = `✅ Swap Request Accepted by ${toName}`;
            emailBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
          <div style="background: linear-gradient(135deg, #16a34a, #15803d); padding: 32px 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">Swap Request Accepted ✅</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">EduMate Faculty Portal</p>
          </div>
          <div style="padding: 32px 24px;">
            <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">
              Great news! <strong>${toName}</strong> has <strong style="color: #16a34a;">accepted</strong> your swap request for <strong>${subjectName}</strong> on <strong>${day}, ${date}</strong> at <strong>${time}</strong>.
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px;">
              <p style="margin: 0; font-size: 14px; color: #15803d;">✅ The class swap is confirmed. Please coordinate with ${toName} about the arrangements.</p>
            </div>
          </div>
          <div style="padding: 16px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">EduMate Faculty Portal · This is an automated notification</p>
          </div>
        </div>
      `;
        } else if (type === "declined") {
            emailSubject = `❌ Swap Request Declined by ${toName}`;
            emailBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
          <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 32px 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">Swap Request Declined ❌</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">EduMate Faculty Portal</p>
          </div>
          <div style="padding: 32px 24px;">
            <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">
              Unfortunately, <strong>${toName}</strong> has <strong style="color: #dc2626;">declined</strong> your swap request for <strong>${subjectName}</strong> on <strong>${day}, ${date}</strong> at <strong>${time}</strong>.
            </p>
            <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 16px;">
              <p style="margin: 0; font-size: 14px; color: #be123c;">Please try requesting another faculty member or contact the administration for assistance.</p>
            </div>
          </div>
          <div style="padding: 16px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">EduMate Faculty Portal · This is an automated notification</p>
          </div>
        </div>
      `;
        }

        await transporter.sendMail({
            from: `"EduMate Portal" <${process.env.SMTP_EMAIL}>`,
            to: toEmail,
            subject: emailSubject,
            html: emailBody,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Email send error:", error);
        return NextResponse.json(
            { error: "Failed to send email", details: error.message },
            { status: 500 }
        );
    }
}
