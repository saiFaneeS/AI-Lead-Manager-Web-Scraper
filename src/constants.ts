export const sessionTime = 15 * 60;
export const maxLeads = 100;

export const modelKeywordFinder = "llama-3.1-8b-instant";
export const modelJobScraper = "gemma2-9b-it"; // fallback: llama-3.1-8b-instant
export const modelEmailWriter = "llama-3.3-70b-versatile"; // fallback: llama-3.3-70b-specdec

// ENVIRONMENT VARIABLES
export const MY_NAME = "Saif Anees";
export const EMAIL_USER = process.env.EMAIL_USER || ``;
export const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || ``;

export const RSS_FEED = process.env.RSS_FEED || ``;

export const GROQ_API_KEY = process.env.GROQ_API_KEY;

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY;
