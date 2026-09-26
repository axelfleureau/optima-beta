export const dynamic = "force-dynamic";

/**
 * Card social (1200x630) per consegne il cui primo media vive su R2.
 *
 * Il nodo (Mac Studio) genera normalmente questa card, ma non può leggere
 * R2 (serve solo i byte di NAS/T5): senza questa via il mockup del telefono
 * spariva e restava il placeholder generico. Qui componiamo l'immagine noi,
 * nel Worker, leggendo l'oggetto dal bucket via binding (mai pubblico, mai
 * un secret nell'URL) e senza decodifica video: per i video usiamo il
 * `poster_key` (frame JPG già estratto in upload, vedi
 * app/api/video-review/videos/[id]/poster/route.ts), per le immagini/
 * caroselli il primo media stesso. Nessun ffmpeg = nessun rischio di timeout
 * sul Worker.
 */

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { getTaskMediaBucket } from "@/lib/cloudflare-r2";
import {
  isR2VideoKey,
  preferredVideoStorageKey,
  r2VideoObjectKey,
} from "@/lib/video-node";

const WIDTH = 1200;
const HEIGHT = 630;
const IMAGE_HEADERS = {
  "Content-Type": "image/png",
  // L'URL porta già `?v=` come cache-buster (vedi reviewOgImageUrl): a parità
  // di v il contenuto non cambia mai, quindi va bene una cache lunga.
  "Cache-Control": "public, max-age=604800, immutable",
};

function mese(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(d);
}

function truncate(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function contentTypeFor(objectKey: string) {
  const key = objectKey.toLowerCase();
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

/** Legge un frame R2 e lo incorpora come data URI: Satori non ha bisogno di
 * rifare una richiesta di rete (che il bucket privato rifiuterebbe comunque). */
async function loadFrameDataUri(frameKey: string | null): Promise<string | null> {
  if (!frameKey || !isR2VideoKey(frameKey)) return null;
  try {
    const bucket = await getTaskMediaBucket();
    if (!bucket) return null;
    const objectKey = r2VideoObjectKey(frameKey);
    const object = await bucket.get(objectKey);
    if (!object) return null;
    if (Number(object.size || 0) > 6 * 1024 * 1024) return null; // difesa: mai comporre frame anomali
    const bytes = await object.arrayBuffer();
    return `data:${contentTypeFor(objectKey)};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch {
    return null;
  }
}

function card(opts: {
  title: string;
  client: string | null;
  date: string | null;
  frame: string | null;
}) {
  const title = truncate(opts.title || "Contenuti da approvare", 72);
  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          background:
            "linear-gradient(135deg, #0b0b10 0%, #18101a 55%, #0b0b10 100%)",
          padding: 64,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            paddingRight: opts.frame ? 48 : 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "flex",
                width: 22,
                height: 22,
                borderRadius: 999,
                background: "linear-gradient(135deg, #d6487e, #06b6d4)",
              }}
            />
            <div
              style={{
                display: "flex",
                fontSize: 22,
                fontWeight: 700,
                color: "#f5f5f5",
                letterSpacing: 3,
              }}
            >
              ÓPTIMA
            </div>
          </div>

          {opts.client && (
            <div
              style={{
                display: "flex",
                marginTop: 30,
                fontSize: 24,
                fontWeight: 700,
                color: "#ff8ab6",
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              {truncate(opts.client, 40)}
            </div>
          )}

          <div
            style={{
              display: "flex",
              marginTop: 12,
              fontSize: 48,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.2,
            }}
          >
            {title}
          </div>

          <div style={{ display: "flex", marginTop: 28, gap: 10 }}>
            {opts.date && (
              <div
                style={{
                  display: "flex",
                  padding: "10px 20px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "#d8d8dc",
                  fontSize: 20,
                }}
              >
                {opts.date}
              </div>
            )}
            <div
              style={{
                display: "flex",
                padding: "10px 20px",
                borderRadius: 999,
                background: "rgba(214,72,126,0.18)",
                border: "1px solid rgba(214,72,126,0.4)",
                color: "#ff8ab6",
                fontSize: 20,
              }}
            >
              Post Review
            </div>
          </div>
        </div>

        {opts.frame && (
          <div
            style={{
              display: "flex",
              width: 300,
              height: 502,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                width: 260,
                height: 502,
                borderRadius: 44,
                background: "#101014",
                border: "8px solid #26262e",
                padding: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: "100%",
                  borderRadius: 32,
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={opts.frame}
                  width={232}
                  height={474}
                  style={{ objectFit: "cover", width: "100%", height: "100%" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    ),
    { width: WIDTH, height: HEIGHT, headers: IMAGE_HEADERS },
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const db = await getCloudflareDb();
  if (!db) {
    // Disservizio transitorio del DB: meglio una card generica che un 5xx
    // sull'og:image (i crawler penalizzano le anteprime che falliscono).
    return card({ title: "Post Review", client: null, date: null, frame: null });
  }

  const tranche: any = await db
    .prepare(
      `SELECT t.id, t.title, t.created_at, c.name AS client_name
         FROM vr_tranches t
         LEFT JOIN clients c ON c.id = t.client_id
        WHERE t.token = ? LIMIT 1`,
    )
    .bind(token)
    .first();
  if (!tranche) return new Response("Link non valido", { status: 404 });

  const firstMedia: any = await db
    .prepare(
      `SELECT v.media_type, v.storage_key, v.approved_key, v.poster_key
         FROM vr_videos v
        WHERE v.tranche_id = ? AND v.status != 'uploading'
          AND NOT EXISTS (
            SELECT 1 FROM vr_videos nv
             WHERE nv.organization_id = v.organization_id
               AND nv.parent_video_id = COALESCE(v.parent_video_id, v.id)
               AND nv.version > v.version
               AND nv.status != 'uploading'
          )
        ORDER BY COALESCE(v.slide_index, 9999), v.created_at ASC
        LIMIT 1`,
    )
    .bind(String(tranche.id))
    .first();

  const primaryKey = firstMedia
    ? preferredVideoStorageKey(firstMedia.storage_key, firstMedia.approved_key)
    : null;
  // Video: il poster (frame JPG già estratto in upload) sta sempre su R2,
  // anche quando il video stesso è su NAS. Immagine/carosello: il media
  // stesso è il frame, niente da estrarre.
  const frameKey =
    firstMedia?.media_type === "image" ? primaryKey : firstMedia?.poster_key || null;

  const frame = await loadFrameDataUri(frameKey);

  return card({
    title: String(tranche.title || "Contenuti da approvare"),
    client: tranche.client_name ? String(tranche.client_name) : null,
    date: mese(tranche.created_at ? String(tranche.created_at) : null),
    frame,
  });
}
