export const dynamic = "force-dynamic";

/**
 * Anteprima social della stanza di review: una card brandizzata Righello con
 * titolo e cliente, non un fotogramma a caso del video.
 *
 * Perché così: il frame estratto dal video era imprevedibile (una persona a
 * metà gesto, un'inquadratura buia) e non diceva nulla di chi manda il link.
 * Una card fissa è riconoscibile e sempre leggibile, anche in miniatura.
 */

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";

const W = 1200;
const H = 630;

function mese(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(d);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let titolo = "Contenuti da approvare";
  let cliente: string | null = null;
  let data: string | null = null;

  try {
    const db = await getCloudflareDb();
    const row: any = await db
      ?.prepare(
        `SELECT t.title, t.created_at, c.name AS client_name
           FROM vr_tranches t
           LEFT JOIN clients c ON c.id = t.client_id
          WHERE t.token = ? LIMIT 1`,
      )
      .bind(token)
      .first();
    if (row) {
      titolo = String(row.title || titolo);
      cliente = row.client_name ? String(row.client_name) : null;
      data = mese(row.created_at ? String(row.created_at) : null);
    }
  } catch {
    /* senza dati la card esce comunque, solo più generica */
  }

  // Font e logo arrivano dagli asset del sito: sul Worker non c'è filesystem.
  const base = new URL(request.url).origin;
  const [bold, medium, logo] = await Promise.all([
    fetch(`${base}/fonts/og/DegularDisplay-Bold.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${base}/fonts/og/DegularDisplay-Medium.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${base}/righello-logo-white.png`)
      .then((r) => r.arrayBuffer())
      .then(
        (b) =>
          `data:image/png;base64,${btoa(String.fromCharCode(...new Uint8Array(b)))}`,
      )
      .catch(() => null),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0f17",
          backgroundImage:
            "radial-gradient(900px 420px at 78% -10%, rgba(214,72,126,0.30), transparent 60%), radial-gradient(700px 380px at 5% 110%, rgba(6,182,212,0.16), transparent 60%)",
          padding: "64px 72px",
          fontFamily: "Degular",
        }}
      >
        {/* etichetta in alto */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "linear-gradient(135deg,#d6487e,#06b6d4)",
            }}
          />
          <div
            style={{
              fontSize: 24,
              letterSpacing: 4,
              color: "#7dd8e8",
              fontFamily: "DegularMedium",
            }}
          >
            POST REVIEW
          </div>
        </div>

        {/* titolo + cliente */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {cliente ? (
            <div style={{ fontSize: 32, color: "#ff8ab6", fontFamily: "DegularMedium" }}>
              {cliente}
            </div>
          ) : null}
          <div
            style={{
              fontSize: titolo.length > 42 ? 66 : 84,
              color: "#ffffff",
              lineHeight: 1.05,
              maxWidth: 980,
            }}
          >
            {titolo}
          </div>
          <div style={{ fontSize: 30, color: "#93a1b8", fontFamily: "DegularMedium" }}>
            {data
              ? `Contenuti da approvare · ${data}`
              : "Contenuti pronti da approvare"}
          </div>
        </div>

        {/* logo in basso */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} width={190} height={47} alt="Righello" />
          ) : (
            <div style={{ fontSize: 34, color: "#fff" }}>Righello</div>
          )}
          <div
            style={{
              width: 240,
              height: 6,
              borderRadius: 999,
              background: "linear-gradient(90deg,#d6487e,#06b6d4)",
            }}
          />
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: "Degular", data: bold, style: "normal", weight: 700 },
        { name: "DegularMedium", data: medium, style: "normal", weight: 500 },
      ],
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
