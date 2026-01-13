import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "emmanueloghene72@gmail.com";

// Initialize SendGrid
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.warn("⚠️  SENDGRID_API_KEY not configured - emails will not be sent");
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (!SENDGRID_API_KEY) {
    console.warn("📧 SendGrid not configured, email not sent:", {
      to: options.to,
      subject: options.subject,
    });
    return;
  }

  try {
    console.log(`📧 Attempting to send email to ${options.to}...`);
    const startTime = Date.now();

    await sgMail.send({
      to: options.to,
      from: EMAIL_FROM, // Must be verified in SendGrid
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Email sent successfully to ${options.to} in ${duration}ms`);
  } catch (error: any) {
    console.error("❌ Failed to send email:", error);
    
    // SendGrid-specific error details
    if (error.response) {
      console.error("SendGrid Error Details:", {
        statusCode: error.response.statusCode,
        body: error.response.body,
      });
    }

    throw new Error("Failed to send email");
  }
};
