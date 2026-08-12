import type { Metadata } from "next";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { signedOgCardUrl } from "@/lib/video-node";
import ReviewRoomClient from "./review-room-client";

type PageParams = { params: Promise<{ token: string }> };

const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://appbeta.wearerighello.com"
).replace(/\/$/, "");

// Card statica di riserva: se il nodo non risponde l'anteprima resta
// brandizzata invece di sparire del tutto.
const FALLBACK_IMAGE = `${SITE_URL}/og-post-review.png`;

function mese(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(d);
}

async function getReviewPreview(token: string) {
  const db = await getCloudflareDb();
  if (!db) return null;

  const tranche: any = await db
    .prepare(
      `SELECT t.id, t.title, t.post_type, t.created_at, c.name AS client_name
         FROM vr_tranches t
         LEFT JOIN clients c ON c.id = t.client_id
        WHERE t.token = ? LIMIT 1`,
    )
    .bind(token)
    .first();
  if (!tranche) return null;

  const firstMedia: any = await db
    .prepare(
      `SELECT v.title, v.storage_key
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

  // Anteprima social: card brandizzata con logo, titolo, cliente e un frame
  // del primo contenuto dentro un mockup di telefono. La genera il nodo (Mac
  // Studio): su Cloudflare `next/og` manda il Worker in timeout.
  const image =
    (await signedOgCardUrl({
      t: String(tranche.title || "Contenuti da approvare"),
      c: tranche.client_name ? String(tranche.client_name) : null,
      d: mese(tranche.created_at ? String(tranche.created_at) : null),
      f: firstMedia?.storage_key ? String(firstMedia.storage_key) : null,
    })) || FALLBACK_IMAGE;

  return {
    title: String(tranche.title || "Post Review"),
    clientName: tranche.client_name ? String(tranche.client_name) : null,
    firstMediaTitle: firstMedia?.title ? String(firstMedia.title) : null,
    postType: String(tranche.post_type || "video"),
    image,
  };
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { token } = await params;
  const preview = await getReviewPreview(token);
  const title = preview
    ? `${preview.title} | Post Review Righello`
    : "Post Review Righello";
  const description = preview
    ? [
        preview.clientName,
        preview.firstMediaTitle
          ? `Anteprima: ${preview.firstMediaTitle}`
          : "Contenuti social pronti per approvazione e note di revisione",
      ]
        .filter(Boolean)
        .join(" · ")
    : "Contenuti social pronti per approvazione e note di revisione.";
  const url = `${SITE_URL}/review/${token}`;
  const image = preview?.image || FALLBACK_IMAGE;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Optima by Righello",
      type: "website",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: preview?.title || "Post Review Righello",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function ReviewRoomPage({ params }: PageParams) {
  return <ReviewRoomClient params={params} />;
}
