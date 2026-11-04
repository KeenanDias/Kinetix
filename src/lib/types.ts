export type RegistrationStatus = "pending" | "approved" | "waitlist" | "rejected";
export type SkillLevel = "beginner" | "intermediate" | "intermediate_plus" | "advanced";
export type PlayerPosition = "setter" | "outside" | "opposite" | "middle" | "libero" | "any";

/** Columns visible to the public (anon role). */
export type PublicSession = {
  id: string;
  code: string;
  starts_at: string;
  ends_at: string;
  venue_name: string;
  venue_address: string;
  skill_level: SkillLevel;
  price_cents: number;
  max_players: number;
  filled_spots: number;
};

export type Session = PublicSession & {
  court: string | null;
  arrival_info: string | null;
  is_published: boolean;
  created_at: string;
};

export type Registration = {
  id: string;
  session_id: string;
  full_name: string;
  email: string;
  phone: string;
  skill_level: SkillLevel;
  position: PlayerPosition;
  sender_name: string;
  amount_cents: number;
  receipt_path: string;
  status: RegistrationStatus;
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export const PUBLIC_SESSION_COLUMNS =
  "id, code, starts_at, ends_at, venue_name, venue_address, skill_level, price_cents, max_players, filled_spots";

export const SKILL_LABELS: Record<SkillLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  intermediate_plus: "Intermediate+",
  advanced: "Advanced",
};

export const POSITION_LABELS: Record<PlayerPosition, string> = {
  setter: "Setter",
  outside: "Outside Hitter",
  opposite: "Opposite",
  middle: "Middle Blocker",
  libero: "Libero / DS",
  any: "No preference",
};

export const STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending: "Pending Review",
  approved: "Approved",
  waitlist: "Waitlist",
  rejected: "Rejected",
};
