import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      toEmail,
      toName,
      facultyName,
      department,
      leaveType,
      fromDate,
      toDate,
      days,
      reason,
      isLateSubmission,
      type, // "hod_recommendation" | "principal_approval" | "director_escalation" | "approved" | "rejected"
      actionBy,
      remarks,
    } = body;

    if (!toEmail) {
      return NextResponse.json(
        { error: "No recipient email" },
        { status: 400 },
      );
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

    const leaveDetailsTable = `
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
        <h3 style="font-size: 13px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px;">Leave Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;">Faculty</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${facultyName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Department</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${department}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Leave Type</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${leaveType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">From - To</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${fromDate} to ${toDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Days</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${days} day(s)</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Reason</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${reason}</td>
          </tr>
          ${isLateSubmission ? `<tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Submission</td>
            <td style="padding: 8px 0; color: #dc2626; font-size: 14px; font-weight: 600;">Late (after 8:30 AM)</td>
          </tr>` : ""}
        </table>
      </div>
    `;

    const footer = `
      <div style="padding: 16px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">EduMate Portal - Automated Leave Notification</p>
      </div>
    `;

    if (type === "hod_recommendation") {
      // Sent to Principal when HOD recommends
      emailSubject = `Leave Recommended by HOD - ${facultyName}`;
      emailBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
          <div style="background: linear-gradient(135deg, #4f46e5, #3730a3); padding: 32px 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">Leave Application - HOD Recommended</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Requires your approval</p>
          </div>
          <div style="padding: 32px 24px;">
            <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">
              Dear <strong>${toName}</strong>,<br><br>
              The HOD has <strong style="color: #16a34a;">recommended</strong> the following leave application. Please review and take action.
            </p>
            ${leaveDetailsTable}
            ${remarks ? `<div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #1d4ed8;">HOD Remarks</p>
              <p style="margin: 0; font-size: 14px; color: #374151;">${remarks}</p>
            </div>` : ""}
            <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 16px;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                Please log in to <strong>EduMate Portal</strong> and go to <strong>Leave Approvals</strong> to approve or reject this application.
              </p>
            </div>
          </div>
          ${footer}
        </div>
      `;
    } else if (type === "director_escalation") {
      // Sent to Director when late submission is escalated
      emailSubject = `[LATE] Leave Escalated to Director - ${facultyName}`;
      emailBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
          <div style="background: linear-gradient(135deg, #dc2626, #991b1b); padding: 32px 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">Late Leave Submission - Escalated</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Requires your approval (Principal permission disabled)</p>
          </div>
          <div style="padding: 32px 24px;">
            <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">
              Dear <strong>${toName}</strong>,<br><br>
              This leave application was submitted <strong style="color: #dc2626;">after 8:30 AM</strong> of the leave date. The HOD has recommended it, and it has been escalated directly to you as the Principal's approval is disabled for late submissions.
            </p>
            ${leaveDetailsTable}
            ${remarks ? `<div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #1d4ed8;">HOD Remarks</p>
              <p style="margin: 0; font-size: 14px; color: #374151;">${remarks}</p>
            </div>` : ""}
            <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 16px;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                Please log in to <strong>EduMate Portal</strong> and go to <strong>Leave Approvals</strong> to approve or reject this application.
              </p>
            </div>
          </div>
          ${footer}
        </div>
      `;
    } else if (type === "approved") {
      emailSubject = `Leave Approved - ${fromDate} to ${toDate}`;
      emailBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
          <div style="background: linear-gradient(135deg, #16a34a, #15803d); padding: 32px 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">Leave Approved</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Your leave has been approved</p>
          </div>
          <div style="padding: 32px 24px;">
            <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">
              Dear <strong>${toName}</strong>,<br><br>
              Your leave application has been <strong style="color: #16a34a;">approved</strong> by <strong>${actionBy}</strong>.
            </p>
            ${leaveDetailsTable}
            ${remarks ? `<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #15803d;">Remarks</p>
              <p style="margin: 0; font-size: 14px; color: #374151;">${remarks}</p>
            </div>` : ""}
          </div>
          ${footer}
        </div>
      `;
    } else if (type === "rejected") {
      emailSubject = `Leave Rejected - ${fromDate} to ${toDate}`;
      emailBody = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
          <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 32px 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">Leave Rejected</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Your leave has been rejected</p>
          </div>
          <div style="padding: 32px 24px;">
            <p style="font-size: 16px; color: #374151; margin: 0 0 24px;">
              Dear <strong>${toName}</strong>,<br><br>
              Your leave application has been <strong style="color: #dc2626;">rejected</strong> by <strong>${actionBy}</strong>.
            </p>
            ${leaveDetailsTable}
            ${remarks ? `<div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #be123c;">Reason for Rejection</p>
              <p style="margin: 0; font-size: 14px; color: #374151;">${remarks}</p>
            </div>` : ""}
          </div>
          ${footer}
        </div>
      `;
    }

    if (emailSubject && emailBody) {
      await transporter.sendMail({
        from: `"EduMate Portal" <${process.env.SMTP_EMAIL}>`,
        to: toEmail,
        subject: emailSubject,
        html: emailBody,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Leave notification email error:", error);
    return NextResponse.json(
      { error: "Failed to send email", details: error.message },
      { status: 500 },
    );
  }
}
