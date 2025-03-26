import { modelKeywordFinder } from "@/constants";
import { groq } from "./groqClient";

export const extractKeywords = async (text: string): Promise<string[]> => {
  const prompt = `Identify people names or names that may be of small to mid-sized companies, brands, or organizations from the text. 
  Exclude:
  - Generic terms (e.g., designer, developer, technology names)
  - Designation titles (e.g., manager, CEO)
  - Popular or big brands and companies, or widely used tech & software (e.g., Facebook, Wordpress, Next.js, Figma, AWS, Adobe, Zapier, toyota)
  - Places, events, genres (e.g., Russia, K-Pop, Jiu Jitsu)
  - Anything other than person names or specific brand/organization names
  
  Return each name on a new line. If no such names are found, return "NONE" without any explanation or additional text:
  
  Text: "${text}"`;

  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Identify brand names/person names and return each on a new line.",
        },
        { role: "user", content: prompt },
      ],
      model: modelKeywordFinder,
      max_tokens: 100,
    });

    const result = response.choices[0]?.message?.content || "";

    const unwantedKeywords = [
      "none",
      "none.",
      "no words found",
      "no such words",
      "semrush",
      "stripe",
      "paypal",
      "google",
      "openai",
      "vercel",
      "digitalocean",
      "aws",
      "docker",
      "kubernetes",
      "github",
      "reddit",
      "youtube",
      "shopify",
      "wordpress",
      "woocommerce",
      "framer",
      "adobe",
      "linkedin",
      "twitter",
      "seo",
      "php",
      "zoho",
      "instagram",
      "upwork",
      "facebook",
      "amazon",
      "kindle",
      "indesign",
      "nodejs",
      "midjourney",
      "openai",
      "slack",
      "gumroad",
      "monday.com",
      "chatgpt",
      "chat gpt",
      "capcut",
      "bitcoin",
      "ethereum",
    ];

    const keywords = result
      .split("\n")
      .map((keyword) => keyword.trim())
      .filter(
        (keyword) =>
          keyword !== "" &&
          !unwantedKeywords.includes(keyword.toLowerCase()) &&
          keyword.split(" ").length <= 4 &&
          keyword.length <= 20
      );

    return keywords;
  } catch (error) {
    console.error("Groq Keyword Extraction Error:", error);
    return [];
  }
};
