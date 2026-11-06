import { ChevronDown, Footprints, RotateCw, ShieldAlert, Signal, Timer } from "lucide-react";
import { SKILL_LABELS, type SkillLevel } from "@/lib/types";

const SKILL_EXPECTATIONS: Record<SkillLevel, string> = {
  beginner: "New to the game or rusty. Focus is on learning, rallies and having fun.",
  intermediate: "Consistent passing and serving, knows basic positions and rotations.",
  intermediate_plus: "Controlled overhand serve, can pass a hard-driven ball, comfortable with 5-1 or 6-2 systems and transitions.",
  advanced: "Competitive club/varsity level. Fast-paced play, specialized positions, strong reads and attacks.",
};

export function RulesCallout({ skill }: { skill: SkillLevel }) {
  const rules = [
    { icon: Signal, title: `Skill level: ${SKILL_LABELS[skill]}`, body: SKILL_EXPECTATIONS[skill] + " Please be honest — balanced teams mean better games for everyone." },
    { icon: RotateCw, title: "Rotation & play", body: "Teams rotate every game; winners stay up to 2 games max. Standard indoor rules, rally scoring to 25. Call your own lines and touches honestly." },
    { icon: Footprints, title: "Court shoes required", body: "Clean, non-marking indoor shoes only — no outdoor shoes on the court. Knee pads recommended." },
    { icon: ShieldAlert, title: "Safety", body: "No going under the net into the opposing court. Call \"ball on\" for stray balls and stop play. Report any injury to the host." },
    { icon: Timer, title: "Arrival & cancellations", body: "Arrive 10 minutes early to warm up. Cancel at least 24h before to be eligible for a refund or transfer. No-shows are not refunded." },
  ];

  return (
    <details className="group rounded-2xl border-2 border-ink bg-white shadow-[4px_4px_0_0_var(--color-ink)]" open>
      <summary className="flex min-h-14 list-none items-center justify-between gap-3 rounded-2xl p-4 font-display text-xl font-bold uppercase text-ink transition-colors hover:bg-surface [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <ShieldAlert className="size-5 text-flame-500" />
          Rules &amp; skill expectations
        </span>
        <ChevronDown className="size-5 text-slate-500 transition-transform group-open:rotate-180" />
      </summary>
      <ul className="space-y-4 px-4 pb-5">
        {rules.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3">
            <Icon className="mt-0.5 size-5 shrink-0 text-brand-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              <p className="text-sm text-slate-600">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
