import "server-only";
import { createClient } from "@supabase/supabase-js";
import { PUBLIC_SESSION_COLUMNS, type PublicSession } from "./types";

/** Anonymous client for public reads — RLS + column grants hide private fields. */
function anonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

export async function getUpcomingSessions(): Promise<PublicSession[]> {
  const { data, error } = await anonClient()
    .from("sessions")
    .select(PUBLIC_SESSION_COLUMNS)
    .eq("is_published", true)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(100);
  if (error) {
    console.error("[sessions] list failed", error);
    return [];
  }
  return data as PublicSession[];
}

export async function getPublicSession(id: string): Promise<PublicSession | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await anonClient()
    .from("sessions")
    .select(PUBLIC_SESSION_COLUMNS)
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();
  return (data as PublicSession | null) ?? null;
}
