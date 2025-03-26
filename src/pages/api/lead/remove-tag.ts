import { supabase } from "@/utils/supabaseClient";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "DELETE") {
    const { id, tag } = req.body;

    if (!id || !tag) {
      return res.status(401).json({ error: "Lead ID and tag are required" });
    }

    const { data: leadData, error: leadError } = await supabase
      .from("leads")
      .select("tags")
      .eq("id", id)
      .single();

    if (leadError) {
      return res.status(500).json({ error: leadError.message });
    }

    // Remove the tag
    const updatedTags = (leadData.tags || [] as string[]).filter((t: string) => t !== tag);

    const { data, error } = await supabase
      .from("leads")
      .update({ tags: updatedTags })
      .eq("id", id)
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, updatedLead: data[0] });
  }

  res.setHeader("Allow", ["DELETE"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
