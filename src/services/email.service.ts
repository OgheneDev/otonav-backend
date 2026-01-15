import nodemailer from "nodemailer";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const transporter = nodemailer.createTransport({
  host: "smtp.elasticemail.com",
  port: 2525, // Railway-friendly port
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.ELASTIC_EMAIL_USER, // Your Elastic Email username
    pass: process.env.ELASTIC_EMAIL_PASSWORD, // SMTP password from dashboard
  },
});

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (!process.env.ELASTIC_EMAIL_USER || !process.env.ELASTIC_EMAIL_PASSWORD) {
    console.warn("⚠️ Elastic Email credentials not configured");
    return;
  }

  try {
    console.log(`📧 Sending email to ${options.to}...`);
    const startTime = Date.now();

    const info = await transporter.sendMail({
      from:
        process.env.ELASTIC_EMAIL_FROM ||
        `"Your App" <${process.env.ELASTIC_EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Email sent successfully to ${options.to} in ${duration}ms`);
    console.log(`📬 Message ID: ${info.messageId}`);
  } catch (error: any) {
    console.error("❌ Failed to send email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};
