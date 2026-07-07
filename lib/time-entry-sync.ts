export async function syncTaskActualMinutesFromEntries(db: any, organizationId: string, taskId: string | null | undefined) {
  if (!taskId) return 0

  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(minutes), 0) AS minutes
       FROM time_entries
       WHERE organization_id = ?
         AND task_id = ?`,
    )
    .bind(organizationId, taskId)
    .first()

  const minutes = Math.max(0, Math.round(Number(row?.minutes || 0)))
  await db
    .prepare(
      `UPDATE tasks
       SET actual_minutes = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE organization_id = ?
         AND id = ?`,
    )
    .bind(minutes, organizationId, taskId)
    .run()

  return minutes
}
