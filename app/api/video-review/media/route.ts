export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { getTaskMediaBucket } from "@/lib/cloudflare-r2";
import { r2VideoObjectKey } from "@/lib/video-node";

const enc = new TextEncoder();

function b64urlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const bin = atob(padded);
  return new Uint8Array([...bin].map((char) => char.charCodeAt(0)));
}

async function hmacHex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function parseRange(header: string | null) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(header || ""));
  if (!match) return null;
  const offset = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : undefined;
  if (
    !Number.isFinite(offset) ||
    (end !== undefined && !Number.isFinite(end))
  ) {
    return null;
  }
  return {
    offset,
    length: end === undefined ? undefined : Math.max(0, end - offset + 1),
  };
}

function fallbackContentType(objectKey: string) {
  const key = objectKey.toLowerCase();
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg";
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".webp")) return "image/webp";
  if (key.endsWith(".gif")) return "image/gif";
  if (key.endsWith(".heic")) return "image/heic";
  if (key.endsWith(".heif")) return "image/heif";
  if (key.endsWith(".webm")) return "video/webm";
  if (key.endsWith(".mov")) return "video/quicktime";
  return "video/mp4";
}

export async function GET(request: NextRequest) {
  const secret = process.env.VIDEO_NODE_SIGNING_SECRET || "";
  if (!secret)
    return new Response("media signing non configurato", { status: 503 });

  const url = new URL(request.url);
  const k = url.searchParams.get("k") || "";
  const exp = Number(url.searchParams.get("exp") || 0);
  const sig = url.searchParams.get("sig") || "";
  if (!k || !exp || !sig)
    return new Response("firma mancante", { status: 403 });
  if (exp < Math.floor(Date.now() / 1000))
    return new Response("link scaduto", { status: 403 });

  const expected = await hmacHex(secret, `${k}.${exp}`);
  if (expected !== sig)
    return new Response("firma non valida", { status: 403 });

  const storageKey = new TextDecoder().decode(b64urlDecode(k));
  if (!storageKey.startsWith("r2://"))
    return new Response("media non R2", { status: 400 });

  const bucket = await getTaskMediaBucket();
  if (!bucket) return new Response("storage non configurato", { status: 503 });

  const objectKey = r2VideoObjectKey(storageKey);
  const range = parseRange(request.headers.get("range"));
  const object = await bucket.get(objectKey, range ? { range } : undefined);
  if (!object) return new Response("media non trovato", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, max-age=21600");
  headers.set(
    "Content-Type",
    headers.get("Content-Type") || fallbackContentType(objectKey),
  );
  headers.set("ETag", object.httpEtag || "");
  if (url.searchParams.get("dl") === "1") {
    headers.set(
      "Content-Disposition",
      `attachment; filename="${objectKey.split("/").pop() || "media.bin"}"`,
    );
  }

  const size = Number(object.size || 0);
  if (range && size) {
    const offset = range.offset;
    const length = Number(
      object.range?.length || range.length || Math.max(0, size - offset),
    );
    const end = Math.min(size - 1, offset + length - 1);
    headers.set("Content-Range", `bytes ${offset}-${end}/${size}`);
    headers.set("Content-Length", String(Math.max(0, end - offset + 1)));
    return new Response(object.body, { status: 206, headers });
  }
  if (size) headers.set("Content-Length", String(size));
  return new Response(object.body, { headers });
}
