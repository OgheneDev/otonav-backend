import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "no-reply@otonav.com.ng";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (!resend) {
    console.warn("⚠️ Resend not configured");
    return;
  }

  try {
    console.log(`📧 Sending email to ${options.to}...`);

    const { data, error } = await resend.emails.send({
      from: `Otonav <${EMAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      throw error;
    }

    console.log(`✅ Email sent to ${options.to}`, data);
  } catch (error: any) {
    console.error("❌ Failed to send email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};
