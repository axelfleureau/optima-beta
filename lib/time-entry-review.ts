export const ENTRY_REVIEW_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "changes_requested",
] as const;

export type EntryReviewStatus = (typeof ENTRY_REVIEW_STATUSES)[number];

export function normalizeEntryReviewStatus(value: unknown): EntryReviewStatus {
  const status = String(value || "").trim();
  return ENTRY_REVIEW_STATUSES.includes(status as EntryReviewStatus)
    ? (status as EntryReviewStatus)
    : "submitted";
}

export async function refreshWorkDayReviewStatus(
  db: any,
  organizationId: string,
  memberId: string,
  entryDate: string,
  reviewerMemberId?: string | null,
) {
  const counts = (await db
    .prepare(
      `SELECT COUNT(*) AS total_count,
              SUM(CASE WHEN review_status = 'changes_requested' THEN 1 ELSE 0 END) AS changes_requested_count,
              SUM(CASE WHEN review_status = 'submitted' THEN 1 ELSE 0 END) AS submitted_count,
              SUM(CASE WHEN review_status = 'approved' THEN 1 ELSE 0 END) AS approved_count
       FROM time_entries
       WHERE organization_id = ?
         AND member_id = ?
         AND entry_date = ?`,
    )
    .bind(organizationId, memberId, entryDate)
    .first()) as any;

  const total = Number(counts?.total_count || 0);
  const changesRequested = Number(counts?.changes_requested_count || 0);
  const submitted = Number(counts?.submitted_count || 0);
  const approved = Number(counts?.approved_count || 0);

  const nextStatus: EntryReviewStatus =
    total < 1
      ? "draft"
      : changesRequested > 0
        ? "changes_requested"
        : submitted > 0
          ? "submitted"
          : approved >= total
            ? "approved"
            : "draft";

  await db
    .prepare(
      `UPDATE work_days
       SET review_status = ?,
           reviewed_at = CASE WHEN ? = 'approved' THEN COALESCE(reviewed_at, CURRENT_TIMESTAMP) ELSE reviewed_at END,
           reviewed_by_member_id = CASE WHEN ? = 'approved' THEN COALESCE(reviewed_by_member_id, ?) ELSE reviewed_by_member_id END,
           updated_at = CURRENT_TIMESTAMP
       WHERE organization_id = ?
         AND member_id = ?
         AND entry_date = ?`,
    )
    .bind(
      nextStatus,
      nextStatus,
      nextStatus,
      reviewerMemberId || null,
      organizationId,
      memberId,
      entryDate,
    )
    .run();

  return {
    reviewStatus: nextStatus,
    total,
    submitted,
    approved,
    changesRequested,
  };
}
