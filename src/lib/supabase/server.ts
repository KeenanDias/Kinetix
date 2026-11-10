import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

/** Cookie-aware client: acts as the signed-in admin (or anon). RLS applies. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — the proxy refreshes the session instead.
        }
      },
    },
  });
}

/**
 * Returns the signed-in user if they are listed in `public.admins`, otherwise null.
 * Cached per request (layout + page + action share one result), and the two checks run in parallel.
 */
export const getAdmin = cache(async () => {
  const supabase = await createClient();
  const [{ data: userData }, { data: isAdmin }] = await Promise.all([supabase.auth.getUser(), supabase.rpc("is_admin")]);
  const user = userData.user;
  return user && isAdmin ? { supabase, user } : null;
});
