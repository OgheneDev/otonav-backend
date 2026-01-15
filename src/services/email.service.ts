import nodemailer from "nodemailer";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create transporter (reuse this, don't create new ones each time)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER, // Your Gmail address
    pass: process.env.GMAIL_APP_PASSWORD, // App password from step 1
  },
});

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("⚠️ Gmail credentials not configured");
    return;
  }

  try {
    console.log(`📧 Sending email to ${options.to}...`);
    const startTime = Date.now();

    const info = await transporter.sendMail({
      from: `"Your App" <${process.env.GMAIL_USER}>`, // Your Gmail
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
