import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/admin/actions";
import { getAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="min-h-dvh bg-slate-100">
      <header className="sticky top-0 z-30 bg-brand-900 text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <Image src="/kinetix-logo.png" alt="" width={32} height={32} className="size-8 rounded-full" />
            <span className="font-display text-lg font-bold uppercase">Kinetix <span className="text-volt-400">Host</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-white/70 sm:inline">{admin.user.email}</span>
            <form action={signOut}>
              <button className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium hover:bg-white/10">
                <LogOut className="size-4" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
