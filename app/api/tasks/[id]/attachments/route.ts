export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { createId, getCloudflareDb } from "@/lib/cloudflare-db"
import { getTaskMediaBucket } from "@/lib/cloudflare-r2"
import { requireClerkUser } from "@/lib/server-clerk"
import { notifyTaskChange } from "@/lib/task-email-notifications"
import { ensureWorkspacePrincipal, mapTaskRow, stringifyJson } from "@/lib/workspace-db"

type RouteContext = {
  params: Promise<{ id: string }>
}

const MAX_FILE_SIZE = 25 * 1024 * 1024
const MAX_FILES_PER_UPLOAD = 10

function parseAttachments(value: unknown) {
  if (typeof value !== "string" || !value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function sanitizeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 120) || "file"
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireClerkUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const db = await getCloudflareDb()
    const bucket = await getTaskMediaBucket()
    if (!db || !bucket) {
      return Response.json({ error: "Storage Cloudflare non configurato" }, { status: 500 })
    }

    const principal = await ensureWorkspacePrincipal(db, user)
    const { id: taskId } = await context.params
    const task = await db
      .prepare(`SELECT * FROM tasks WHERE id = ? AND organization_id = ?`)
      .bind(taskId, principal.organizationId)
      .first()

    if (!task) return Response.json({ error: "Task non trovata" }, { status: 404 })

    const formData = await request.formData()
    const files = formData.getAll("files").filter((value): value is File => value instanceof File)

    if (files.length === 0) {
      return Response.json({ error: "Nessun file ricevuto" }, { status: 400 })
    }

    if (files.length > MAX_FILES_PER_UPLOAD) {
      return Response.json({ error: `Puoi caricare al massimo ${MAX_FILES_PER_UPLOAD} file alla volta` }, { status: 400 })
    }

    const now = new Date().toISOString()
    const currentAttachments = parseAttachments((task as any).attachments_json)
    const uploadedAttachments = []

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return Response.json({ error: `${file.name} supera il limite di 25 MB` }, { status: 400 })
      }

      const attachmentId = createId("att")
      const safeName = sanitizeFileName(file.name)
      const key = `${principal.organizationId}/tasks/${taskId}/${attachmentId}-${safeName}`
      const contentType = file.type || "application/octet-stream"

      await bucket.put(key, file.stream(), {
        httpMetadata: { contentType },
        customMetadata: {
          taskId,
          attachmentId,
          uploadedBy: principal.memberId,
          originalName: file.name,
        },
      })

      uploadedAttachments.push({
        id: attachmentId,
        name: file.name,
        key,
        url: `/api/tasks/${taskId}/attachments/${attachmentId}`,
        type: contentType,
        size: file.size,
        uploadedAt: now,
        uploadedBy: principal.memberId,
      })
    }

    const attachments = [...currentAttachments, ...uploadedAttachments]
    await db
      .prepare(
        `UPDATE tasks
         SET attachments_json = ?, updated_at = ?
         WHERE id = ? AND organization_id = ?`,
      )
      .bind(stringifyJson(attachments), now, taskId, principal.organizationId)
      .run()

    const updatedTask = await db
      .prepare(`SELECT * FROM tasks WHERE id = ? AND organization_id = ?`)
      .bind(taskId, principal.organizationId)
      .first()

    await notifyTaskChange({
      db,
      principal,
      actor: user,
      previousTask: task,
      updatedTask,
      changes: { attachments: uploadedAttachments },
    }).catch((emailError) => {
      console.error("Task attachment email notification error:", emailError)
    })

    return Response.json({ task: mapTaskRow(updatedTask), attachments: uploadedAttachments }, { status: 201 })
  } catch (error) {
    console.error("Task attachment upload error:", error)
    return Response.json({ error: "Errore durante il caricamento degli allegati" }, { status: 500 })
  }
}
