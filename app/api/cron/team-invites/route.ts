export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { processDueTeamInvites } from "@/lib/team-invite-outbox";

function authorize(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, status: 500, error: "CRON_SECRET not configured" };
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true, status: 200, error: "" };
}

export async function GET(request: NextRequest) {
  const auth = authorize(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const db = await getCloudflareDb();
  if (!db) {
    return Response.json({ error: "D1 database binding missing" }, { status: 500 });
  }

  try {
    const results = await processDueTeamInvites(db);
    return Response.json({
      processed: results.length,
      sent: results.filter((item) => item.status === "sent").length,
      failed: results.filter((item) => item.status === "failed").length,
      skipped: results.filter((item) => item.status === "skipped").length,
    });
  } catch (error) {
    console.error("Team invite outbox cron failed:", error);
    return Response.json({ error: "Errore elaborazione inviti" }, { status: 500 });
  }
}

export const POST = GET;
