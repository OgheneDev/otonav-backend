import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "emmanueloghene72@gmail.com";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (!SENDGRID_API_KEY) {
    console.warn("⚠️ SendGrid not configured");
    return;
  }

  try {
    console.log(`📧 Sending email to ${options.to}...`);

    await sgMail.send({
      to: options.to,
      from: {
        email: EMAIL_FROM,
        name: "Your App Name", // Add a friendly name
      },
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),

      // These improve deliverability:
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false },
      },
      mailSettings: {
        bypassListManagement: { enable: false },
        sandboxMode: { enable: false },
      },
    });

    console.log(`✅ Email sent to ${options.to}`);
  } catch (error: any) {
    console.error("❌ Failed to send email:", error);

    if (error.response) {
      console.error("SendGrid Error:", {
        status: error.response.statusCode,
        body: error.response.body,
      });
    }

    throw new Error(`Failed to send email: ${error.message}`);
  }
};
