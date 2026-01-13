import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || "emmanueloghene72@gmail.com";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth:
    SMTP_USER && SMTP_PASS
      ? {
          user: SMTP_USER,
          pass: SMTP_PASS,
        }
      : undefined,
  // Add timeouts to prevent hanging
  connectionTimeout: 10000, // 10 seconds to establish connection
  greetingTimeout: 10000, // 10 seconds to receive greeting from server
  socketTimeout: 30000, // 30 seconds of socket inactivity before timeout
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (!SMTP_HOST) {
    console.warn("SMTP not configured, email not sent:", {
      to: options.to,
      subject: options.subject,
    });
    return;
  }

  try {
    console.log(`📧 Attempting to send email to ${options.to}...`);
    const startTime = Date.now();

    await transporter.sendMail({
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Email sent successfully to ${options.to} in ${duration}ms`);
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    console.error("SMTP Config:", {
      host: SMTP_HOST,
      port: SMTP_PORT,
      user: SMTP_USER,
      hasPassword: !!SMTP_PASS,
    });
    throw new Error("Failed to send invitation email");
  }
};
