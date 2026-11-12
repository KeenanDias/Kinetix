import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { RETENTION } from "@/lib/config";
import { serverEnv } from "@/lib/server-env";
import { createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const BATCH = 100; // Storage remove() accepts up to 1000 paths; keep requests small.

function authorized(req: NextRequest) {
  const secret = serverEnv("CRON_SECRET");
  if (!secret || secret.length < 24 || secret.startsWith("change-me")) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Data retention job, called daily by .github/workflows/cleanup.yml.
 *  1. Deletes payment screenshots 30 days after their session ended.
 *  2. Deletes sessions (and, by cascade, registrations) 12 months after they ended.
 */
export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();
  const now = Date.now();
  const receiptCutoff = new Date(now - RETENTION.receiptDaysAfterSession * DAY_MS).toISOString();
  const dataCutoff = new Date(now - RETENTION.dataMonthsAfterSession * 30.5 * DAY_MS).toISOString();

  // --- 1. Screenshots -------------------------------------------------------
  const { data: oldSessions, error: sessErr } = await svc.from("sessions").select("id").lt("ends_at", receiptCutoff);
  if (sessErr) return fail("load sessions", sessErr);

  let receiptsDeleted = 0;
  const sessionIds = (oldSessions ?? []).map((s) => s.id as string);
  for (let i = 0; i < sessionIds.length; i += BATCH) {
    const { data: regs, error: regErr } = await svc
      .from("registrations")
      .select("id, receipt_path")
      .in("session_id", sessionIds.slice(i, i + BATCH))
      .is("receipt_deleted_at", null);
    if (regErr) return fail("load registrations (has migration 0003 been run?)", regErr);

    for (let j = 0; j < (regs ?? []).length; j += BATCH) {
      const chunk = regs!.slice(j, j + BATCH);
      const { error: rmErr } = await svc.storage.from("receipts").remove(chunk.map((r) => r.receipt_path as string));
      if (rmErr) return fail("delete screenshots", rmErr);
      const { error: markErr } = await svc
        .from("registrations")
        .update({ receipt_deleted_at: new Date().toISOString() })
        .in("id", chunk.map((r) => r.id as string));
      if (markErr) return fail("mark screenshots deleted", markErr);
      receiptsDeleted += chunk.length;
    }
  }

  // --- 1b. Screenshots uploaded by players who never finished registering -------------------
  // The browser uploads first, then submits the form. If they give up, the file is unused.
  let unusedUploadsDeleted = 0;
  const { data: folders, error: folderErr } = await svc.storage.from("receipts").list("", { limit: 1000 });
  if (folderErr) return fail("list screenshot folders", folderErr);
  for (const folder of folders ?? []) {
    if (folder.id) continue; // a file at the top level, not a session folder
    const { data: files, error: filesErr } = await svc.storage.from("receipts").list(folder.name, { limit: 1000 });
    if (filesErr) return fail("list screenshots", filesErr);
    const old = (files ?? [])
      .filter((f) => f.id && f.created_at && Date.parse(f.created_at) < now - DAY_MS)
      .map((f) => `${folder.name}/${f.name}`);
    for (let i = 0; i < old.length; i += BATCH) {
      const chunk = old.slice(i, i + BATCH);
      const { data: used, error: usedErr } = await svc.from("registrations").select("receipt_path").in("receipt_path", chunk);
      if (usedErr) return fail("check screenshot usage", usedErr);
      const inUse = new Set((used ?? []).map((r) => r.receipt_path as string));
      const unused = chunk.filter((p) => !inUse.has(p));
      if (unused.length === 0) continue;
      const { error: rmErr } = await svc.storage.from("receipts").remove(unused);
      if (rmErr) return fail("delete unused screenshots", rmErr);
      unusedUploadsDeleted += unused.length;
    }
  }

  // --- 2. Everything else, after 12 months --------------------------------------
  // Only sessions whose screenshots are all gone, so no files are ever orphaned.
  const { data: expired, error: expErr } = await svc.from("sessions").select("id").lt("ends_at", dataCutoff);
  if (expErr) return fail("load expired sessions", expErr);
  let sessionsDeleted = 0;
  for (const { id } of expired ?? []) {
    const { count } = await svc
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("session_id", id)
      .is("receipt_deleted_at", null);
    if ((count ?? 0) > 0) continue;
    const { error: delErr } = await svc.from("sessions").delete().eq("id", id);
    if (delErr) return fail("delete expired session", delErr);
    sessionsDeleted++;
  }

  console.info(`[cleanup] receipts deleted: ${receiptsDeleted}, unused uploads deleted: ${unusedUploadsDeleted}, sessions deleted: ${sessionsDeleted}`);
  return NextResponse.json({ ok: true, receiptsDeleted, unusedUploadsDeleted, sessionsDeleted });
}

function fail(step: string, error: unknown) {
  console.error(`[cleanup] ${step} failed`, error);
  return NextResponse.json({ ok: false, error: `Failed to ${step}` }, { status: 500 });
}
