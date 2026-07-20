export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { getTaskMediaBucket } from "@/lib/cloudflare-r2";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import { canAccessVideo } from "@/lib/video-review-acl";
import { r2VideoObjectKey } from "@/lib/video-node";

async function contextFor(id: string) {
  const db = await getCloudflareDb();
  const bucket = await getTaskMediaBucket();
  if (!db || !bucket)
    return {
      error: Response.json(
        { error: "Storage video non configurato" },
        { status: 500 },
      ),
    };
  const user = await requireClerkUser();
  if (!user)
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  const principal = await ensureWorkspacePrincipal(db, user);
  if (!(await canAccessVideo(db, principal, id))) {
    return {
      error: Response.json({ error: "Video non trovato" }, { status: 404 }),
    };
  }
  const video: any = await db
    .prepare(
      `SELECT id, storage_key, status FROM vr_videos WHERE id = ? AND organization_id = ? LIMIT 1`,
    )
    .bind(id, principal.organizationId)
    .first();
  if (
    !video ||
    video.status !== "uploading" ||
    !String(video.storage_key || "").startsWith("r2://")
  ) {
    return {
      error: Response.json(
        { error: "Upload multipart non disponibile" },
        { status: 400 },
      ),
    };
  }
  return { db, bucket, principal, video };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await contextFor(id);
  if ("error" in ctx) return ctx.error;

  const uploadId = request.nextUrl.searchParams.get("uploadId") || "";
  const partNumber = Number(
    request.nextUrl.searchParams.get("partNumber") || 0,
  );
  if (!uploadId || !Number.isInteger(partNumber) || partNumber < 1) {
    return Response.json({ error: "Parte upload non valida" }, { status: 400 });
  }
  if (!request.body)
    return Response.json({ error: "Chunk mancante" }, { status: 400 });

  const key = r2VideoObjectKey(String(ctx.video.storage_key));
  const multipart = ctx.bucket.resumeMultipartUpload(key, uploadId);
  const part = await multipart.uploadPart(partNumber, request.body);
  return Response.json({ ok: true, part });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await contextFor(id);
  if ("error" in ctx) return ctx.error;

  const body = await request.json().catch(() => ({}) as any);
  const uploadId = String(body?.uploadId || "");
  if (!uploadId)
    return Response.json({ error: "Upload ID mancante" }, { status: 400 });

  const key = r2VideoObjectKey(String(ctx.video.storage_key));
  const multipart = ctx.bucket.resumeMultipartUpload(key, uploadId);

  if (body?.action === "abort") {
    await multipart.abort();
    return Response.json({ ok: true });
  }

  const parts = Array.isArray(body?.parts) ? body.parts : [];
  if (!parts.length)
    return Response.json({ error: "Parti upload mancanti" }, { status: 400 });
  const object = await multipart.complete(parts);
  return Response.json({ ok: true, key: object.key, etag: object.httpEtag });
}
