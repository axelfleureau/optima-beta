export const dynamic = "force-dynamic";

/**
 * Card social (1200x630) della Post Review: eyebrow, cliente, titolo, mese,
 * mockup del telefono col primo contenuto e logo Righello. Prima la
 * generava il nodo (Mac Studio), ma il nodo non può leggere R2 (serve solo
 * i byte di NAS/T5): per i media su R2 il mockup spariva e restava un
 * placeholder generico. La componiamo qui, nel Worker: per i video usiamo
 * il `poster_key` (frame JPG già estratto in upload, sempre su R2 — vedi
 * app/api/video-review/videos/[id]/poster/route.ts), per immagini/caroselli
 * il primo media stesso. Nessun ffmpeg = nessun rischio di timeout.
 *
 * Satori (il motore di next/og) qui non recupera da solo le URL remote messe
 * in un <img src>: va fatto il fetch a mano e passato un data URI, sia per
 * il frame R2 sia per il logo — altrimenti l'immagine risulta assente senza
 * errore.
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
const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://appbeta.wearerighello.com"
).replace(/\/$/, "");
const IMAGE_HEADERS = {
  "Content-Type": "image/png",
  // L'URL porta già `?v=` come cache-buster (vedi reviewOgImageUrl): a parità
  // di v il contenuto non cambia mai, quindi va bene una cache lunga.
  "Cache-Control": "public, max-age=604800, immutable",
};
const BACKGROUND =
  "linear-gradient(125deg, #05080d 0%, #060a10 52%, #3d0f2d 78%, #7a2856 94%, #9c3568 100%)";

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

async function toDataUri(bytes: ArrayBuffer, contentType: string) {
  return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
}

/** Legge un frame R2 e lo incorpora come data URI: il bucket resta privato e
 * Satori non deve rifare una richiesta di rete. */
async function loadFrameDataUri(frameKey: string | null): Promise<string | null> {
  if (!frameKey || !isR2VideoKey(frameKey)) return null;
  try {
    const bucket = await getTaskMediaBucket();
    if (!bucket) return null;
    const objectKey = r2VideoObjectKey(frameKey);
    const object = await bucket.get(objectKey);
    if (!object) return null;
    if (Number(object.size || 0) > 6 * 1024 * 1024) return null; // difesa: mai comporre frame anomali
    return toDataUri(await object.arrayBuffer(), contentTypeFor(objectKey));
  } catch {
    return null;
  }
}

/** Logo statico (asset pubblico ASSETS, non R2): stesso trattamento del
 * frame, un fetch esplicito invece di lasciarlo a Satori. */
async function loadLogoDataUri(): Promise<string | null> {
  try {
    const res = await fetch(`${SITE_URL}/righello-logo-white.png`);
    if (!res.ok) return null;
    return toDataUri(await res.arrayBuffer(), "image/png");
  } catch {
    return null;
  }
}

function card(opts: {
  title: string;
  client: string | null;
  date: string | null;
  frame: string | null;
  isVideo: boolean;
  logo: string | null;
}) {
  const title = truncate(opts.title || "Contenuti da approvare", opts.frame ? 46 : 70);
  const subtitle = ["Contenuti da approvare", opts.date].filter(Boolean).join(" · ");

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          background: BACKGROUND,
          padding: "64px 72px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
            flex: 1,
            paddingRight: opts.frame ? 48 : 0,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 20,
              fontWeight: 700,
              color: "#7dd3fc",
              letterSpacing: 6,
              textTransform: "uppercase",
            }}
          >
            Post Review
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 700,
                color: "#ff6fa8",
                marginBottom: 16,
              }}
            >
              {truncate(opts.client || "Righello", 40)}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: opts.frame ? 48 : 58,
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1.15,
              }}
            >
              {title}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 22,
                fontSize: 24,
                color: "#b7bcc6",
              }}
            >
              {subtitle}
            </div>
          </div>

          {opts.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={opts.logo} width={150} height={37} style={{ objectFit: "contain" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  background: "linear-gradient(135deg, #d6487e, #06b6d4)",
                }}
              />
              <div style={{ display: "flex", fontSize: 26, fontWeight: 800, color: "#ffffff" }}>
                Righello
              </div>
            </div>
          )}
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
                  position: "relative",
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
                {opts.isVideo && (
                  <div
                    style={{
                      display: "flex",
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: 64,
                      height: 64,
                      borderRadius: 999,
                      background: "rgba(0,0,0,0.45)",
                      border: "2px solid rgba(255,255,255,0.85)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: 0,
                        height: 0,
                        marginLeft: 6,
                        borderTop: "12px solid transparent",
                        borderBottom: "12px solid transparent",
                        borderLeft: "20px solid #ffffff",
                      }}
                    />
                  </div>
                )}
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
  const logo = await loadLogoDataUri();
  const db = await getCloudflareDb();
  if (!db) {
    // Disservizio transitorio del DB: meglio una card generica che un 5xx
    // sull'og:image (i crawler penalizzano le anteprime che falliscono).
    return card({ title: "Post Review", client: null, date: null, frame: null, isVideo: false, logo });
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

  const isVideo = firstMedia?.media_type !== "image";
  const primaryKey = firstMedia
    ? preferredVideoStorageKey(firstMedia.storage_key, firstMedia.approved_key)
    : null;
  // Video: il poster (frame JPG già estratto in upload) sta sempre su R2,
  // anche quando il video stesso è su NAS. Immagine/carosello: il media
  // stesso è il frame (funziona solo se anche lui è su R2).
  const frameKey = isVideo ? firstMedia?.poster_key || null : primaryKey;
  const frame = await loadFrameDataUri(frameKey);

  return card({
    title: String(tranche.title || "Contenuti da approvare"),
    client: tranche.client_name ? String(tranche.client_name) : null,
    date: mese(tranche.created_at ? String(tranche.created_at) : null),
    frame,
    isVideo,
    logo,
  });
}
