import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "emmanueloghene72@gmail.com";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.warn("⚠️ SENDGRID_API_KEY not configured");
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (!SENDGRID_API_KEY) {
    console.warn("📧 SendGrid not configured, email not sent");
    return;
  }

  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 [${attempt}/${maxRetries}] Sending to ${options.to}...`);

      const msg = {
        to: options.to,
        from: EMAIL_FROM,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ""),
      };

      // Add timeout to the request
      const sendPromise = sgMail.send(msg);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout after 10s")), 10000)
      );

      const response = (await Promise.race([
        sendPromise,
        timeoutPromise,
      ])) as any;

      console.log(`✅ Email sent to ${options.to}`);
      return; // Success!
    } catch (error: any) {
      lastError = error;
      console.error(`❌ [${attempt}/${maxRetries}] Failed:`, error.message);

      if (error.response) {
        console.error("SendGrid error:", {
          status: error.response.statusCode,
          body: error.response.body,
        });

        // Don't retry on client errors (400-499)
        if (
          error.response.statusCode >= 400 &&
          error.response.statusCode < 500
        ) {
          throw new Error(
            `SendGrid error: ${JSON.stringify(error.response.body)}`
          );
        }
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        console.log(`⏳ Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // All retries failed
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError?.message}`);
};
