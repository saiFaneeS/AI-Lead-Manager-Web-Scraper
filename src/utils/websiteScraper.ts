import axios from "axios";
import * as cheerio from "cheerio";

interface ScrapedData {
  emails: string[];
  social_links: string[];
}

const visitedPages = new Set<string>();

export async function scrapeWebsite(url: string): Promise<ScrapedData> {
  try {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    visitedPages.add(fullUrl);

    const results = await scrapePage(fullUrl);

    if (results.emails.length === 0) {
      const additionalPages = await findRelevantPages(fullUrl);
      for (const page of additionalPages) {
        if (visitedPages.has(page)) continue;
        visitedPages.add(page);

        const pageResults = await scrapePage(page);
        results.emails.push(...pageResults.emails);
        results.social_links.push(...pageResults.social_links);

        if (results.emails.length > 0) break;
      }
    }

    // Deduplicate
    results.emails = [...new Set(results.emails.map((email) => email.trim()))];
    results.social_links = [
      ...new Set(results.social_links.map((link) => link.trim())),
    ];

    return results;
  } catch (error) {
    console.error(
      `!! Failed to scrape website ${url}:`,
      (error as Error).message
    );
    return { emails: [], social_links: [] };
  }
}

async function scrapePage(url: string): Promise<ScrapedData> {
  try {
    const { data } = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
      },
    });

    const $ = cheerio.load(data);

    const emailPattern =
      /(?<=\s|^)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?=\s|$|[^a-zA-Z0-9])/g;

    const results: ScrapedData = {
      emails: [],
      social_links: [],
    };

    // 1️⃣ Extract only mailto emails
    $("a[href^='mailto:']").each((_, element) => {
      const href = $(element).attr("href");
      if (href) {
        const email = href.replace("mailto:", "").trim();
        if (email) results.emails.push(email);
      }
    });

    // 2️⃣ If no mailto, use regex
    if (results.emails.length === 0) {
      $("a, span, p, div").each((_, element) => {
        const text = $(element).text().trim();
        const emails = text.match(emailPattern);
        if (emails) results.emails.push(...emails);
      });
    }

    // Search in script & meta tags too
    $("script, meta").each((_, element) => {
      const content = $(element).html() || $(element).attr("content") || "";
      const emails = content.match(emailPattern);
      if (emails) results.emails.push(...emails);
    });

    // 3️⃣ social links
    $("a, span, p, div").each((_, element) => {
      const href = $(element).attr("href")?.toLowerCase().trim() || "";
      if (isSpecificSocialLink(href)) {
        results.social_links.push(
          href.startsWith("http") ? href : `https://${href.replace(/^\/+/, "")}`
        );
      }
    });
    return results;
  } catch (error) {
    console.error(`!! Failed to scrape ${url}:`, (error as Error).message);
    return { emails: [], social_links: [] };
  }
}

async function findRelevantPages(url: string): Promise<string[]> {
  try {
    const { data } = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
      },
    });

    const $ = cheerio.load(data);
    const relevantPages: string[] = [];

    const keywords = ["contact", "about", "team", "support"];

    $("a[href]").each((_, element) => {
      const href = $(element).attr("href");
      if (href) {
        const lowerHref = href.toLowerCase();
        if (keywords.some((keyword) => lowerHref.includes(keyword))) {
          const fullHref = href.startsWith("http")
            ? href
            : `${url.replace(/\/$/, "")}/${href.replace(/^\//, "")}`;
          relevantPages.push(fullHref);
        }
      }
    });

    return relevantPages;
  } catch (error) {
    console.error(
      `!! Failed to find relevant pages on ${url}:`,
      (error as Error).message
    );
    return [];
  }
}

// Social Link Helper
const genericSocialDomains = [
  "instagram.com",
  "facebook.com",
  "linkedin.com",
  "tiktok.com",
  "threads.net",
];
const isSpecificSocialLink = (url: string) => {
  const normalizedUrl = url.toLowerCase().replace(/^https?:\/\/(www\.)?/, "");
  return genericSocialDomains.some((domain) =>
    normalizedUrl.startsWith(domain)
  );
};
