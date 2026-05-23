import { createId } from "@/lib/cloudflare-db"
import type { MagnificTaskKind } from "@/lib/magnific"
import type { WorkspacePrincipal } from "@/lib/workspace-db"

type MediaGenerationInput = {
  kind: MagnificTaskKind
  model: string
  prompt?: string
  taskId: string
  status: string
  request: unknown
  generated?: string[]
}

export async function logMagnificCreation(db: any, principal: WorkspacePrincipal, input: MediaGenerationInput) {
  if (!db) return

  try {
    await db.batch([
      db
        .prepare(
          `INSERT INTO ai_media_generations
           (id, organization_id, member_id, provider, model, media_type, prompt, status, task_id, result_urls_json, request_json)
           VALUES (?, ?, ?, 'magnific', ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(provider, task_id) DO UPDATE SET
             status = excluded.status,
             result_urls_json = excluded.result_urls_json,
             updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(
          createId("aimedia"),
          principal.organizationId,
          principal.memberId,
          input.model,
          input.kind,
          input.prompt || "",
          input.status,
          input.taskId,
          JSON.stringify(input.generated || []),
          JSON.stringify(input.request || {}),
        ),
      db
        .prepare(
          `INSERT INTO ai_usage (id, organization_id, member_id, feature, model, input_tokens, output_tokens)
           VALUES (?, ?, ?, ?, ?, 0, 0)`,
        )
        .bind(
          createId("ai"),
          principal.organizationId,
          principal.memberId,
          input.kind === "video" ? "magnific_video" : "magnific_image",
          input.model,
        ),
    ])
  } catch (error) {
    console.warn("Magnific generation logging skipped:", error)
  }
}

export async function updateMagnificGenerationStatus(
  db: any,
  principal: WorkspacePrincipal,
  taskId: string,
  status: string,
  generated: string[] = [],
) {
  if (!db) return

  try {
    await db
      .prepare(
        `UPDATE ai_media_generations
         SET status = ?,
             result_urls_json = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE provider = 'magnific'
           AND task_id = ?
           AND organization_id = ?
           AND member_id = ?`,
      )
      .bind(status, JSON.stringify(generated), taskId, principal.organizationId, principal.memberId)
      .run()
  } catch (error) {
    console.warn("Magnific generation status update skipped:", error)
  }
}
