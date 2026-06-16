import { notFound, redirect } from "next/navigation"

import { getCloudflareDb } from "@/lib/cloudflare-db"
import { validateShareToken } from "@/lib/quote-utils"

export const dynamic = "force-dynamic"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function ShortQuoteLinkPage({
  params,
}: {
  params: Promise<{ quoteLink: string }>
}) {
  const { quoteLink } = await params

  if (validateShareToken(quoteLink)) {
    redirect(`/quotes/public/${quoteLink}`)
  }

  if (!UUID_PATTERN.test(quoteLink)) {
    notFound()
  }

  const db = await getCloudflareDb()
  if (!db) {
    notFound()
  }

  const row = (await db
    .prepare(
      `SELECT q.share_token,
              share.raw_json AS share_record_json
       FROM quotes q
       LEFT JOIN external_data_records share
         ON share.organization_id = q.organization_id
        AND share.quote_id = q.id
        AND share.provider = 'optima'
        AND share.record_type = 'quote_share'
       WHERE q.id = ? OR q.share_token = ?
      LIMIT 1`,
    )
    .bind(quoteLink, quoteLink)
    .first()) as { share_token?: string | null; share_record_json?: string | null } | null

  if (!row) {
    notFound()
  }

  let shareToken = row.share_token || ""
  if (!shareToken && row.share_record_json) {
    try {
      const parsed = JSON.parse(row.share_record_json) as { shareToken?: string }
      shareToken = parsed.shareToken || ""
    } catch {
      shareToken = ""
    }
  }

  if (shareToken && validateShareToken(shareToken)) {
    redirect(`/quotes/public/${shareToken}`)
  }

  redirect(`/preventivi/${quoteLink}`)
}
