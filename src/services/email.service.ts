import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️ RESEND_API_KEY not configured - emails will not be sent");
    return;
  }

  try {
    console.log(`📧 Sending email to ${options.to}...`);
    const startTime = Date.now();

    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error("❌ Resend error:", error);
      throw new Error(error.message);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Email sent successfully to ${options.to} in ${duration}ms`);
  } catch (error: any) {
    console.error("❌ Failed to send email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};
