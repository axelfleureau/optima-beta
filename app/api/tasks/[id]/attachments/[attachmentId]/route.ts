export const dynamic = "force-dynamic"

import { getCloudflareDb } from "@/lib/cloudflare-db"
import { getTaskMediaBucket } from "@/lib/cloudflare-r2"
import { requireClerkUser } from "@/lib/server-clerk"
import { notifyTaskChange } from "@/lib/task-email-notifications"
import { ensureWorkspacePrincipal, mapTaskRow, stringifyJson } from "@/lib/workspace-db"

type RouteContext = {
  params: Promise<{ id: string; attachmentId: string }>
}

function parseAttachments(value: unknown) {
  if (typeof value !== "string" || !value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function contentDisposition(filename: string) {
  return `inline; filename*=UTF-8''${encodeURIComponent(filename)}`
}

async function getTaskAndAttachment(context: RouteContext) {
  const user = await requireClerkUser()
  if (!user) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) }

  const db = await getCloudflareDb()
  const bucket = await getTaskMediaBucket()
  if (!db || !bucket) {
    return { error: Response.json({ error: "Storage Cloudflare non configurato" }, { status: 500 }) }
  }

  const principal = await ensureWorkspacePrincipal(db, user)
  const { id: taskId, attachmentId } = await context.params
  const task = await db
    .prepare(`SELECT * FROM tasks WHERE id = ? AND organization_id = ?`)
    .bind(taskId, principal.organizationId)
    .first()

  if (!task) return { error: Response.json({ error: "Task non trovata" }, { status: 404 }) }

  const attachments = parseAttachments((task as any).attachments_json)
  const attachment = attachments.find((item: any) => item?.id === attachmentId)

  if (!attachment?.key) {
    return { error: Response.json({ error: "Allegato non trovato" }, { status: 404 }) }
  }

  return { db, bucket, principal, user, task, taskId, attachment, attachments }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const result = await getTaskAndAttachment(context)
    if (result.error) return result.error

    const object = await result.bucket.get(result.attachment.key)
    if (!object?.body) {
      return Response.json({ error: "File non trovato nello storage" }, { status: 404 })
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set("etag", object.httpEtag)
    headers.set("content-disposition", contentDisposition(result.attachment.name || "allegato"))
    headers.set("cache-control", "private, max-age=300")

    return new Response(object.body, { headers })
  } catch (error) {
    console.error("Task attachment download error:", error)
    return Response.json({ error: "Errore durante il download dell'allegato" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const result = await getTaskAndAttachment(context)
    if (result.error) return result.error

    await result.bucket.delete(result.attachment.key)

    const now = new Date().toISOString()
    const attachments = result.attachments.filter((item: any) => item?.id !== result.attachment.id)
    await result.db
      .prepare(
        `UPDATE tasks
         SET attachments_json = ?, updated_at = ?
         WHERE id = ? AND organization_id = ?`,
      )
      .bind(stringifyJson(attachments), now, result.taskId, result.principal.organizationId)
      .run()

    const updatedTask = await result.db
      .prepare(`SELECT * FROM tasks WHERE id = ? AND organization_id = ?`)
      .bind(result.taskId, result.principal.organizationId)
      .first()

    await notifyTaskChange({
      db: result.db,
      principal: result.principal,
      actor: result.user,
      previousTask: result.task,
      updatedTask,
      changes: { attachments },
    }).catch((emailError) => {
      console.error("Task attachment delete email notification error:", emailError)
    })

    return Response.json({ task: mapTaskRow(updatedTask) })
  } catch (error) {
    console.error("Task attachment delete error:", error)
    return Response.json({ error: "Errore durante la rimozione dell'allegato" }, { status: 500 })
  }
}
