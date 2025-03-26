import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabaseClient";
import { scrapeWebsite } from "@/utils/websiteScraper";
import { generateEmailTemplate } from "@/utils/mail/emailTemplateGenerator";
import { sendEmail } from "@/utils/mail/emailSender";
import { Lead } from "@/types/Lead";
import { format } from "date-fns";
import axios from "axios";
import { EMAIL_USER, modelJobScraper, RSS_FEED } from "@/constants";
import { groq } from "@/utils/groqClient";

const logArray: string[] = [];

const normalizeUrlForComparison = (url: string) => {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .toLowerCase();
};

const blockedURLS = [
  // Web Hosting & CMS
  "square.com",
  "rocket.net",
  "hostinger.com",
  "squarespace.com",
  "wordpress.org",
  "wix.com",
  "netlify.com",
  "render.com",
  "builder.io",

  // Social Media & Messaging
  "x.com",
  "twitter.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "pinterest.com",
  "snapchat.com",
  "tiktok.com",
  "telegram.me",
  "t.me",
  "discord.com",
  "threads.net",
  "whatsapp.com",
  "reddit.com",

  // Finance & Payment Platforms
  "robinhood.com",
  "paypal.com",
  "stripe.com",
  "coinbase.com",
  "blockchain.com",
  "venmo.com",
  "zelle.com",
  "squareup.com",
  "cash.app",

  // Crypto & Web3
  "web3.js",
  "etherscan.io",
  "opensea.io",
  "metamask.io",
  "trustwallet.com",
  "cryptocompare.com",
  "binance.com",

  // Business & Marketing Tools
  "hubspot.com",
  "salesforce.com",
  "activecampaign.com",
  "mailchimp.com",
  "klaviyo.com",
  "customer.io",
  "aloware.com",
  "apollo.io",
  "zoho.com",
  "expensify.com",
  "dribbble.com",
  "frame.io",
  "framer.com",

  // E-Commerce & Marketplaces
  "amazon.com",
  "ebay.com",
  "shopify.com",
  "walmart.com",
  "etsy.com",
  "rakuten.com",
  "bestbuy.com",
  "target.com",
  "booking.com",

  // Software Development & Tech
  "github.com",
  "gitlab.com",
  "bitbucket.org",
  "node.js",
  "react.js",
  "next.js",
  "vue.js",
  "nest.js",
  "nuxt.js",
  "asp.net",
  "dribbble.com",

  // Media, Blogs & Publishing
  "medium.com",
  "forbes.com",
  "scribd.com",
  "goodreads.com",
  "speedtest.net",

  // Email Providers
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "icloud.com",
  "protonmail.com",
  "zoho.com",
  "aol.com",

  // URL Shorteners
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "shorturl.at",
  "cutt.ly",

  // Automation & Integration
  "make.com",
  "zapier.com",

  // Job Platforms
  "upwork.com",
  "freelancer.com",
  "fiverr.com",
  "linkedin.com/jobs",
  "indeed.com",
  "monster.com",
  "glassdoor.com",
].map((domain) => normalizeUrlForComparison(domain));

const formatUrl = (url: string): string => {
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  const domainPattern = /https?:\/\/[^\/]+\.[a-z]{2,}(\/|$)/i;
  if (!domainPattern.test(url)) {
    url = `${url}.com`;
  }

  return url.replace(/^https?:\/\//i, "https://").replace(/^www\./i, "");
};

const isValidWebsite = (url: string) => {
  const normalized = normalizeUrlForComparison(url);

  if (
    blockedURLS.some(
      (blocked) => normalized === blocked || normalized.endsWith(`.${blocked}`)
    )
  ) {
    console.log(`Blocked URL: ${url}`);
    return false;
  }

  return url.includes(".");
};

const cleanEmail = (email: string) => email.replace(/\?subject=.*/, "");

const getLinks = async (textArray: string[]) => {
  try {
    const prompt = `
    - Extract only employer or company links from the text.
    - ❌ IGNORE reference links, competitor brands, inspirational designs and websites to clone. 
    - ❌ IGNORE if the link if the person is out-sourcing work e.g: looking for freelancer to help our clients work 'somecompany'. 
    - ✅ If the employer states their own company site or social, extract it.

    - Return JSON: {"websites":[], "social_links":[]}.

    Input:
    ${textArray.join("\n\n")}
`;

    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: modelJobScraper,
      max_tokens: 500,
      temperature: 0.4,
    });

    let result = response.choices[0]?.message?.content || "";

    // extract JSON if response has extra text
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = jsonMatch[0];
    }

    let extractedData;
    try {
      extractedData = JSON.parse(result);
    } catch (err) {
      return null;
    }

    let websites = extractedData.websites || [];
    let social_links = extractedData.social_links || [];

    websites = websites.map((url: string) =>
      url.startsWith("http") ? url : `https://${url}`
    );

    if (websites.length > 0 || social_links.length > 0) {
      return { websites, social_links };
    }
  } catch (error) {
    console.error(
      "Error extracting contacts or URLs:",
      (error as Error).message
    );
    return null;
  }
};

const scrapeAllWebsites = async (websites: string[]) => {
  const results = await Promise.allSettled(websites.map(scrapeWebsite));
  return results
    .filter((res) => res.status === "fulfilled")
    .map((res) => (res as PromiseFulfilledResult<any>).value);
};

const storeLead = async (
  title: string,
  description: string,
  link: string,
  storeMailsOnly: boolean,
  i: number,
  allWebsites: string[],
  allSocialLinks: string[],
  allEmails: string[]
): Promise<any> => {
  try {
    try {
      const scrapedResults = await scrapeAllWebsites(allWebsites);

      const newEmails = scrapedResults.flatMap(({ emails }) =>
        emails.map((email: string) => cleanEmail(email).toLowerCase())
      );
      const newSocialLinks = scrapedResults.flatMap(
        ({ social_links }) => social_links
      );

      // Deduplicate emails (case-insensitive)
      if (newEmails.length > 0) {
        allEmails = [...new Set([...allEmails, ...newEmails])];
      }

      // Deduplicate social links
      if (newSocialLinks.length > 0) {
        allSocialLinks = [...new Set([...allSocialLinks, ...newSocialLinks])];
      }

      // Perform second scrape if social links exist
      if (allSocialLinks.length > 0) {
        const socialScrapedResults = await scrapeAllWebsites(allSocialLinks);
        const socialEmails = socialScrapedResults.flatMap(({ emails }) =>
          emails.map((email: string) => cleanEmail(email).toLowerCase())
        );

        if (socialEmails.length > 0) {
          allEmails = [...new Set([...allEmails, ...socialEmails])];
        }
      }
    } catch (error) {
      console.error("Error during scraping process:", error);
    }

    let emailResults;

    if (allEmails.length > 0 && allEmails.length < 4) {
      try {
        const template = await generateEmailTemplate(description);

        if (template.subject.trim() !== "" || template.body.trim() !== "") {
          const { data: existingLogs, error: fetchError } = await supabase
            .from("email_logs")
            .select("email");

          if (fetchError) throw fetchError;

          const existingEmails = new Set(
            existingLogs?.map((log) => log.email.toLowerCase())
          );

          emailResults = await Promise.all(
            allEmails.map(async (email) => {
              if (existingEmails.has(email)) {
                console.log(`!! Email already sent to ${email}.`);
                logArray.push(`!! Email already sent to ${email}.`);
                return { email, sent: false };
              }

              try {
                await sendEmail({
                  from: EMAIL_USER,
                  to: email,
                  subject: template.subject,
                  body: template.body,
                });

                await supabase
                  .from("email_logs")
                  .upsert([{ job_link: link, email }]);
                logArray.push(`-- ✓ email sent: ${email}`);
                return { email, sent: true };
              } catch (error) {
                console.error(`-- ✗ email failed: ${email} > ${error}`);
                logArray.push(`-- ✗ email failed: ${email} > ${error}`);
                return { email, sent: false };
              }
            })
          );
          console.log("-- Email sending results:", emailResults);
        } else {
          console.log("!! Blank mail generated");
        }
      } catch (error) {
        console.error("!! Error sending emails:", error);
        logArray.push(`Error sending emails: ${error}`);
      }
    }

    if (allEmails.length === 0 && storeMailsOnly) {
      console.log(`${i}) No emails:`, title + `\n`);
      logArray.push(`!! No emails: ${title}`);
      return;
    }

    const { error: insertError } = await supabase
      .from("leads")
      .insert([
        {
          job_title: title,
          job_desc: description,
          job_link: link,
          social_links: allSocialLinks,
          websites: allWebsites,
          emails: allEmails,
        } as Lead,
      ])
      .select();

    if (insertError) throw insertError;

    console.log(`${i})  ✔️  Lead stored:`, title + `\n`);
    logArray.push(`${i}) ✔️ Lead stored: ${title}`);

    return emailResults;
  } catch (error) {
    console.error("Error storing lead:", error);
    logArray.push(`Error storing lead: ${error}`);
    return null;
  }
};

let lastCallTime = 0;

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const now = Date.now();
  if (now - lastCallTime < 5000) {
    return res
      .status(429)
      .json({ message: "Too many requests. Try again later." });
  }

  lastCallTime = now;

  const { storeMailsOnly } = req.body;

  console.log("\n--- START ---\n");
  logArray.push(`--- START --- ${format(new Date(), "hh:mm a")}`);

  try {
    const { data } = await axios.get(RSS_FEED);

    //   const data = `<rss version="2.0"><channel><title>Upwork Job Feed RSS</title><link>https://farazthewebguy.com</link> <description>RSS feed for Upwork Jobs</description><item>
    //   <title>Wesbite SEO optimisation and social media</title>
    //   <link>https://www.upwork.com/jobs/Logo-designer_~021899751asfas9616d923225998/?referrer_url_path=/nx/search/jobs/</link> <description> Hi, We are looking for develpoer who can work and collaborate on website work at our website saifanees.vercel.app, We want to add more sections, work on about page and fix bugs while adjusting the layout. we would like you to look at some sites we like to see how we can imrove our own. awwwards.com clutch.co duck.design thriveagency.com We need and are actively looking for someone with great portfolio!. </description>
    //   </item></channel></rss> `;

    const items = data.toLowerCase().match(/<item>[\s\S]*?<\/item>/g) || [];
    const leadsEmailResults: { email: string; sent: boolean }[] = [];

    const { data: existingLeads } = await supabase
      .from("leads")
      .select("job_link");
    const existingLinks = new Set(
      existingLeads?.map((lead) => lead.job_link) || []
    );

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const descMatch = item.match(/<description>(.*?)<\/description>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);

      const title = titleMatch ? titleMatch[1] : "";
      const description = descMatch ? descMatch[1] : "";
      const link = linkMatch ? linkMatch[1] : "";

      if (existingLinks.has(link)) {
        console.log(`Lead already exists: ${link} \n`);
        logArray.push(`Lead already exists: ${link} \n`);
        continue;
      }

      const extractedURLs = await getLinks([title, description]);

      let allWebsites: string[] = [];
      let allSocialLinks: string[] = [];
      let allEmails: string[] = [];

      if (extractedURLs) {
        allWebsites = [...new Set([...allWebsites, ...extractedURLs.websites])]
          .map((website) => formatUrl(website))
          .filter(isValidWebsite);

        allSocialLinks = [
          ...new Set([...allSocialLinks, ...extractedURLs.social_links]),
        ]
          .map((link) => formatUrl(link))
          .filter(isValidWebsite);

        if (allWebsites.length !== 0) {
          console.log("-- Websites:", allWebsites);
        }
        if (allSocialLinks.length !== 0) {
          console.log("-- Socials:", allSocialLinks);
        }
      }

      if (
        extractedURLs &&
        (extractedURLs.websites.length > 0 ||
          extractedURLs.social_links.length > 0)
      ) {
        const storedLeadRes: {
          email: string;
          sent: boolean;
        }[] =
          (await storeLead(
            title,
            description,
            link,
            storeMailsOnly,
            i,
            allWebsites,
            allSocialLinks,
            allEmails
          )) || [];
        leadsEmailResults.push(...storedLeadRes);
      }
    }

    console.log(`--- END --- ${format(new Date(), "hh:mm a")}\n`);
    logArray.push(`--- END --- ${format(new Date(), "hh:mm a")}`);

    return res.status(200).json({
      message: "Leads filtered and stored",
      logArray,
      emailResults: leadsEmailResults,
    });
  } catch (error) {
    console.error("Error in filter-and-store:", error);
    res.status(500).json({ message: `Internal server error > ${error}` });
  }
};

export default handler;
