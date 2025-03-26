import { groq } from "@/utils/groqClient";
import { modelEmailWriter, MY_NAME } from "@/constants";

export async function followUpEmailWriter(jobDescription: string): Promise<{
  subject: string;
  body: string;
}> {
  try {
    const prompt = `
    I previously sent an email to them. Analyze this job description and curate a follow-up email template for cases where the client hasn't hired anyone yet. Keep the jargon minimal.
    
    The email should:
    - Write Subject
    - Be concise
    - Acknowledge that I reached out before and politely follow up  
    - Mention that I noticed they haven’t hired yet and that I’m still available  
    - Replace words in [] that fit the job  
    - Only share a portfolio if the job is for graphic design or software/SEO niche (developer: https://saifanees.vercel.app, for design: https://sayfanees.vercel.app)  
    - Don’t mention a portfolio if the job is for 3D modeling (excluding 3D websites), virtual assistant, writing, digital marketing, or any other niche  

    Sample:
    
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>[subject line]</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
          }
          a {
            color: #007bff;
            text-decoration:none;
          }
          a:hover {    
            text-decoration: underline;
          }
          ul{
            margin: 0;
          }
        </style>
      </head>
      <body>
          <p>Hi [person's name or brand's name ONLY if you can determine it or else just say Hi,],</p>
          
          <p>I reached out earlier regarding your [company's/brand's/coaching etc.] [website/logo/etc.] needs and wanted to follow up since It seems like you haven't hired anyone yet.</p>
          
          <ul>
            <li>I'm a [Web Developer/Logo Designer/etc.] with experience in [developing/designing] [websites/posters/apps] for various brands and have received great feedback.</li>
            <li>I'm happy to assist with [task mentioned in the job in consicely manner].</li>
            <li>Let me know if you'd like to discuss how I can help!</li>
          </ul>

          <p>You can check out my recent works here:<br/>
          Portfolio: [only portfolio link]</p>

          <p>Looking forward to your response.</p>

          <p>Best,<br/>
          ${MY_NAME} | [Web Developer/Designer/etc.]</p>
      </body>
    </html>

    Format the response exactly as and nothing else:
    SUBJECT:
    [subject line]

    BODY:
    [email body]

    Job Description:
    "${jobDescription}"
`;

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are an email writer who will write follow ups for previously sent applications to people/companies who need freelance service",
        },
        { role: "user", content: prompt },
      ],
      model: modelEmailWriter,
      max_tokens: 800,
      temperature: 0.7,
    });

    const result = response.choices[0]?.message?.content || "";
    const [, subject, body] = result.split(/SUBJECT:|BODY:/);
    console.log("-- Follow-up temp generated");

    return {
      subject: subject?.trim() || "",
      body: body?.trim() || "",
    };
  } catch (error) {
    console.error("Error generating email template:", (error as Error).message);
    return {
      subject: "",
      body: "",
    };
  }
}
