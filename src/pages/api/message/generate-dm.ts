import { modelEmailWriter } from "@/constants";
import { groq } from "@/utils/groqClient";
import { NextApiRequest, NextApiResponse } from "next";

export default async function generateDM(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const prompt = `
            Analyze this job description and curate a short and engaging Instagram DM for the job.
            The DM should:
            - Be concise, natural, and friendly
            - Use a conversational tone
            - Highlight skills matching the job requirements
            - Replace words in [] that fit the job
            - Only share a portfolio if the job is for graphic design, software development, or SEO (developer: https://saifanees.vercel.app, design: https://sayfanees.vercel.app)
            - Don't mention a portfolio if the job is for 3D modeling (excluding 3D websites), virtual assistant, writing, digital marketing, or any other niche
            - Avoid excessive formality
            
            This is the sample:
            
            "Hey [person's name or brand's name], I came across your post about [job/task mentioned] and wanted to reach out! I'm a [Web Developer/Designer/etc.] with experience in [relevant skill], and I'd love to help you with [the task]. Let me know if you're open to chatting—would love to hear more about what you're looking for!"
            
            Format your response exactly as and nothing else:
            MESSAGE:
            [Instagram DM]
            
            Job Description:
            "${req.body.jobDescription}"`;

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a social media outreach specialist who writes engaging Instagram DMs for freelance job applications.",
        },
        { role: "user", content: prompt },
      ],
      model: modelEmailWriter,
      max_tokens: 300,
      temperature: 0.7,
    });

    const result = response.choices[0]?.message?.content || "";
    const [, message] = result.split(/MESSAGE:/);
    console.log("-- Instagram DM generated");

    return res.status(200).json({
      message: message?.trim() || "",
    });
  } catch (error) {
    console.error("Error generating Instagram DM:", (error as Error).message);
    return res.status(500).json({
      message: "",
    });
  }
}
