const nodemailer = require("nodemailer");

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173";

/**
 * Create transporter. If SMTP env vars are not set, uses a "no-op" that logs to console.
 * Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (and optionally SMTP_SECURE) in .env for real email.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true";

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(port),
      secure,
      auth: { user, pass },
    });
  }

  // No SMTP config: use a fake transporter that just logs (for development)
  return {
    sendMail: (opts) => {
      console.log("[Email not configured - logging instead]");
      console.log("  To:", opts.to);
      console.log("  Subject:", opts.subject);
      console.log("  Reset link:", opts.text?.match(/https?:\/\/[^\s]+/) || opts.html?.match(/href="([^"]+)/)?.[1] || "see text");
      return Promise.resolve({ messageId: "dev-log" });
    },
  };
}

/**
 * Send password reset email. Resolve even if sending fails (e.g. no SMTP); caller already saved token.
 */
async function sendPasswordResetEmail(email, resetToken) {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
  const transporter = getTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || "Smart E-Voting <noreply@smart-evoting.local>",
    to: email,
    subject: "Reset your Smart E-Voting password",
    text: `You requested a password reset. Click the link below (valid for 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
    html: `
      <p>You requested a password reset for Smart E-Voting.</p>
      <p>Click the link below to set a new password (valid for 1 hour):</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send reset email:", err.message);
    // Don't throw – token is already saved; user might still use the link if we log it
  }
}

module.exports = { sendPasswordResetEmail, FRONTEND_URL };
