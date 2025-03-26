import { EMAIL_PASSWORD, EMAIL_USER, MY_NAME } from "@/constants";
import nodemailer from "nodemailer";

interface EmailConfig {
  from: string;
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail({ to, subject, body }: EmailConfig) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: `"${MY_NAME}" <${EMAIL_USER}>`,
      to,
      subject,
      html: body,
    });

    return true;
  } catch (error) {
    console.error("!! Error sending auto-email:", error);
    return false;
  }
}
