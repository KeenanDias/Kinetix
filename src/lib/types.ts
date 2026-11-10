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
  /** Set when the cleanup job deleted the screenshot (migration 0003). */
  receipt_deleted_at?: string | null;
  /** Friends the registrant paid for (names only). Missing on databases without migration 0002. */
  guest_names?: string[] | null;
  /** guest_positions[i] belongs to guest_names[i] (migration 0004). Empty on older rows. */
  guest_positions?: PlayerPosition[] | null;
  /** Registrant asked for their group to be on one team (migration 0004). */
  same_team?: boolean | null;
  /** 1 + guests. Generated column from migration 0002. */
  party_size?: number | null;
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

export const MAX_GUESTS = 5;

/** Players in a registration (payer + guests). Works before and after migration 0002. */
export function partySize(r: Pick<Registration, "guest_names" | "party_size">) {
  return r.party_size ?? 1 + (r.guest_names?.length ?? 0);
}

/** Guests with their preferred positions ("any" if not recorded). */
export function guestList(r: Pick<Registration, "guest_names" | "guest_positions">) {
  return (r.guest_names ?? []).map((name, i) => ({ name, position: r.guest_positions?.[i] ?? ("any" as PlayerPosition) }));
}

/** "Sam Patel (Setter)", or just the name when there's no preference. */
export function guestLabel(g: { name: string; position: PlayerPosition }) {
  return g.position === "any" ? g.name : `${g.name} (${POSITION_LABELS[g.position]})`;
}

/** All player names in a registration, payer first. */
export function playerNames(r: Pick<Registration, "full_name" | "guest_names">) {
  return [r.full_name, ...(r.guest_names ?? [])];
}