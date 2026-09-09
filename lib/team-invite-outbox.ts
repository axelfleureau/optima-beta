import { sendInviteEmail } from "@/lib/email";

type TeamInvitePayload = {
  organizationId: string;
  memberId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  inviterName: string;
  inviterEmail: string;
  organizationName: string;
  customMessage?: string;
  acceptUrl: string;
  loginUrl: string;
};

type DeliveryResult = {
  id: string;
  status: "sent" | "failed" | "skipped";
  error?: string;
};

function text(value: unknown) {
  return String(value || "").trim();
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Errore sconosciuto";
  return message.slice(0, 500);
}

function retryDelayMinutes(attempt: number) {
  return Math.min(60, Math.max(5, 5 * 2 ** Math.max(0, attempt - 1)));
}

export async function queueTeamInvite(db: any, payload: TeamInvitePayload) {
  const existing: any = await db
    .prepare(
      `SELECT id, status
       FROM team_invite_outbox
       WHERE organization_id = ?
         AND member_id = ?
         AND status IN ('pending', 'processing', 'failed')
       ORDER BY datetime(created_at) DESC
       LIMIT 1`,
    )
    .bind(payload.organizationId, payload.memberId)
    .first();

  if (existing?.id) {
    const existingId = String(existing.id);
    if (String(existing.status) !== "processing") {
      await db
        .prepare(
          `UPDATE team_invite_outbox
           SET recipient_email = ?, first_name = ?, last_name = ?, role = ?,
               inviter_name = ?, inviter_email = ?, organization_name = ?,
               custom_message = ?, accept_url = ?, login_url = ?,
               status = 'pending', attempt_count = 0,
               next_attempt_at = CURRENT_TIMESTAMP, claimed_at = NULL,
               last_error = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND status IN ('pending', 'failed')`,
        )
        .bind(
          payload.email,
          payload.firstName,
          payload.lastName,
          payload.role,
          payload.inviterName,
          payload.inviterEmail,
          payload.organizationName,
          text(payload.customMessage) || null,
          payload.acceptUrl,
          payload.loginUrl,
          existingId,
        )
        .run();
    }
    return existingId;
  }

  const id = `invite_${crypto.randomUUID().replace(/-/g, "")}`;
  await db
    .prepare(
      `INSERT INTO team_invite_outbox
       (id, organization_id, member_id, recipient_email, first_name, last_name,
        role, inviter_name, inviter_email, organization_name, custom_message,
        accept_url, login_url, status, next_attempt_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
    )
    .bind(
      id,
      payload.organizationId,
      payload.memberId,
      payload.email,
      payload.firstName,
      payload.lastName,
      payload.role,
      payload.inviterName,
      payload.inviterEmail,
      payload.organizationName,
      text(payload.customMessage) || null,
      payload.acceptUrl,
      payload.loginUrl,
    )
    .run();

  return id;
}

export async function deliverTeamInviteOutboxItem(
  db: any,
  id: string,
): Promise<DeliveryResult> {
  const claim = await db
    .prepare(
      `UPDATE team_invite_outbox
       SET status = 'processing',
           claimed_at = CURRENT_TIMESTAMP,
           attempt_count = attempt_count + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND status IN ('pending', 'failed')
         AND attempt_count < max_attempts
         AND datetime(next_attempt_at) <= datetime('now')`,
    )
    .bind(id)
    .run();

  if (Number(claim?.meta?.changes || 0) !== 1) {
    return { id, status: "skipped" };
  }

  const row: any = await db
    .prepare(
      `SELECT id, organization_id, member_id, recipient_email, first_name,
              last_name, role, inviter_name, inviter_email, organization_name,
              custom_message, accept_url, login_url, attempt_count
       FROM team_invite_outbox
       WHERE id = ? AND status = 'processing'
       LIMIT 1`,
    )
    .bind(id)
    .first();

  if (!row?.id) return { id, status: "skipped" };

  try {
    await sendInviteEmail({
      to: text(row.recipient_email),
      firstName: text(row.first_name),
      lastName: text(row.last_name),
      inviterName: text(row.inviter_name),
      inviterEmail: text(row.inviter_email),
      role: text(row.role),
      resetLink: text(row.accept_url),
      loginLink: text(row.login_url),
      organizationName: text(row.organization_name),
      customMessage: text(row.custom_message) || undefined,
    });

    await db.batch([
      db
        .prepare(
          `UPDATE team_invite_outbox
           SET status = 'sent', sent_at = CURRENT_TIMESTAMP, claimed_at = NULL,
               last_error = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND status = 'processing'`,
        )
        .bind(id),
      db
        .prepare(
          `UPDATE members
           SET clerk_user_id = CASE
                 WHEN status = 'active' THEN clerk_user_id
                 ELSE 'invite:' || ?
               END,
               status = CASE WHEN status = 'active' THEN status ELSE 'invited' END,
               updated_at = CURRENT_TIMESTAMP
           WHERE organization_id = ? AND id = ?`,
        )
        .bind(
          text(row.recipient_email).toLowerCase(),
          text(row.organization_id),
          text(row.member_id),
        ),
    ]);

    return { id, status: "sent" };
  } catch (error) {
    const message = errorMessage(error);
    const delay = retryDelayMinutes(Number(row.attempt_count || 1));
    await db
      .prepare(
        `UPDATE team_invite_outbox
         SET status = 'failed', claimed_at = NULL, last_error = ?,
             next_attempt_at = datetime('now', ?), updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'processing'`,
      )
      .bind(message, `+${delay} minutes`, id)
      .run();
    return { id, status: "failed", error: message };
  }
}

export async function processDueTeamInvites(db: any, limit = 10) {
  await db
    .prepare(
      `UPDATE team_invite_outbox
       SET status = 'failed', claimed_at = NULL,
           last_error = COALESCE(last_error, 'Tentativo interrotto'),
           next_attempt_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE status = 'processing'
         AND datetime(claimed_at) < datetime('now', '-15 minutes')
         AND attempt_count < max_attempts`,
    )
    .run();

  const due = await db
    .prepare(
      `SELECT id
       FROM team_invite_outbox
       WHERE status IN ('pending', 'failed')
         AND attempt_count < max_attempts
         AND datetime(next_attempt_at) <= datetime('now')
       ORDER BY datetime(next_attempt_at) ASC, datetime(created_at) ASC
       LIMIT ?`,
    )
    .bind(Math.max(1, Math.min(50, limit)))
    .all();

  const results: DeliveryResult[] = [];
  for (const row of (due.results || []) as Array<{ id?: string }>) {
    if (!row.id) continue;
    results.push(await deliverTeamInviteOutboxItem(db, String(row.id)));
  }
  return results;
}
