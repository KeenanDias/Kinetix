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
    { icon: Signal, title: `Skill level: ${SKILL_LABELS[skill]}`, body: SKILL_EXPECTATIONS[skill] + " Please be honest about your level, because balanced teams make better games for everyone." },
    { icon: RotateCw, title: "Rotation & play", body: "Teams rotate every game, and winners stay on for a maximum of 2 games. We play standard indoor rules with rally scoring to 25. Call your own lines and touches honestly." },
    { icon: Footprints, title: "Court shoes required", body: "Clean, non-marking indoor shoes only. Outdoor shoes are not allowed on the court. Knee pads are recommended." },
    { icon: ShieldAlert, title: "Safety", body: "Never go under the net into the other team's court. If a stray ball comes onto the court, call \"ball\" right away. Play stops and the point is replayed. Report any injury to the host." },
    { icon: Timer, title: "Arrival & cancellations", body: "Arrive 10 minutes early to warm up. Cancel at least 24 hours before the session to be eligible for a refund or transfer. No-shows are not refunded." },
  ];

  return (
    <details className="group rounded-md border border-volt-400/50 bg-volt-400/10 open:bg-white" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold text-brand-900 [&::-webkit-details-marker]:hidden">
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
