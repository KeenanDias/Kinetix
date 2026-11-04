export const siteConfig = {
  name: "Kinetix",
  tagline: "Volleyball Drop-ins",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  timezone: process.env.NEXT_PUBLIC_TIMEZONE ?? "America/Toronto",
  hostName: process.env.NEXT_PUBLIC_HOST_NAME ?? "Harsh",
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  etransfer: {
    email: process.env.NEXT_PUBLIC_ETRANSFER_EMAIL ?? "payments@kinetix.example.com",
    question: process.env.NEXT_PUBLIC_ETRANSFER_QUESTION ?? "What is the business name?",
    answer: process.env.NEXT_PUBLIC_ETRANSFER_ANSWER ?? "kinetix",
  },
} as const;

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
export const RECEIPT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
