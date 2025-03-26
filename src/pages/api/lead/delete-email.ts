import { supabase } from "@/utils/supabaseClient";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "DELETE") {
    const { id, email } = req.body;

    // Fetch the current emails array for the specified lead
    const { data, error: fetchError } = await supabase
      .from("leads")
      .select("emails")
      .eq("id", id)
      .single();

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }

    // Remove the specified email from the array
    const updatedEmails = data.emails.filter((e: string) => e !== email);

    // Update the emails array in the database
    const { error: updateError } = await supabase
      .from("leads")
      .update({ emails: updatedEmails })
      .eq("id", id);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({ success: true, message: "Email deleted" });
  }

  res.setHeader("Allow", ["DELETE"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
