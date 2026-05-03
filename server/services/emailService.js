const nodemailer = require('nodemailer');

/**
 * Email notification service using Gmail SMTP.
 * Set EMAIL_USER and EMAIL_PASS in .env to enable.
 * If not set, emails are silently skipped (no crash).
 */

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
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    tls: { rejectUnauthorized: false }
  });
  console.log('📧 Email notifications enabled via', user);
  return transporter;
}

// Pre-warm the SMTP connection so first email is fast
async function warmUp() {
  const t = getTransporter();
  if (!t) return;
  try {
    await t.verify();
    console.log('📧 SMTP connection verified and ready');
  } catch (e) {
    console.error('⚠️ SMTP warm-up failed:', e.message);
  }
}

function buildEmailWrapper(title, subtitle, bodyHtml) {
  return `
  <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 32px; border-radius: 16px 16px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">HireFlow ATS</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 14px;">${subtitle}</p>
    </div>
    <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
      ${bodyHtml}
    </div>
    <div style="background: #f1f5f9; padding: 16px; border-radius: 0 0 16px 16px; text-align: center; border: 1px solid #e2e8f0; border-top: none;">
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">Automated notification from HireFlow ATS</p>
    </div>
  </div>`;
}

async function sendMail(to, subject, html) {
  const transport = getTransporter();
  if (!transport) return;
  try {
    await transport.sendMail({
      from: `"HireFlow ATS" <${process.env.EMAIL_USER}>`,
      to, subject, html
    });
    console.log(`📧 Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`⚠️ Email failed to ${to}:`, err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. STAGE CHANGE → Email to CANDIDATE (includes HR name)
// ─────────────────────────────────────────────────────────────────────────────
async function sendStageChangeToCandidate({ candidateEmail, candidateName, jobTitle, newStage, hrName }) {
  const stageMessages = {
    'Applied': { emoji: '📋', body: `We have received your application for the <b>${jobTitle}</b> position. Our HR team will review it shortly.` },
    'Screening': { emoji: '🔍', body: `Your application for <b>${jobTitle}</b> is currently being reviewed by our HR team.` },
    'Technical Round 1': { emoji: '💻', body: `Congratulations! 🎉 You've been shortlisted for <b>Technical Round 1</b> for the <b>${jobTitle}</b> position. Our team will reach out with scheduling details.` },
    'Technical Round 2': { emoji: '🚀', body: `Great news! 🎉 You've advanced to <b>Technical Round 2</b> for the <b>${jobTitle}</b> position. Keep up the great work!` },
    'HR Round': { emoji: '🤝', body: `Congratulations! 🎉 You've made it to the <b>HR Interview</b> stage for <b>${jobTitle}</b>. Almost there!` },
    'Selected': { emoji: '🎉', body: `Congratulations! 🎊🎉 We're thrilled to inform you that you've been <b>SELECTED</b> for the <b>${jobTitle}</b> position! Our HR team will contact you with the offer details.` },
    'Rejected': { emoji: '📝', body: `Thank you for your interest in the <b>${jobTitle}</b> position. After careful consideration, we've decided to move forward with other candidates. We encourage you to apply for future openings.` }
  };

  const msg = stageMessages[newStage] || { emoji: '📌', body: `Your application for <b>${jobTitle}</b> has been updated to <b>${newStage}</b>.` };
  const isGoodNews = ['Technical Round 1', 'Technical Round 2', 'HR Round', 'Selected'].includes(newStage);
  const subject = newStage === 'Selected'
    ? `🎉 Congratulations! You've been Selected — ${jobTitle}`
    : `Application Update — ${jobTitle}`;

  const html = buildEmailWrapper('HireFlow ATS', 'Recruitment Update', `
    <p style="font-size: 16px; color: #334155; margin: 0 0 8px;">Hi <b>${candidateName}</b>,</p>
    <div style="background: ${isGoodNews ? '#f0fdf4' : '#f8fafc'}; border-radius: 12px; padding: 20px; margin: 16px 0; border: 1px solid ${isGoodNews ? '#bbf7d0' : '#e2e8f0'};">
      <p style="font-size: 28px; margin: 0 0 8px;">${msg.emoji}</p>
      <p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.6;">${msg.body}</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Current Stage</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #6366f1; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${newStage}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Position</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #334155; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${jobTitle}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; font-size: 13px; color: #94a3b8;">Your HR Contact</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #334155; font-weight: 600;">${hrName || 'HR Team'}</td>
      </tr>
    </table>
    <p style="font-size: 13px; color: #94a3b8; margin: 24px 0 0;">Best regards,<br><b>${hrName || 'HireFlow'} — Hiring Team</b></p>
  `);

  await sendMail(candidateEmail, subject, html);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. STAGE CHANGE → Email to ASSIGNED HR (includes candidate name)
// ─────────────────────────────────────────────────────────────────────────────
async function sendStageChangeToHR({ hrEmail, hrName, candidateName, jobTitle, newStage, movedByName }) {
  const html = buildEmailWrapper('HireFlow ATS', 'Pipeline Update', `
    <p style="font-size: 16px; color: #334155; margin: 0 0 8px;">Hi <b>${hrName}</b>,</p>
    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 16px 0; border: 1px solid #e2e8f0;">
      <p style="font-size: 28px; margin: 0 0 8px;">📋</p>
      <p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.6;">
        Candidate <b>${candidateName}</b> has been moved to <b style="color: #6366f1;">${newStage}</b> for the <b>${jobTitle}</b> position.
      </p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Candidate</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #334155; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${candidateName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">New Stage</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #6366f1; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${newStage}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; font-size: 13px; color: #94a3b8;">Position</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #334155; font-weight: 600;">${jobTitle}</td>
      </tr>
    </table>
    <p style="font-size: 13px; color: #94a3b8; margin: 24px 0 0;">Best regards,<br><b>HireFlow System</b></p>
  `);

  await sendMail(hrEmail, `Pipeline Update — ${candidateName} → ${newStage}`, html);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. NEW CANDIDATE ASSIGNED → Email to BOTH candidate AND assigned HR
// ─────────────────────────────────────────────────────────────────────────────
async function sendNewCandidateToHR({ hrEmail, hrName, candidateName, candidateEmail, jobTitle, addedByName }) {
  const html = buildEmailWrapper('HireFlow ATS', 'New Candidate Assigned', `
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
    <p style="font-size: 13px; color: #94a3b8; margin: 24px 0 0;">Best regards,<br><b>HireFlow System</b></p>
  `);

  await sendMail(hrEmail, `New Candidate Assigned — ${candidateName} for ${jobTitle}`, html);
}

async function sendNewCandidateToCandidate({ candidateEmail, candidateName, jobTitle, hrName }) {
  const html = buildEmailWrapper('HireFlow ATS', 'Application Received', `
    <p style="font-size: 16px; color: #334155; margin: 0 0 8px;">Hi <b>${candidateName}</b>,</p>
    <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 16px 0; border: 1px solid #bbf7d0;">
      <p style="font-size: 28px; margin: 0 0 8px;">📋✨</p>
      <p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.6;">
        Your application for the <b>${jobTitle}</b> position has been received! Our HR team will review your profile and get back to you soon.
      </p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Position</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #6366f1; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${jobTitle}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Current Stage</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #334155; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Applied</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; font-size: 13px; color: #94a3b8;">Your HR Contact</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #334155; font-weight: 600;">${hrName || 'HR Team'}</td>
      </tr>
    </table>
    <p style="font-size: 13px; color: #94a3b8; margin: 24px 0 0;">Good luck! 🍀<br><b>${hrName || 'HireFlow'} — Hiring Team</b></p>
  `);

  await sendMail(candidateEmail, `Application Received — ${jobTitle}`, html);
}

module.exports = {
  sendStageChangeToCandidate,
  sendStageChangeToHR,
  sendNewCandidateToHR,
  sendNewCandidateToCandidate,
  warmUp
};
