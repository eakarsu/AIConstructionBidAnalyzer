/**
 * Email service using nodemailer.
 * Gracefully skips sending if SMTP is not configured.
 */

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  try {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '587', 10),
      secure: parseInt(SMTP_PORT || '587', 10) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    return transporter;
  } catch (err) {
    console.warn('[EmailService] nodemailer not available:', err.message);
    return null;
  }
}

async function sendEmail({ to, subject, text, html }) {
  const transport = getTransporter();
  if (!transport) {
    console.warn(`[EmailService] SMTP not configured — skipping email to ${to}: ${subject}`);
    return { skipped: true };
  }

  try {
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    console.log(`[EmailService] Sent to ${to}: ${subject} (messageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EmailService] Failed to send email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

async function sendBidAnalysisComplete({ to, projectName, bidAmount, analysisType }) {
  return sendEmail({
    to,
    subject: `AI Analysis Complete — ${projectName}`,
    text: `Your ${analysisType} analysis for project "${projectName}" (Bid Amount: $${bidAmount}) has been completed. Log in to view the full results.`,
    html: `<h2>AI Analysis Complete</h2>
<p>Your <strong>${analysisType}</strong> analysis for project <strong>"${projectName}"</strong> has been completed.</p>
<p>Bid Amount: <strong>$${bidAmount}</strong></p>
<p>Log in to view the full results.</p>`,
  });
}

async function sendChangeOrderAlert({ to, projectName, changeOrderTitle, costImpact }) {
  return sendEmail({
    to,
    subject: `Change Order Alert — ${projectName}`,
    text: `A change order "${changeOrderTitle}" has been submitted for project "${projectName}" with a cost impact of $${costImpact}. Please review.`,
    html: `<h2>Change Order Alert</h2>
<p>A change order <strong>"${changeOrderTitle}"</strong> has been submitted for project <strong>"${projectName}"</strong>.</p>
<p>Estimated Cost Impact: <strong>$${costImpact}</strong></p>
<p>Please log in to review and approve or reject.</p>`,
  });
}

async function sendDocumentUploaded({ to, projectName, documentName, uploadedBy }) {
  return sendEmail({
    to,
    subject: `New Document Uploaded — ${projectName}`,
    text: `"${documentName}" was uploaded to project "${projectName}" by ${uploadedBy}.`,
    html: `<h2>New Document Uploaded</h2>
<p>A new document <strong>"${documentName}"</strong> was uploaded to project <strong>"${projectName}"</strong> by ${uploadedBy}.</p>`,
  });
}

module.exports = {
  sendEmail,
  sendBidAnalysisComplete,
  sendChangeOrderAlert,
  sendDocumentUploaded,
};
