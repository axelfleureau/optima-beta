export const dynamic = "force-dynamic";

/**
 * Card social (1200x630) della Post Review, brandizzata Righello: eyebrow,
 * cliente, titolo, mese e logo. Prima la generava il nodo (Mac Studio), ma
 * per i media su R2 (che il nodo non può leggere) il mockup con la foto
 * spariva e restava il placeholder generico. La componiamo qui, nel Worker,
 * con solo testo e il logo esistente: stessa card per ogni consegna, NAS o
 * R2, nessuna dipendenza dal nodo, nessuna decodifica quindi nessun rischio
 * di timeout.
 */

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";

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

function card(opts: { title: string; client: string | null; date: string | null }) {
  const title = truncate(opts.title || "Contenuti da approvare", 70);
  const subtitle = ["Contenuti da approvare", opts.date].filter(Boolean).join(" · ");

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BACKGROUND,
          padding: "64px 72px",
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

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
          {opts.client && (
            <div
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 700,
                color: "#ff6fa8",
                marginBottom: 16,
              }}
            >
              {truncate(opts.client, 48)}
            </div>
          )}
          <div
            style={{
              display: "flex",
              fontSize: 58,
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
              fontSize: 26,
              color: "#b7bcc6",
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${SITE_URL}/righello-logo-white.png`}
          width={168}
          height={41}
          style={{ objectFit: "contain" }}
        />
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
    return card({ title: "Post Review", client: null, date: null });
  }

  const tranche: any = await db
    .prepare(
      `SELECT t.title, t.created_at, c.name AS client_name
         FROM vr_tranches t
         LEFT JOIN clients c ON c.id = t.client_id
        WHERE t.token = ? LIMIT 1`,
    )
    .bind(token)
    .first();
  if (!tranche) return new Response("Link non valido", { status: 404 });

  return card({
    title: String(tranche.title || "Contenuti da approvare"),
    client: tranche.client_name ? String(tranche.client_name) : null,
    date: mese(tranche.created_at ? String(tranche.created_at) : null),
  });
}
