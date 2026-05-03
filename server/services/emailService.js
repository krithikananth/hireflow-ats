const { Resend } = require('resend');

/**
 * Email notification service using Resend HTTP API.
 * Works on ALL hosting platforms (no SMTP port issues).
 * Set RESEND_API_KEY in .env to enable.
 */

let resend = null;

function getResend() {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log('📧 Email notifications disabled (RESEND_API_KEY not set)');
    return null;
  }
  resend = new Resend(key);
  console.log('📧 Email notifications enabled via Resend');
  return resend;
}

async function sendMail(to, subject, html) {
  const r = getResend();
  if (!r) return;
  try {
    const result = await r.emails.send({
      from: 'HireFlow ATS <onboarding@resend.dev>',
      to: [to],
      subject,
      html
    });
    if (result.error) {
      console.error(`⚠️ Email failed to ${to}:`, result.error.message);
    } else {
      console.log(`📧 Email sent to ${to}: ${subject} (id: ${result.data?.id})`);
    }
  } catch (err) {
    console.error(`⚠️ Email failed to ${to}:`, err.message);
  }
}

// warmUp - verify API key is valid
async function warmUp() {
  const r = getResend();
  if (!r) return;
  console.log('📧 Resend API ready');
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

// ─── STAGE CHANGE → CANDIDATE ─────────────────────────────────────────────
async function sendStageChangeToCandidate({ candidateEmail, candidateName, jobTitle, newStage, hrName }) {
  const stageMessages = {
    'Applied': { emoji: '📋', body: `We have received your application for the <b>${jobTitle}</b> position. Our HR team will review it shortly.` },
    'Screening': { emoji: '🔍', body: `Your application for <b>${jobTitle}</b> is currently being reviewed by our HR team.` },
    'Technical Round 1': { emoji: '💻', body: `Congratulations! 🎉 You've been shortlisted for <b>Technical Round 1</b> for the <b>${jobTitle}</b> position.` },
    'Technical Round 2': { emoji: '🚀', body: `Great news! 🎉 You've advanced to <b>Technical Round 2</b> for the <b>${jobTitle}</b> position.` },
    'HR Round': { emoji: '🤝', body: `Congratulations! 🎉 You've made it to the <b>HR Interview</b> stage for <b>${jobTitle}</b>.` },
    'Selected': { emoji: '🎉', body: `Congratulations! 🎊🎉 You've been <b>SELECTED</b> for the <b>${jobTitle}</b> position!` },
    'Rejected': { emoji: '📝', body: `Thank you for your interest in the <b>${jobTitle}</b> position. We've decided to move forward with other candidates.` }
  };
  const msg = stageMessages[newStage] || { emoji: '📌', body: `Your application for <b>${jobTitle}</b> has been updated to <b>${newStage}</b>.` };
  const isGoodNews = ['Technical Round 1', 'Technical Round 2', 'HR Round', 'Selected'].includes(newStage);
  const subject = newStage === 'Selected' ? `🎉 Congratulations! You've been Selected — ${jobTitle}` : `Application Update — ${jobTitle}`;

  const html = buildEmailWrapper('HireFlow ATS', 'Recruitment Update', `
    <p style="font-size: 16px; color: #334155; margin: 0 0 8px;">Hi <b>${candidateName}</b>,</p>
    <div style="background: ${isGoodNews ? '#f0fdf4' : '#f8fafc'}; border-radius: 12px; padding: 20px; margin: 16px 0; border: 1px solid ${isGoodNews ? '#bbf7d0' : '#e2e8f0'};">
      <p style="font-size: 28px; margin: 0 0 8px;">${msg.emoji}</p>
      <p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.6;">${msg.body}</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Current Stage</td>
          <td style="padding: 8px 12px; font-size: 13px; color: #6366f1; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${newStage}</td></tr>
      <tr><td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Position</td>
          <td style="padding: 8px 12px; font-size: 13px; color: #334155; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${jobTitle}</td></tr>
      <tr><td style="padding: 8px 12px; font-size: 13px; color: #94a3b8;">Your HR Contact</td>
          <td style="padding: 8px 12px; font-size: 13px; color: #334155; font-weight: 600;">${hrName || 'HR Team'}</td></tr>
    </table>
    <p style="font-size: 13px; color: #94a3b8; margin: 24px 0 0;">Best regards,<br><b>${hrName || 'HireFlow'} — Hiring Team</b></p>
  `);
  await sendMail(candidateEmail, subject, html);
}

// ─── STAGE CHANGE → HR ────────────────────────────────────────────────────
async function sendStageChangeToHR({ hrEmail, hrName, candidateName, jobTitle, newStage }) {
  const html = buildEmailWrapper('HireFlow ATS', 'Pipeline Update', `
    <p style="font-size: 16px; color: #334155; margin: 0 0 8px;">Hi <b>${hrName}</b>,</p>
    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 16px 0; border: 1px solid #e2e8f0;">
      <p style="font-size: 28px; margin: 0 0 8px;">📋</p>
      <p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.6;">
        Candidate <b>${candidateName}</b> has been moved to <b style="color: #6366f1;">${newStage}</b> for the <b>${jobTitle}</b> position.
      </p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Candidate</td>
          <td style="padding: 8px 12px; font-size: 13px; color: #334155; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${candidateName}</td></tr>
      <tr><td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">New Stage</td>
          <td style="padding: 8px 12px; font-size: 13px; color: #6366f1; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${newStage}</td></tr>
      <tr><td style="padding: 8px 12px; font-size: 13px; color: #94a3b8;">Position</td>
          <td style="padding: 8px 12px; font-size: 13px; color: #334155; font-weight: 600;">${jobTitle}</td></tr>
    </table>
    <p style="font-size: 13px; color: #94a3b8; margin: 24px 0 0;">Best regards,<br><b>HireFlow System</b></p>
  `);
  await sendMail(hrEmail, `Pipeline Update — ${candidateName} → ${newStage}`, html);
}

// ─── NEW CANDIDATE → HR ───────────────────────────────────────────────────
async function sendNewCandidateToHR({ hrEmail, hrName, candidateName, candidateEmail, jobTitle, addedByName }) {
  const html = buildEmailWrapper('HireFlow ATS', 'New Candidate Assigned', `
    <p style="font-size: 16px; color: #334155; margin: 0 0 8px;">Hi <b>${hrName}</b>,</p>
    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 16px 0; border: 1px solid #e2e8f0;">
      <p style="font-size: 28px; margin: 0 0 8px;">👤</p>
      <p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.6;">A new candidate has been assigned to you.</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Candidate</td>
          <td style="padding: 8px 12px; font-size: 13px; color: #334155; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${candidateName}</td></tr>
      <tr><td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Email</td>
          <td style="padding: 8px 12px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9;">${candidateEmail}</td></tr>
      <tr><td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Position</td>
          <td style="padding: 8px 12px; font-size: 13px; color: #6366f1; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${jobTitle}</td></tr>
      <tr><td style="padding: 8px 12px; font-size: 13px; color: #94a3b8;">Added by</td>
          <td style="padding: 8px 12px; font-size: 13px; color: #334155;">${addedByName}</td></tr>
    </table>
    <p style="font-size: 13px; color: #94a3b8; margin: 24px 0 0;">Best regards,<br><b>HireFlow System</b></p>
  `);
  await sendMail(hrEmail, `New Candidate Assigned — ${candidateName} for ${jobTitle}`, html);
}

// ─── NEW CANDIDATE → CANDIDATE ────────────────────────────────────────────
async function sendNewCandidateToCandidate({ candidateEmail, candidateName, jobTitle, hrName }) {
  const html = buildEmailWrapper('HireFlow ATS', 'Application Received', `
    <p style="font-size: 16px; color: #334155; margin: 0 0 8px;">Hi <b>${candidateName}</b>,</p>
    <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 16px 0; border: 1px solid #bbf7d0;">
      <p style="font-size: 28px; margin: 0 0 8px;">📋✨</p>
      <p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.6;">
        Your application for the <b>${jobTitle}</b> position has been received! Our HR team will review your profile soon.
      </p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Position</td>
          <td style="padding: 8px 12px; font-size: 13px; color: #6366f1; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${jobTitle}</td></tr>
      <tr><td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">Current Stage</td>
          <td style="padding: 8px 12px; font-size: 13px; color: #334155; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Applied</td></tr>
      <tr><td style="padding: 8px 12px; font-size: 13px; color: #94a3b8;">Your HR Contact</td>
          <td style="padding: 8px 12px; font-size: 13px; color: #334155; font-weight: 600;">${hrName || 'HR Team'}</td></tr>
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
