const nodemailer = require('nodemailer');

/**
 * Email notification service using Gmail SMTP.
 * Set EMAIL_USER and EMAIL_PASS in .env to enable.
 * If not set, emails are silently skipped (no crash).
 */

// Create a reusable transporter (lazy-init)
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  
  if (!user || !pass) {
    console.log('📧 Email notifications disabled (EMAIL_USER/EMAIL_PASS not set)');
    return null;
  }
  
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
  
  console.log('📧 Email notifications enabled via', user);
  return transporter;
}

/**
 * Send a stage change notification email to the candidate.
 */
async function sendStageChangeEmail({ candidateEmail, candidateName, jobTitle, newStage, companyName = 'HireFlow' }) {
  const transport = getTransporter();
  if (!transport) return; // silently skip if not configured
  
  const stageMessages = {
    'Applied': {
      subject: `Application Received — ${jobTitle}`,
      body: `We have received your application for the <b>${jobTitle}</b> position. Our team will review it shortly.`,
      emoji: '📋'
    },
    'Screening': {
      subject: `Application Under Review — ${jobTitle}`,
      body: `Your application for <b>${jobTitle}</b> is currently being reviewed by our HR team.`,
      emoji: '🔍'
    },
    'Technical Round 1': {
      subject: `Technical Interview Scheduled — ${jobTitle}`,
      body: `Congratulations! You've been shortlisted for <b>Technical Round 1</b> for the <b>${jobTitle}</b> position. Our team will reach out with scheduling details.`,
      emoji: '💻'
    },
    'Technical Round 2': {
      subject: `Technical Round 2 — ${jobTitle}`,
      body: `Great news! You've advanced to <b>Technical Round 2</b> for the <b>${jobTitle}</b> position.`,
      emoji: '🚀'
    },
    'HR Round': {
      subject: `HR Interview — ${jobTitle}`,
      body: `You've made it to the <b>HR Interview</b> stage for <b>${jobTitle}</b>. We'll be in touch with the details soon.`,
      emoji: '🤝'
    },
    'Selected': {
      subject: `🎉 Congratulations! You've been Selected — ${jobTitle}`,
      body: `We're thrilled to inform you that you've been <b>selected</b> for the <b>${jobTitle}</b> position! Our HR team will contact you with the offer details.`,
      emoji: '🎉'
    },
    'Rejected': {
      subject: `Application Update — ${jobTitle}`,
      body: `Thank you for your interest in the <b>${jobTitle}</b> position. After careful consideration, we've decided to move forward with other candidates. We encourage you to apply for future openings.`,
      emoji: '📝'
    }
  };
  
  const msg = stageMessages[newStage] || {
    subject: `Application Update — ${jobTitle}`,
    body: `Your application status for <b>${jobTitle}</b> has been updated to <b>${newStage}</b>.`,
    emoji: '📌'
  };
  
  const html = `
  <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
    <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 32px; border-radius: 16px 16px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">HireFlow ATS</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 14px;">Recruitment Update</p>
    </div>
    <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
      <p style="font-size: 16px; color: #334155; margin: 0 0 8px;">Hi <b>${candidateName}</b>,</p>
      <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 16px 0; border: 1px solid #e2e8f0;">
        <p style="font-size: 28px; margin: 0 0 8px;">${msg.emoji}</p>
        <p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.6;">${msg.body}</p>
      </div>
      <div style="background: #eef2ff; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
        <p style="font-size: 12px; color: #6366f1; margin: 0; font-weight: 600;">Current Status: ${newStage}</p>
      </div>
      <p style="font-size: 13px; color: #94a3b8; margin: 24px 0 0;">Best regards,<br><b>${companyName} Hiring Team</b></p>
    </div>
    <div style="background: #f1f5f9; padding: 16px; border-radius: 0 0 16px 16px; text-align: center; border: 1px solid #e2e8f0; border-top: none;">
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">This is an automated notification from HireFlow ATS</p>
    </div>
  </div>`;
  
  try {
    await transport.sendMail({
      from: `"${companyName} Hiring" <${process.env.EMAIL_USER}>`,
      to: candidateEmail,
      subject: msg.subject,
      html
    });
    console.log(`📧 Email sent to ${candidateEmail}: ${msg.subject}`);
  } catch (err) {
    console.error(`⚠️ Email failed to ${candidateEmail}:`, err.message);
    // Don't throw — email failure shouldn't break the app
  }
}

/**
 * Notify the assigned HR when a new candidate is added to their queue.
 */
async function sendNewCandidateEmail({ hrEmail, hrName, candidateName, candidateEmail, jobTitle, addedByName, companyName = 'HireFlow' }) {
  const transport = getTransporter();
  if (!transport) return;

  const html = `
  <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
    <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 32px; border-radius: 16px 16px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">HireFlow ATS</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 14px;">New Candidate Assigned</p>
    </div>
    <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
      <p style="font-size: 16px; color: #334155; margin: 0 0 8px;">Hi <b>${hrName}</b>,</p>
      <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 16px 0; border: 1px solid #e2e8f0;">
        <p style="font-size: 28px; margin: 0 0 8px;">👤</p>
        <p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.6;">
          A new candidate has been assigned to you for review.
        </p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Candidate</td>
          <td style="padding: 8px 12px; font-size: 13px; color: #334155; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${candidateName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Email</td>
          <td style="padding: 8px 12px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9;">${candidateEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Position</td>
          <td style="padding: 8px 12px; font-size: 13px; color: #6366f1; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${jobTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-size: 13px; color: #94a3b8;">Added by</td>
          <td style="padding: 8px 12px; font-size: 13px; color: #334155;">${addedByName}</td>
        </tr>
      </table>
      <p style="font-size: 13px; color: #94a3b8; margin: 24px 0 0;">Best regards,<br><b>${companyName} System</b></p>
    </div>
    <div style="background: #f1f5f9; padding: 16px; border-radius: 0 0 16px 16px; text-align: center; border: 1px solid #e2e8f0; border-top: none;">
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">This is an automated notification from HireFlow ATS</p>
    </div>
  </div>`;

  try {
    await transport.sendMail({
      from: `"${companyName}" <${process.env.EMAIL_USER}>`,
      to: hrEmail,
      subject: `New Candidate Assigned — ${candidateName} for ${jobTitle}`,
      html
    });
    console.log(`📧 HR notification sent to ${hrEmail}: New candidate ${candidateName}`);
  } catch (err) {
    console.error(`⚠️ HR email failed to ${hrEmail}:`, err.message);
  }
}

module.exports = { sendStageChangeEmail, sendNewCandidateEmail };
