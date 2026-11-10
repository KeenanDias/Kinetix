"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendEmails, sessionCancelledEmail, sessionUpdatedEmail, type Mail, type SessionChange } from "@/lib/email";
import { formatDate, formatTimeRange, zonedTimeToUtc } from "@/lib/format";
import { changeRegistrationStatus } from "@/lib/registrations";
import { createClient, getAdmin } from "@/lib/supabase/server";
import { SKILL_LABELS, type Registration, type RegistrationStatus, type Session, type SkillLevel } from "@/lib/types";

export type ActionState = { error?: string; success?: string };

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function signIn(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: str(fd, "email"), password: str(fd, "password") });
  if (error) return { error: "Wrong email or password." };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    await supabase.auth.signOut();
    return { error: "This account isn't an admin." };
  }
  const next = str(fd, "next");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
type SessionValues = {
  starts_at: string;
  ends_at: string;
  venue_name: string;
  venue_address: string;
  court: string | null;
  arrival_info: string | null;
  skill_level: SkillLevel;
  price_cents: number;
  max_players: number;
};

/** Shared validation for the create and edit forms (same field names). */
function parseSessionForm(fd: FormData): { values: SessionValues; date: string } | { error: string } {
  const date = str(fd, "date");
  const time = str(fd, "time");
  const duration = Number(str(fd, "duration_minutes") || 120);
  const price = Number(str(fd, "price"));
  const maxPlayers = Number(str(fd, "max_players"));
  const skill = str(fd, "skill_level") as SkillLevel;
  const venueName = str(fd, "venue_name");
  const venueAddress = str(fd, "venue_address");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { error: "Pick a date and start time." };
  if (!venueName || !venueAddress) return { error: "Venue name and address are required." };
  if (!Number.isFinite(price) || price < 0) return { error: "Enter a valid price." };
  if (!Number.isInteger(maxPlayers) || maxPlayers < 1 || maxPlayers > 200) return { error: "Max players must be between 1 and 200." };
  if (!(skill in SKILL_LABELS)) return { error: "Choose a skill requirement." };
  if (!Number.isFinite(duration) || duration < 30 || duration > 480) return { error: "Duration must be between 30 and 480 minutes." };

  const startsAt = zonedTimeToUtc(date, time);
  return {
    date,
    values: {
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + duration * 60_000).toISOString(),
      venue_name: venueName,
      venue_address: venueAddress,
      court: str(fd, "court") || null,
      arrival_info: str(fd, "arrival_info") || null,
      skill_level: skill,
      price_cents: Math.round(price * 100),
      max_players: maxPlayers,
    },
  };
}

function revalidateSessionPages(sessionId?: string) {
  revalidatePath("/admin");
  if (sessionId) revalidatePath(`/admin/sessions/${sessionId}`);
  revalidatePath("/drop-ins");
  revalidatePath("/");
}

export async function createSession(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await getAdmin();
  if (!admin) return { error: "Please sign in again." };

  const parsed = parseSessionForm(fd);
  if ("error" in parsed) return parsed;
  const { date, values } = parsed;
  const code = `KX${date.slice(5, 7)}${date.slice(8, 10)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

  const { error } = await admin.supabase.from("sessions").insert({ code, ...values });
  if (error) {
    console.error("[createSession]", error);
    return { error: "Couldn't create the session." };
  }
  revalidateSessionPages();
  return { success: `Session ${code} created.` };
}

/** Player-facing differences between two versions of a session, for the update email. */
function describeChanges(before: Session, after: Session): SessionChange[] {
  const changes: SessionChange[] = [];
  const whenText = (s: Session) => `${formatDate(s.starts_at, { weekday: "long", month: "long" })}, ${formatTimeRange(s.starts_at, s.ends_at)}`;
  if (before.starts_at !== after.starts_at || before.ends_at !== after.ends_at)
    changes.push({ label: "Date & time", before: whenText(before), after: whenText(after) });
  if (before.venue_name !== after.venue_name || before.venue_address !== after.venue_address)
    changes.push({
      label: "Location",
      before: `${before.venue_name}, ${before.venue_address}`,
      after: `${after.venue_name}, ${after.venue_address}`,
    });
  if (before.skill_level !== after.skill_level)
    changes.push({ label: "Skill level", before: SKILL_LABELS[before.skill_level], after: SKILL_LABELS[after.skill_level] });
  if ((before.court ?? "") !== (after.court ?? ""))
    changes.push({ label: "Court", before: before.court ?? "", after: after.court ?? "", private: true });
  if ((before.arrival_info ?? "") !== (after.arrival_info ?? ""))
    changes.push({ label: "Arrival info", before: before.arrival_info ?? "", after: after.arrival_info ?? "", private: true });
  // Price and max players aren't emailed: existing players have already paid, and capacity isn't their concern.
  return changes;
}

/** Edit an upcoming session, optionally emailing everyone registered (pending, approved, waitlist). */
export async function updateSession(sessionId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await getAdmin();
  if (!admin) return { error: "Please sign in again." };

  const parsed = parseSessionForm(fd);
  if ("error" in parsed) return parsed;
  const { values } = parsed;

  const { data: before } = await admin.supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle<Session>();
  if (!before) return { error: "Session not found." };
  if (new Date(before.starts_at) <= new Date()) return { error: "This session has already started, so it can't be edited." };
  if (new Date(values.starts_at) <= new Date()) return { error: "The new start time is in the past." };
  if (values.max_players < before.filled_spots)
    return { error: `${before.filled_spots} players are already approved, so max players can't be lower than that.` };

  const { data: after, error } = await admin.supabase.from("sessions").update(values).eq("id", sessionId).select("*").single<Session>();
  if (error || !after) {
    console.error("[updateSession]", error);
    return { error: "Couldn't save the changes." };
  }
  revalidateSessionPages(sessionId);

  const changes = describeChanges(before, after);
  const notify = fd.get("notify") === "on";
  const message = str(fd, "message") || null;
  if (changes.length === 0) return { success: "Saved. Nothing players need to know about changed, so no emails were sent." };
  if (!notify) return { success: "Saved. Players were not emailed." };

  const { data: regs, error: regsError } = await admin.supabase
    .from("registrations")
    .select("*")
    .eq("session_id", sessionId)
    .in("status", ["pending", "approved", "waitlist"])
    .returns<Registration[]>();
  if (regsError) {
    console.error("[updateSession] load registrations", regsError);
    return { error: "Saved, but couldn't load registrations to email them." };
  }
  const mails = (regs ?? []).map((r) => sessionUpdatedEmail(after, r, changes, message)).filter((m): m is Mail => m !== null);
  if (mails.length === 0) return { success: "Saved. No registered players needed an update email." };
  const sent = await sendEmails(mails);
  return sent === mails.length
    ? { success: `Saved and emailed ${sent} registered player${sent === 1 ? "" : "s"}.` }
    : { error: `Saved, but only ${sent} of ${mails.length} update emails were sent. Check the server log.` };
}

export async function setSessionPublished(sessionId: string, published: boolean) {
  const admin = await getAdmin();
  if (!admin) return;
  await admin.supabase.from("sessions").update({ is_published: published }).eq("id", sessionId);
  revalidatePath("/admin");
  revalidatePath(`/admin/sessions/${sessionId}`);
  revalidatePath("/drop-ins");
  revalidatePath("/");
}

/**
 * Delete (cancel) a run. Requires the confirm box. Optionally emails everyone registered
 * (pending, approved, waitlist) with the reason and refund/credit instructions.
 * Order: load data, delete screenshots + session, then email, so nobody is told it's
 * cancelled unless the delete actually happened.
 */
export async function deleteSession(sessionId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await getAdmin();
  if (!admin) return { error: "Please sign in again." };
  if (fd.get("confirm") !== "on") return { error: "Tick the box to confirm you want to delete this run." };

  const notify = fd.get("notify") === "on";
  const reason = str(fd, "reason") || null;

  const [{ data: session }, { data: regs, error: regsError }] = await Promise.all([
    admin.supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle<Session>(),
    admin.supabase.from("registrations").select("*").eq("session_id", sessionId).returns<Registration[]>(),
  ]);
  if (!session) return { error: "This run was already deleted." };
  if (regsError) {
    console.error("[deleteSession] load registrations", regsError);
    return { error: "Couldn't load the registrations for this run. Nothing was deleted." };
  }

  // Payment screenshots are private files. Remove them with the run.
  const files = (regs ?? []).filter((r) => !r.receipt_deleted_at).map((r) => r.receipt_path);
  if (files.length) {
    const { error: rmError } = await admin.supabase.storage.from("receipts").remove(files);
    if (rmError) console.error("[deleteSession] screenshot cleanup failed (continuing)", rmError);
  }

  const { error: delError } = await admin.supabase.from("sessions").delete().eq("id", sessionId);
  if (delError) {
    console.error("[deleteSession]", delError);
    return { error: "Couldn't delete this run. Nobody was emailed." };
  }
  revalidateSessionPages(sessionId);

  let emailed = 0;
  if (notify) {
    const active = (regs ?? []).filter((r) => r.status !== "rejected");
    emailed = await sendEmails(active.map((r) => sessionCancelledEmail(session, r, reason)));
  }
  redirect(`/admin?deleted=${encodeURIComponent(session.code)}&emailed=${emailed}`);
}

// ---------------------------------------------------------------------------
// Registration review
// ---------------------------------------------------------------------------
export async function updateRegistrationStatus(
  registrationId: string,
  status: RegistrationStatus,
  note?: string,
): Promise<ActionState> {
  const admin = await getAdmin();
  if (!admin) return { error: "Please sign in again." };

  const result = await changeRegistrationStatus(admin.supabase, registrationId, status, note);
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin", "layout");
  revalidatePath("/drop-ins");
  revalidatePath("/");
  if (!result.changed) return { success: "No change." };
  return {
    success: result.emailed || status === "pending" ? "Updated. Player notified." : "Updated, but the email failed to send.",
  };
}
