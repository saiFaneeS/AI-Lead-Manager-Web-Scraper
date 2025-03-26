import { scrapeWebsite } from "@/utils/websiteScraper";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const scrapedData = await scrapeWebsite("https://husbaan.vercel.app");

  console.log(scrapedData);
};

export default handler;
