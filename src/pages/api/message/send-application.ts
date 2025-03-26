import { NextApiRequest, NextApiResponse } from "next";
import { generateEmailTemplate } from "@/utils/mail/emailTemplateGenerator";
import { sendEmail } from "@/utils/mail/emailSender";
import { EMAIL_USER } from "@/constants";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { jobDescription, emails } = req.body;

    if (!jobDescription || !emails || !emails.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const template = await generateEmailTemplate(jobDescription);

    const results = await Promise.all(
      emails.map(async (email: string) => {
        const sent = await sendEmail({
          from: EMAIL_USER,
          to: email,
          subject: template.subject,
          body: template.body,
        });
        return { email, sent };
      })
    );

    console.log("-- Email sending results:", results);

    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error("!! Error sending manual email:", error);
    return res.status(500).json({ message: "Error sending applications" });
  }
}
