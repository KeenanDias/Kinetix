"use client";

import { useActionState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { signIn, type ActionState } from "@/app/admin/actions";
import { Button } from "../ui/button";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, {} as ActionState);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input-base" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input-base" />
      </div>
      {state.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-5 animate-spin" /> : <LogIn className="size-5" />} Sign in
      </Button>
    </form>
  );
}
