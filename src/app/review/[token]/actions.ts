"use server";

import { revalidatePath } from "next/cache";
import { changeRegistrationStatus } from "@/lib/registrations";
import { verifyReviewToken } from "@/lib/review-token";
import { createServiceClient } from "@/lib/supabase/admin";
import type { RegistrationStatus } from "@/lib/types";

export type ReviewState = { error?: string; done?: RegistrationStatus };

const ALLOWED: RegistrationStatus[] = ["approved", "rejected", "waitlist"];

/** One-tap review from the host's email. The signed token is the credential. */
export async function reviewByToken(token: string, _prev: ReviewState, fd: FormData): Promise<ReviewState> {
  const verified = verifyReviewToken(token);
  if (!verified) return { error: "This review link is invalid or expired. Log in to the admin portal instead." };

  const status = String(fd.get("status")) as RegistrationStatus;
  if (!ALLOWED.includes(status)) return { error: "Unknown action." };
  const note = String(fd.get("note") ?? "").trim() || null;

  const result = await changeRegistrationStatus(createServiceClient(), verified.registrationId, status, note);
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin", "layout");
  revalidatePath("/drop-ins");
  revalidatePath("/");
  return { done: status };
}
