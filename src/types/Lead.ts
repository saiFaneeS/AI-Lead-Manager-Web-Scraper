export type Lead = {
  id?: number;
  created_at?: string;
  job_title: string;
  job_desc: string;
  job_link: string;
  emails: string[];
  phone_numbers: string[];
  websites: string[];
  social_links: string[];
  keywords: string[];
  tags: string[];
};
