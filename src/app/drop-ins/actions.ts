"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { MAX_RECEIPT_BYTES, RECEIPT_MIME_TYPES, siteConfig } from "@/lib/config";
import { hostNewRegistrationEmail, playerReceivedEmail, sendEmail } from "@/lib/email";
import { createReviewToken } from "@/lib/review-token";
import { createServiceClient } from "@/lib/supabase/admin";
import { POSITION_LABELS, SKILL_LABELS, type PlayerPosition, type Registration, type Session, type SkillLevel } from "@/lib/types";

export type RegisterState = {
  error?: string;
  fieldErrors?: Partial<Record<"full_name" | "email" | "phone" | "skill_level" | "position" | "waiver" | "sender_name" | "receipt", string>>;
};

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

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
  const receipt = fd.get("receipt");

  const fieldErrors: RegisterState["fieldErrors"] = {};
  if (input.full_name.length < 2) fieldErrors.full_name = "Enter your full name.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) fieldErrors.email = "Enter a valid email.";
  if (input.phone.replace(/\D/g, "").length < 10) fieldErrors.phone = "Enter a valid phone number.";
  if (!(input.skill_level in SKILL_LABELS)) fieldErrors.skill_level = "Choose your skill level.";
  if (!(input.position in POSITION_LABELS)) fieldErrors.position = "Choose a position.";
  if (!input.waiver) fieldErrors.waiver = "You must accept the rules & waiver to play.";
  if (input.sender_name.length < 2) fieldErrors.sender_name = "Enter the name on the account that sent the e-Transfer.";
  if (!(receipt instanceof File) || receipt.size === 0) fieldErrors.receipt = "Upload your e-Transfer screenshot.";
  else if (!RECEIPT_MIME_TYPES.includes(receipt.type)) fieldErrors.receipt = "Screenshot must be a JPG, PNG, WEBP or HEIC image.";
  else if (receipt.size > MAX_RECEIPT_BYTES) fieldErrors.receipt = "Screenshot must be under 5 MB.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const file = receipt as File;
  const svc = createServiceClient();

  const { data: session } = await svc.from("sessions").select("*").eq("id", sessionId).eq("is_published", true).single<Session>();
  if (!session) return { error: "This session no longer exists." };
  if (new Date(session.starts_at) < new Date()) return { error: "This session has already started." };
  if (session.filled_spots >= session.max_players) return { error: "Sorry — this session just sold out." };

  // 1) Upload receipt to the private bucket.
  const registrationId = randomUUID();
  const receiptPath = `${session.id}/${registrationId}.${EXT[file.type]}`;
  const { error: uploadError } = await svc.storage.from("receipts").upload(receiptPath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    console.error("[register] upload failed", uploadError);
    return { error: "We couldn't upload your screenshot. Please try again." };
  }

  // 2) Create the registration.
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
      amount_cents: session.price_cents,
      receipt_path: receiptPath,
    })
    .select("*")
    .single<Registration>();

  if (insertError || !reg) {
    await svc.storage.from("receipts").remove([receiptPath]);
    if (insertError?.code === "23505")
      return { error: "You've already applied for this session with this email. Watch your inbox for an update." };
    console.error("[register] insert failed", insertError);
    return { error: "Something went wrong saving your registration. Please try again." };
  }

  // 3) Notify the host (one-tap review link) and the player. Failures are logged, not fatal.
  const reviewUrl = `${siteConfig.siteUrl}/review/${createReviewToken(reg.id)}`;
  await Promise.all([sendEmail(hostNewRegistrationEmail(session, reg, reviewUrl)), sendEmail(playerReceivedEmail(session, reg))]);

  redirect(`/drop-ins/submitted?session=${session.id}`);
}
