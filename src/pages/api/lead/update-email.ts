import { supabase } from "@/utils/supabaseClient";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "PUT") {
    const { id, oldEmail, newEmail } = req.body;

    if (!id || !oldEmail || !newEmail) {
      return res.status(401).json({ error: "lead id, old email, and new email are required" });
    }

    // Fetch the lead to get the current emails
    const { data: leadData, error: leadError } = await supabase
      .from("leads")
      .select("emails")
      .eq("id", id)
      .single();

    if (leadError) {
      return res.status(500).json({ error: leadError.message });
    }

    // Update the emails array
    const updatedEmails = (leadData.emails || []).map((email: string) =>
      email === oldEmail ? newEmail : email
    );

    // Update the lead with the new emails array
    const { data, error } = await supabase
      .from("leads")
      .update({ emails: updatedEmails })
      .eq("id", id)
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, updatedLead: data[0] });
  }

  res.setHeader("Allow", ["PUT"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}