const logger = require("./logger");

// Lazy Resend client (created on first use, mirrors the old nodemailer pattern)
let _resend = null;
const getResendClient = () => {
  if (!_resend) {
    const { Resend } = require("resend");
    if (!process.env.RESEND_API_KEY) {
      throw new Error(
        "RESEND_API_KEY is not set. Add it to your .env / Render environment variables.",
      );
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
};

/**
 * Send an email via Resend's HTTP API (port 443).
 *
 * We switched from nodemailer/Gmail SMTP to Resend because hosts like Render
 * block or heavily restrict outbound SMTP ports (587/465) on their free/standard
 * web service tier, which made verification emails hang and time out
 * (ETIMEDOUT) no matter how the SMTP config or Gmail app password were set.
 * Resend sends over plain HTTPS, which is never blocked.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - Email HTML body
 * @returns {Promise<{success: true, id: string}>}
 */
const sendEmail = async ({ to, subject, html }) => {
  logger.info(`📧 Sending email via Resend to ${to}`);

  const resend = getResendClient();
  const from = process.env.EMAIL_FROM || "FileVault <onboarding@resend.dev>";

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  console.log("RESEND DATA:", data);
  console.log("RESEND ERROR:", error);

  if (error) {
    logger.error(`❌ Resend error sending to ${to}: ${JSON.stringify(error)}`);
    throw new Error(error.message || "Failed to send email via Resend");
  }

  logger.info(`✔️ Email sent via Resend to ${to}. ID: ${data?.id}`);
  return { success: true, id: data?.id };
};

module.exports = { sendEmail };
