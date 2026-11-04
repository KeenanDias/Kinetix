import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "./supabase/admin";
import { playerApprovedEmail, playerRejectedEmail, playerWaitlistEmail, sendEmail } from "./email";
import type { Registration, RegistrationStatus, Session } from "./types";

export type StatusChangeResult =
  | { ok: true; changed: boolean; status: RegistrationStatus; emailed: boolean }
  | { ok: false; error: string };

/**
 * Shared by the admin dashboard and the one-tap email review page.
 * `client` decides who is acting: the logged-in admin's client (RLS + is_admin())
 * or the service client (after a review token was verified).
 */
export async function changeRegistrationStatus(
  client: SupabaseClient,
  registrationId: string,
  status: RegistrationStatus,
  note?: string | null,
): Promise<StatusChangeResult> {
  const { data, error } = await client.rpc("set_registration_status", {
    p_registration_id: registrationId,
    p_status: status,
    p_note: note ?? null,
  });

  if (error) {
    if (error.message.includes("SESSION_FULL"))
      return { ok: false, error: "This session is full. Move the player to the waitlist or raise max players." };
    if (error.message.includes("NOT_AUTHORIZED")) return { ok: false, error: "You're not allowed to do that." };
    if (error.message.includes("REGISTRATION_NOT_FOUND")) return { ok: false, error: "Registration not found." };
    console.error("[status] rpc failed", error);
    return { ok: false, error: "Something went wrong updating the registration." };
  }

  const row = (Array.isArray(data) ? data[0] : data) as { previous_status: RegistrationStatus } | undefined;
  const changed = row?.previous_status !== status;
  if (!changed || status === "pending") return { ok: true, changed, status, emailed: false };

  // Load full details (incl. private court/arrival info) for the player email.
  const svc = createServiceClient();
  const { data: reg } = await svc
    .from("registrations")
    .select("*, session:sessions(*)")
    .eq("id", registrationId)
    .single<Registration & { session: Session }>();
  if (!reg) return { ok: true, changed, status, emailed: false };

  const mail =
    status === "approved"
      ? playerApprovedEmail(reg.session, reg)
      : status === "waitlist"
        ? playerWaitlistEmail(reg.session, reg)
        : playerRejectedEmail(reg.session, reg);
  const emailed = await sendEmail(mail);
  return { ok: true, changed, status, emailed };
}
