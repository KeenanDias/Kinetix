"use client";

import { useRef } from "react";
import { SKILL_LABELS, type SkillLevel } from "@/lib/types";

export type SessionFieldDefaults = {
  date?: string;
  time?: string;
  durationMinutes?: number;
  skill_level?: SkillLevel;
  venue_name?: string;
  venue_address?: string;
  max_players?: number;
  price?: string;
  court?: string | null;
  arrival_info?: string | null;
};

const DURATIONS = [60, 90, 120, 150, 180];

/** Inputs shared by the "create session" and "edit session" forms. Field names match parseSessionForm(). */
export function SessionFields({
  defaults = {},
  recentVenues = [],
}: {
  defaults?: SessionFieldDefaults;
  recentVenues?: { name: string; address: string }[];
}) {
  const addressRef = useRef<HTMLInputElement>(null);
  const duration = defaults.durationMinutes ?? 120;
  const durations = DURATIONS.includes(duration) ? DURATIONS : [...DURATIONS, duration].sort((a, b) => a - b);

  return (
    <>
      <L label="Date"><input name="date" type="date" required defaultValue={defaults.date} className="input-base" /></L>
      <L label="Start time"><input name="time" type="time" required step={300} defaultValue={defaults.time ?? "19:00"} className="input-base" /></L>
      <L label="Duration">
        <select name="duration_minutes" defaultValue={String(duration)} className="input-base">
          {durations.map((m) => (
            <option key={m} value={m}>{m % 60 === 0 ? `${m / 60} hr${m > 60 ? "s" : ""}` : `${Math.floor(m / 60)} hr ${m % 60} min`}</option>
          ))}
        </select>
      </L>
      <L label="Skill requirement">
        <select name="skill_level" defaultValue={defaults.skill_level ?? "intermediate_plus"} className="input-base">
          {Object.entries(SKILL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </L>
      <L label="Venue name" className="sm:col-span-2">
        <input
          name="venue_name"
          required
          defaultValue={defaults.venue_name}
          list={recentVenues.length ? "kx-venues" : undefined}
          placeholder="e.g. Downtown Community Centre"
          className="input-base"
          onChange={(e) => {
            const match = recentVenues.find((v) => v.name === e.target.value);
            if (match && addressRef.current && !addressRef.current.value) addressRef.current.value = match.address;
          }}
        />
        {recentVenues.length > 0 && <datalist id="kx-venues">{recentVenues.map((v) => <option key={v.name} value={v.name} />)}</datalist>}
      </L>
      <L label="Venue address" className="sm:col-span-2">
        <input ref={addressRef} name="venue_address" required defaultValue={defaults.venue_address} placeholder="123 Main St, Toronto, ON" className="input-base" />
      </L>
      <L label="Max players"><input name="max_players" type="number" min={1} max={200} required defaultValue={defaults.max_players ?? 18} className="input-base" /></L>
      <L label="Price per player ($CAD)"><input name="price" type="number" min={0} step="0.01" required defaultValue={defaults.price ?? "15.00"} className="input-base" /></L>
      <L label="Court (private)" hint="Only sent to approved players"><input name="court" defaultValue={defaults.court ?? ""} placeholder="Court 2" className="input-base" /></L>
      <L label="Arrival info (private)" hint="Door code, entrance, parking"><input name="arrival_info" defaultValue={defaults.arrival_info ?? ""} placeholder="Use north doors, code 4821" className="input-base" /></L>
    </>
  );
}

export function L({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
