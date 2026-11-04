import Image from "next/image";
import { LoginForm } from "@/components/admin/login-form";

export const metadata = { title: "Admin Login" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center bg-brand-900 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <Image src="/kinetix-logo.png" alt="Kinetix" width={64} height={64} className="size-16 rounded-full" priority />
          <h1 className="mt-3 font-display text-2xl font-bold uppercase text-brand-900">Host Portal</h1>
          <p className="text-sm text-slate-500">Sign in to review drop-in registrations</p>
        </div>
        <LoginForm next={next ?? "/admin"} />
      </div>
    </main>
  );
}
