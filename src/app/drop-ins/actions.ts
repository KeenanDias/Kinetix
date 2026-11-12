"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { MAX_RECEIPT_BYTES, RECEIPT_MIME_TYPES, siteConfig } from "@/lib/config";
import { hostNewRegistrationEmail, playerReceivedEmail, sendEmail } from "@/lib/email";
import { createReviewToken } from "@/lib/review-token";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  MAX_GUESTS,
  MAX_PLAYER_NOTE,
  POSITION_LABELS,
  SKILL_LABELS,
  type PlayerPosition,
  type Registration,
  type Session,
  type SkillLevel,
} from "@/lib/types";

export type RegisterState = {
  error?: string;
  fieldErrors?: Partial<
    Record<
      "full_name" | "email" | "phone" | "skill_level" | "position" | "waiver" | "sender_name" | "receipt" | "guests" | "player_note",
      string
    >
  >;
};

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

const UNAVAILABLE = "Registration is temporarily unavailable. Please try again later or contact us.";

/** Service client, or null (logged) when the host is missing its Supabase settings. */
function serviceClientOrNull() {
  try {
    return createServiceClient();
  } catch (err) {
    console.error("[register] server is missing configuration:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

export type ReceiptUploadTicket = { registrationId: string; path: string; token: string } | { error: string };

/**
 * Step 1 of registering: hands the browser a one-time signed link to upload the e-Transfer
 * screenshot straight to the private `receipts` bucket. The image never passes through this
 * server, which keeps requests small (Cloudflare's firewall blocks large form posts, and the
 * free Workers plan has a tight CPU limit).
 */
export async function startReceiptUpload(sessionId: string, contentType: string, size: number): Promise<ReceiptUploadTicket> {
  if (!RECEIPT_MIME_TYPES.includes(contentType)) return { error: "Screenshot must be a JPG, PNG, WEBP or HEIC image." };
  if (!Number.isFinite(size) || size <= 0 || size > MAX_RECEIPT_BYTES) return { error: "Screenshot must be under 5 MB." };
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return { error: "This session no longer exists." };

  const svc = serviceClientOrNull();
  if (!svc) return { error: UNAVAILABLE };

  const { data: session } = await svc
    .from("sessions")
    .select("id, starts_at, max_players, filled_spots")
    .eq("id", sessionId)
    .eq("is_published", true)
    .maybeSingle<Pick<Session, "id" | "starts_at" | "max_players" | "filled_spots">>();
  if (!session) return { error: "This session no longer exists." };
  if (new Date(session.starts_at) < new Date()) return { error: "This session has already started." };
  if (session.filled_spots >= session.max_players) return { error: "Sorry, this session just sold out." };

  const registrationId = randomUUID();
  const path = `${session.id}/${registrationId}.${EXT[contentType]}`;
  const { data, error } = await svc.storage.from("receipts").createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[register] could not create upload link", error);
    return { error: "We couldn't prepare your screenshot upload. Please try again." };
  }
  return { registrationId, path, token: data.token };
}

export async function submitRegistration(sessionId: string, _prev: RegisterState, fd: FormData): Promise<RegisterState> {
  // Honeypot: bots fill every field. Pretend success.
  if (str(fd, "company")) redirect("/drop-ins/submitted");

  const input = {
    full_name: str(fd, "full_name"),
    email: str(fd, "email").toLowerCase(),
    phone: str(fd, "phone"),
    skill_level: str(fd, "skill_level") as SkillLevel,
    position: (str(fd, "position") || "any") as PlayerPosition,
    waiver: fd.get("waiver") === "on",
    sender_name: str(fd, "sender_name"),
  };
  // The screenshot was already uploaded by the browser (see startReceiptUpload).
  const registrationId = str(fd, "registration_id");
  const receiptPath = str(fd, "receipt_path");
  // Friends the registrant is paying for. Each row is a name + position; rows with a blank name are ignored.
  const rawPositions = fd.getAll("guest_position").map((v) => String(v));
  const guests = fd
    .getAll("guest_name")
    .map((v, i) => ({ name: String(v).replace(/\s+/g, " ").trim(), position: rawPositions[i] ?? "" }))
    .filter((g) => g.name);
  const guestNames = guests.map((g) => g.name);
  const guestPositions = guests.map((g) => g.position as PlayerPosition);
  const sameTeam = guests.length > 0 && fd.get("same_team") === "on";
  // Optional note to the host. Line breaks kept, extra blank lines collapsed.
  const playerNote = str(fd, "player_note").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  const partySize = 1 + guests.length;

  const fieldErrors: RegisterState["fieldErrors"] = {};
  if (guests.length > MAX_GUESTS) fieldErrors.guests = `You can add up to ${MAX_GUESTS} guests.`;
  else if (guests.some((g) => g.name.length < 2 || g.name.length > 80)) fieldErrors.guests = "Enter each guest's full name.";
  else if (guests.some((g) => !(g.position in POSITION_LABELS))) fieldErrors.guests = "Choose a position for each guest.";
  if (input.full_name.length < 2) fieldErrors.full_name = "Enter your full name.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) fieldErrors.email = "Enter a valid email.";
  if (input.phone.replace(/\D/g, "").length < 10) fieldErrors.phone = "Enter a valid phone number.";
  if (!(input.skill_level in SKILL_LABELS)) fieldErrors.skill_level = "Choose your skill level.";
  if (!(input.position in POSITION_LABELS)) fieldErrors.position = "Choose a position.";
  if (!input.waiver) fieldErrors.waiver = "You must accept the rules & waiver to play.";
  if (input.sender_name.length < 2) fieldErrors.sender_name = "Enter the name on the account that sent the e-Transfer.";
  if (playerNote.length > MAX_PLAYER_NOTE) fieldErrors.player_note = `Keep your note under ${MAX_PLAYER_NOTE} characters.`;
  // The path must be the one startReceiptUpload issued for this session: "<session>/<registration id>.<ext>".
  const pathPattern = new RegExp(`^${sessionId}/${registrationId}\\.(jpg|png|webp|heic|heif)$`);
  if (!/^[0-9a-f-]{36}$/i.test(registrationId) || !pathPattern.test(receiptPath))
    fieldErrors.receipt = "Upload your e-Transfer screenshot.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  // A missing SUPABASE_SERVICE_ROLE_KEY on the host would otherwise crash the page.
  const svc = serviceClientOrNull();
  if (!svc) return { error: UNAVAILABLE };

  // Make sure the screenshot actually arrived in storage (and isn't oversized).
  const fileName = receiptPath.slice(sessionId.length + 1);
  const { data: stored, error: listError } = await svc.storage.from("receipts").list(sessionId, { search: registrationId, limit: 5 });
  const uploaded = stored?.find((f) => f.name === fileName);
  if (listError || !uploaded) {
    if (listError) console.error("[register] could not check upload", listError);
    return { fieldErrors: { receipt: "Your screenshot didn't finish uploading. Please choose it again and resubmit." } };
  }
  const uploadedSize = Number((uploaded.metadata as { size?: number } | null)?.size ?? 0);
  if (uploadedSize > MAX_RECEIPT_BYTES) {
    await svc.storage.from("receipts").remove([receiptPath]);
    return { fieldErrors: { receipt: "Screenshot must be under 5 MB." } };
  }

  const { data: session, error: lookupError } = await svc
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("is_published", true)
    .maybeSingle<Session>();
  if (lookupError) {
    // Usually a missing/wrong SUPABASE_SERVICE_ROLE_KEY — don't blame the session.
    console.error("[register] session lookup failed", lookupError);
    return { error: "We couldn't load this session right now. Please try again in a minute." };
  }
  if (!session) return { error: "This session no longer exists." };
  if (new Date(session.starts_at) < new Date()) return { error: "This session has already started." };
  const spotsLeft = session.max_players - session.filled_spots;
  if (spotsLeft <= 0) return { error: "Sorry, this session just sold out." };
  if (partySize > spotsLeft)
    return {
      fieldErrors: {
        guests: `Only ${spotsLeft} spot${spotsLeft === 1 ? " is" : "s are"} left. Remove ${partySize - spotsLeft} guest${
          partySize - spotsLeft === 1 ? "" : "s"
        } to register.`,
      },
    };

  // Create the registration (the screenshot is already in the private bucket).
  const { data: reg, error: insertError } = await svc
    .from("registrations")
    .insert({
      id: registrationId,
      session_id: session.id,
      full_name: input.full_name,
      email: input.email,
      phone: input.phone,
      skill_level: input.skill_level,
      position: input.position,
      waiver_accepted: true,
      sender_name: input.sender_name,
      amount_cents: session.price_cents * partySize,
      receipt_path: receiptPath,
      // Only sent when there are guests, so solo sign-ups still work before migration 0002 is applied.
      ...(guests.length > 0 ? { guest_names: guestNames, guest_positions: guestPositions, same_team: sameTeam } : {}),
      // Only sent when filled in, so sign-ups without a note still work before migration 0006.
      ...(playerNote ? { player_note: playerNote } : {}),
    })
    .select("*")
    .single<Registration>();

  if (insertError || !reg) {
    // The screenshot is kept so a retry can reuse it; unused uploads are removed by the daily cleanup.
    if (insertError?.code === "23505")
      return { error: "You've already applied for this session with this email. Watch your inbox for an update." };
    if (insertError?.code === "PGRST204")
      console.error("[register] guest column missing. Run supabase/migrations 0002 and 0004 in the Supabase SQL editor.");
    console.error("[register] insert failed", insertError);
    return { error: "Something went wrong saving your registration. Please try again." };
  }

  // 3) Notify the host (one-tap review link) and the player. Failures are logged, not fatal.
  // If REVIEW_LINK_SECRET is missing the one-tap link can't be signed. The registration is
  // already saved, so fall back to the admin page link instead of failing the player.
  let reviewUrl = `${siteConfig.siteUrl}/admin/sessions/${session.id}`;
  try {
    reviewUrl = `${siteConfig.siteUrl}/review/${createReviewToken(reg.id)}`;
  } catch (err) {
    console.error("[register] could not create one-tap review link:", err);
  }
  await Promise.all([sendEmail(hostNewRegistrationEmail(session, reg, reviewUrl)), sendEmail(playerReceivedEmail(session, reg))]);

  redirect(`/drop-ins/submitted?session=${session.id}`);
}
