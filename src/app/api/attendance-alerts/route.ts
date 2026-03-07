import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

interface AlertRequest {
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  subjectName: string;
  percentage: number;
  threshold: number;
  canSkip: number;
  type: "warning" | "info";
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

function buildEmailHTML(alert: AlertRequest): string {
  const isWarning = alert.type === "warning";
  const gradientColors = isWarning
    ? "#f59e0b, #d97706"
    : "#3b82f6, #6366f1";
  const headerTitle = isWarning
    ? "Attendance Warning"
    : "Attendance Update";
  const iconEmoji = isWarning ? "&#9888;&#65039;" : "&#9989;";

  const bodyMessage = isWarning
    ? `Your attendance in <strong>${alert.subjectName}</strong> is now at <strong>${alert.percentage}%</strong>.
       You can only skip <strong>${alert.canSkip}</strong> more class${alert.canSkip !== 1 ? "es" : ""} before falling below 75%.`
    : `Great news! Your attendance in <strong>${alert.subjectName}</strong> has reached <strong>${alert.percentage}%</strong>. Keep up the good work!`;

  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, ${gradientColors}); padding: 32px 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">${iconEmoji} ${headerTitle}</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">EduMate Student Portal</p>
      </div>
      <div style="padding: 32px 24px;">
        <p style="font-size: 16px; color: #374151; margin: 0 0 16px;">
          Hello <strong>${alert.studentName}</strong>,
        </p>
        <p style="font-size: 15px; color: #374151; margin: 0 0 24px; line-height: 1.6;">
          ${bodyMessage}
        </p>
        <div style="background: ${isWarning ? "#fffbeb" : "#eff6ff"}; border-radius: 8px; padding: 16px; margin: 0 0 24px; border: 1px solid ${isWarning ? "#fde68a" : "#bfdbfe"};">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Subject</td>
              <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${alert.subjectName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Current Attendance</td>
              <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: ${isWarning ? "#d97706" : "#2563eb"}; text-align: right;">${alert.percentage}%</td>
            </tr>
            ${isWarning ? `<tr>
              <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Leaves Remaining (before 75%)</td>
              <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #dc2626; text-align: right;">${alert.canSkip}</td>
            </tr>` : ""}
          </table>
        </div>
        ${isWarning ? `<p style="font-size: 13px; color: #ef4444; margin: 0 0 16px; font-weight: 500;">
          Please ensure regular attendance to avoid falling below the minimum requirement.
        </p>` : ""}
        <p style="font-size: 13px; color: #9ca3af; margin: 24px 0 0; text-align: center;">
          This is an automated notification from EduMate.
        </p>
      </div>
    </div>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const alerts: AlertRequest[] = body.alerts;

    if (!alerts || !Array.isArray(alerts) || alerts.length === 0) {
      return NextResponse.json({ error: "No alerts provided" }, { status: 400 });
    }

    const results = await Promise.allSettled(
      alerts.map(async (alert) => {
        const tasks: Promise<any>[] = [];

        // 1. Send Email
        if (alert.studentEmail) {
          const emailSubject = alert.type === "warning"
            ? `Attendance Warning - ${alert.subjectName} (${alert.percentage}%)`
            : `Attendance Update - ${alert.subjectName} (${alert.percentage}%)`;

          tasks.push(
            transporter.sendMail({
              from: `"EduMate" <${process.env.SMTP_EMAIL}>`,
              to: alert.studentEmail,
              subject: emailSubject,
              html: buildEmailHTML(alert),
            })
          );
        }

        // 2. Send SMS via Fast2SMS (free Indian SMS API)
        if (alert.studentPhone && process.env.FAST2SMS_API_KEY) {
          const phone = alert.studentPhone.replace(/^\+91/, "").replace(/\D/g, "");
          if (phone.length === 10) {
            const smsMessage = alert.type === "warning"
              ? `EduMate Alert: ${alert.studentName}, your attendance in ${alert.subjectName} is ${alert.percentage}%. Only ${alert.canSkip} leave(s) left before 75%. Attend regularly!`
              : `EduMate: ${alert.studentName}, your attendance in ${alert.subjectName} reached ${alert.percentage}%. Keep it up!`;

            tasks.push(
              fetch("https://www.fast2sms.com/dev/bulkV2", {
                method: "POST",
                headers: {
                  "authorization": process.env.FAST2SMS_API_KEY,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  route: "q",
                  message: smsMessage,
                  language: "english",
                  numbers: phone,
                }),
              })
            );
          }
        }

        return Promise.allSettled(tasks);
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return NextResponse.json({ success: true, sent, total: alerts.length });
  } catch (error: any) {
    console.error("Attendance alert API error:", error.message || error);
    return NextResponse.json(
      { error: "Failed to send alerts" },
      { status: 500 }
    );
  }
}
