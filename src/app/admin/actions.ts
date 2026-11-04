"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { zonedTimeToUtc } from "@/lib/format";
import { changeRegistrationStatus } from "@/lib/registrations";
import { createClient, getAdmin } from "@/lib/supabase/server";
import { SKILL_LABELS, type RegistrationStatus, type SkillLevel } from "@/lib/types";

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
export async function createSession(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await getAdmin();
  if (!admin) return { error: "Please sign in again." };

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
  if (!Number.isInteger(maxPlayers) || maxPlayers < 1 || maxPlayers > 200) return { error: "Max players must be 1–200." };
  if (!(skill in SKILL_LABELS)) return { error: "Choose a skill requirement." };
  if (!Number.isFinite(duration) || duration < 30 || duration > 480) return { error: "Duration must be 30–480 minutes." };

  const startsAt = zonedTimeToUtc(date, time);
  const endsAt = new Date(startsAt.getTime() + duration * 60_000);
  const code = `KX${date.slice(5, 7)}${date.slice(8, 10)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

  const { error } = await admin.supabase.from("sessions").insert({
    code,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    venue_name: venueName,
    venue_address: venueAddress,
    court: str(fd, "court") || null,
    arrival_info: str(fd, "arrival_info") || null,
    skill_level: skill,
    price_cents: Math.round(price * 100),
    max_players: maxPlayers,
  });
  if (error) {
    console.error("[createSession]", error);
    return { error: "Couldn't create the session." };
  }
  revalidatePath("/admin");
  revalidatePath("/drop-ins");
  revalidatePath("/");
  return { success: `Session ${code} created.` };
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
