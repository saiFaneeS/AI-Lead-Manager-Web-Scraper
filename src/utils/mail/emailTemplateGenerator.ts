import { groq } from "@/utils/groqClient";
import { modelEmailWriter, MY_NAME } from "@/constants";

export async function generateEmailTemplate(jobDescription: string): Promise<{
  subject: string;
  body: string;
}> {
  try {
    const prompt = `
    Analyze this job description and write the following email template for the job while keeping the jargon very minimal;
    The email should:
    - Write Subject [Application for [work] needs]
    - Stay concise and to the point
    - Highlight skills matching the job requirements
    - Replace words in [] that fit the job
    - Only share a portfolio if the job is for graphic design or software/seo niche (developer: https://saifanees.vercel.app, for design: https://sayfanees.vercel.app) (keep the links as non hyperlinks)
    - Dont say anything regarding a portfolio or anything if the job is for 3d modeling(excluding 3d websites), virtual assistant, writing, digital marketing or any other niche 
    - Role title in the [] should be as close as possible to  (eg roles: Web Developer, Graphic Designer, SEO Expert)   
    This is the sample:
    
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
          ul{
            margin: 0;
          }
          </style>
      </head>
      <body>
          <p>Hi [person's name or brand's name if you can determine it or else just say Hi,],</p>
          
          <p>I'm Saif and I'm reaching out regarding your [company's/brand/coaching etc] [website/design/logo etc] needs.</p>
          
          <ul>
            <li>I am a [Web Developer/Logo Designer/Book Cover Designer (dont be too specific like mentioning the tech of the industry). etc] and I've [designed/developed/built etc] [webdesigns/posters/mobile apps etc] for many [companies/brands etc] & received consistent positive feedback.<br/>
            <li>I'd love to work for you on [re-building/designing/development/research] of [the task mentioned in the job, eg: the webpages and also making sure the design stays consistent with your brand]</li>
            <li>[This is very optional and can be left out. try to provide a concise direction or an approach (for eg: "i think we can try for.." or "The problem youre facing may have something to do with..")]..</li>
          </ul>
          <p>Would love to learn and discuss more on this.</p>

          <p>Please check out my recent works here:<br/>
          Portfolio: [only portfolio link]</p>

          <p>${MY_NAME} | [Designer/Web Developer etc]</p>
          </body>
          </html>


    Format the response exactly as and nothing else:
    SUBJECT:
    [subject line]

    BODY:
    [email body]

    Job Description:
    "${jobDescription}"`;

    // <p>${MY_NAME} | [Designer/Web Developer etc]</p>

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are an email writer who will write application to people/companies who need freelance service",
        },
        { role: "user", content: prompt },
      ],
      model: modelEmailWriter,
      max_tokens: 800,
      temperature: 0.7,
    });

    const result = response.choices[0]?.message?.content || "";
    const [, subject, body] = result.split(/SUBJECT:|BODY:/);
    console.log("-- Email temp generated");

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
