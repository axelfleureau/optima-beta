import type { Client, User } from "@/lib/types";
import type { WorkspacePrincipal } from "@/lib/workspace-db";
import { canViewInternalEconomicData } from "@/lib/workspace-permissions";

type SafeRow = Record<string, any>;

export type OperationalContextSource =
  | "tasks"
  | "projects"
  | "clients"
  | "members"
  | "presence"
  | "quotes"
  | "time_entries"
  | "repositories"
  | "external_records"
  | "client_interactions"
  | "report-review";

export interface RepositoryCandidate {
  repoUrl: string;
  repoBranch: string | null;
  workspaceHint: string | null;
  source: string;
  targetType: string;
  targetId: string;
}

export interface OperationalContextSnapshot {
  text: string;
  sources: OperationalContextSource[];
  isManager: boolean;
  commandContext: {
    availableClients: Partial<Client>[];
    availableUsers: Partial<User>[];
  };
  graph: {
    clients: SafeRow[];
    projects: SafeRow[];
    tasks: SafeRow[];
    quotes: SafeRow[];
    externalRecords: SafeRow[];
    clientInteractions: SafeRow[];
    timeEntries: SafeRow[];
    people: SafeRow[];
    repositories: RepositoryCandidate[];
  };
}

const MANAGER_ROLES = new Set([
  "super-admin",
  "admin",
  "direzione",
  "capo-reparto",
]);
const DEFAULT_OPTIMA_REPO_URL = "https://github.com/axelfleureau/optima-beta";

function compact(value: unknown, limit = 600) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function formatDate(value: unknown) {
  if (!value) return "senza scadenza";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrencyCents(value: unknown, currency = "EUR") {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0) / 100);
}

export async function safeAll(db: any, sql: string, params: unknown[] = []) {
  try {
    const statement = db.prepare(sql);
    const result = await statement.bind(...params).all();
    return (result.results || []) as SafeRow[];
  } catch (error) {
    console.warn("Operational context query skipped:", error);
    return [];
  }
}

async function safeFirst(db: any, sql: string, params: unknown[] = []) {
  try {
    return ((await db
      .prepare(sql)
      .bind(...params)
      .first()) || null) as SafeRow | null;
  } catch (error) {
    console.warn("Operational context query skipped:", error);
    return null;
  }
}

function uniqueSources(sources: OperationalContextSource[]) {
  return Array.from(new Set(sources));
}

function mapRepositoryRows(rows: SafeRow[]): RepositoryCandidate[] {
  return rows
    .filter((row) => row.repo_url)
    .map((row) => ({
      repoUrl: String(row.repo_url),
      repoBranch: row.repo_branch ? String(row.repo_branch) : null,
      workspaceHint: row.workspace_hint ? String(row.workspace_hint) : null,
      source: String(row.source || "manual"),
      targetType: String(row.target_type || "organization"),
      targetId: String(row.target_id || ""),
    }));
}

export async function buildOperationalContextSnapshot(
  db: any,
  principal: WorkspacePrincipal,
): Promise<OperationalContextSnapshot> {
  if (!db) {
    return {
      text: "Contesto piattaforma non disponibile: binding database assente.",
      sources: [],
      isManager: false,
      commandContext: { availableClients: [], availableUsers: [] },
      graph: {
        clients: [],
        projects: [],
        tasks: [],
        quotes: [],
        externalRecords: [],
        clientInteractions: [],
        timeEntries: [],
        people: [],
        repositories: [],
      },
    };
  }

  const isManager = MANAGER_ROLES.has(principal.role);
  const canViewEconomics = canViewInternalEconomicData(principal.role);
  const canBrowseClientDirectory = principal.role !== "client";
  const today = new Date().toISOString().slice(0, 10);
  const sources: OperationalContextSource[] = [];

  const taskVisibility = isManager
    ? ""
    : "AND (t.assignee_member_id = ? OR t.created_by_member_id = ?)";
  const taskParams = isManager
    ? [principal.organizationId]
    : [principal.organizationId, principal.memberId, principal.memberId];
  const [taskSummary] = await safeAll(
    db,
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN COALESCE(t.column_id, t.status) IN ('done', 'completed', 'completato') THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN t.due_at IS NOT NULL AND date(t.due_at) < date('now') AND COALESCE(t.column_id, t.status) NOT IN ('done', 'completed', 'completato') THEN 1 ELSE 0 END) AS overdue,
       SUM(CASE WHEN t.due_at IS NOT NULL AND date(t.due_at) BETWEEN date('now') AND date('now', '+7 day') AND COALESCE(t.column_id, t.status) NOT IN ('done', 'completed', 'completato') THEN 1 ELSE 0 END) AS due_soon
     FROM tasks t
     WHERE t.organization_id = ? ${taskVisibility}`,
    taskParams,
  );
  if (taskSummary) sources.push("tasks");

  const tasks = await safeAll(
    db,
    `SELECT t.id, t.title, t.status, t.column_id, t.priority, t.due_at, t.client_id, t.client_name,
            t.assignee_member_id, t.assignee_name, t.project_id, p.name AS project_name
     FROM tasks t
     LEFT JOIN projects p ON p.id = t.project_id AND p.organization_id = t.organization_id
     WHERE t.organization_id = ?
       ${taskVisibility}
     ORDER BY
       CASE WHEN t.due_at IS NULL THEN 1 ELSE 0 END,
       date(t.due_at) ASC,
       t.updated_at DESC
     LIMIT 20`,
    taskParams,
  );

  const projectVisibility = isManager
    ? "p.organization_id = ?"
    : "p.organization_id = ? AND EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.member_id = ?)";
  const projectParams = isManager
    ? [principal.organizationId]
    : [principal.organizationId, principal.memberId];
  const rawProjects = await safeAll(
    db,
    `SELECT p.id, p.name, p.status, p.due_at, p.budget_cents, p.client_id, c.name AS client_name,
       COUNT(t.id) AS task_count,
       SUM(CASE WHEN COALESCE(t.column_id, t.status) IN ('done', 'completed', 'completato') THEN 1 ELSE 0 END) AS completed_tasks
     FROM projects p
     LEFT JOIN clients c ON c.id = p.client_id AND c.organization_id = p.organization_id
     LEFT JOIN tasks t ON t.project_id = p.id AND t.organization_id = p.organization_id
     WHERE ${projectVisibility}
     GROUP BY p.id
     ORDER BY p.updated_at DESC
     LIMIT 12`,
    projectParams,
  );
  const projects: SafeRow[] = canViewEconomics
    ? rawProjects
    : rawProjects.map((project): SafeRow => ({
        ...project,
        budget_cents: null,
      }));
  if (projects.length) sources.push("projects");

  const clients = await safeAll(
    db,
    `SELECT c.id, c.name, c.status, c.company, COUNT(t.id) AS task_count
     FROM clients c
     LEFT JOIN tasks t
       ON t.client_id = c.id
      AND t.organization_id = c.organization_id
      AND (? = 1 OR t.assignee_member_id = ? OR t.created_by_member_id = ?)
     WHERE c.organization_id = ?
       AND (
         ? = 1
         OR EXISTS (
           SELECT 1
           FROM tasks vt
           LEFT JOIN projects vtp ON vtp.id = vt.project_id AND vtp.organization_id = vt.organization_id
           WHERE vt.organization_id = c.organization_id
             AND vt.assignee_member_id = ?
             AND (vt.client_id = c.id OR vtp.client_id = c.id)
         )
         OR EXISTS (
           SELECT 1
           FROM projects vp
           JOIN project_members vpm ON vpm.project_id = vp.id AND vpm.organization_id = vp.organization_id
           WHERE vp.organization_id = c.organization_id
             AND vp.client_id = c.id
             AND vpm.member_id = ?
         )
       )
     GROUP BY c.id
     ORDER BY c.updated_at DESC
     LIMIT 12`,
    [
      isManager ? 1 : 0,
      principal.memberId,
      principal.memberId,
      principal.organizationId,
      canBrowseClientDirectory ? 1 : 0,
      principal.memberId,
      principal.memberId,
    ],
  );
  if (clients.length) sources.push("clients");

  const quotes = canViewEconomics
    ? await safeAll(
        db,
        `SELECT q.id, q.title, q.status, q.currency, q.total_cents, q.client_id, q.client_name, q.description, q.updated_at
         FROM quotes q
         WHERE q.organization_id = ?
           AND (
             ? = 1
             OR EXISTS (
               SELECT 1
               FROM tasks vt
               LEFT JOIN projects vtp ON vtp.id = vt.project_id AND vtp.organization_id = vt.organization_id
               WHERE vt.organization_id = q.organization_id
                 AND vt.assignee_member_id = ?
                 AND (vt.client_id = q.client_id OR vtp.client_id = q.client_id)
             )
           )
         ORDER BY q.updated_at DESC
         LIMIT 12`,
        [principal.organizationId, isManager ? 1 : 0, principal.memberId],
      )
    : [];
  if (quotes.length) sources.push("quotes");

  const rawExternalRecords = await safeAll(
    db,
    `SELECT er.id, er.record_type, er.title, er.summary, er.amount_cents, er.currency,
            er.confidence, er.provider, er.external_url, er.client_id, er.quote_id, c.name AS client_name
     FROM external_data_records er
     LEFT JOIN clients c ON c.id = er.client_id AND c.organization_id = er.organization_id
     WHERE er.organization_id = ?
       AND (
         ? = 1
         OR EXISTS (
           SELECT 1
           FROM tasks vt
           LEFT JOIN projects vtp ON vtp.id = vt.project_id AND vtp.organization_id = vt.organization_id
           WHERE vt.organization_id = er.organization_id
             AND vt.assignee_member_id = ?
             AND (vt.client_id = er.client_id OR vtp.client_id = er.client_id)
         )
       )
     ORDER BY er.updated_at DESC
     LIMIT 14`,
    [principal.organizationId, isManager ? 1 : 0, principal.memberId],
  );
  const externalRecords: SafeRow[] = canViewEconomics
    ? rawExternalRecords
    : rawExternalRecords.map((record): SafeRow => ({
        ...record,
        amount_cents: null,
      }));
  if (externalRecords.length) sources.push("external_records");

  const clientInteractions = await safeAll(
    db,
    `SELECT ci.id, ci.title, ci.summary, ci.interaction_type, ci.status, ci.occurred_at,
            ci.source_type, ci.source_url, ci.client_id, c.name AS client_name, p.name AS project_name
     FROM client_interactions ci
     LEFT JOIN clients c ON c.id = ci.client_id AND c.organization_id = ci.organization_id
     LEFT JOIN projects p ON p.id = ci.project_id AND p.organization_id = ci.organization_id
     WHERE ci.organization_id = ?
       AND (
         ? = 1
         OR EXISTS (
           SELECT 1
           FROM tasks vt
           LEFT JOIN projects vtp ON vtp.id = vt.project_id AND vtp.organization_id = vt.organization_id
           WHERE vt.organization_id = ci.organization_id
             AND vt.assignee_member_id = ?
             AND (vt.client_id = ci.client_id OR vtp.client_id = ci.client_id)
         )
       )
     ORDER BY ci.occurred_at DESC, ci.updated_at DESC
     LIMIT 10`,
    [principal.organizationId, isManager ? 1 : 0, principal.memberId],
  );
  if (clientInteractions.length) sources.push("client_interactions");

  const timeEntries = await safeAll(
    db,
    `SELECT te.client_id, te.project_id, c.name AS client_name, p.name AS project_name,
            COUNT(*) AS entry_count,
            SUM(te.minutes) AS total_minutes,
            SUM(CASE WHEN te.billable = 1 THEN te.minutes ELSE 0 END) AS billable_minutes,
            MAX(te.entry_date) AS last_entry_date
     FROM time_entries te
     LEFT JOIN clients c ON c.id = te.client_id AND c.organization_id = te.organization_id
     LEFT JOIN projects p ON p.id = te.project_id AND p.organization_id = te.organization_id
     WHERE te.organization_id = ?
       AND date(te.entry_date) >= date('now', '-45 day')
       ${isManager ? "" : "AND te.member_id = ?"}
     GROUP BY te.client_id, te.project_id
     ORDER BY last_entry_date DESC, total_minutes DESC
     LIMIT 12`,
    isManager
      ? [principal.organizationId]
      : [principal.organizationId, principal.memberId],
  );
  if (timeEntries.length) sources.push("time_entries");

  const people = isManager
    ? await safeAll(
        db,
        `SELECT m.id, m.first_name, m.last_name, m.email, m.role, wd.check_in_at, wd.check_out_at, wd.status
         FROM members m
         LEFT JOIN work_days wd ON wd.member_id = m.id AND wd.organization_id = m.organization_id AND wd.entry_date = ?
         WHERE m.organization_id = ? AND COALESCE(m.status, 'active') NOT IN ('removed', 'deleted', 'archived', 'disabled')
         ORDER BY m.role ASC, m.first_name ASC, m.email ASC
         LIMIT 20`,
        [today, principal.organizationId],
      )
    : [];
  if (people.length) sources.push("members", "presence");

  const repositories = mapRepositoryRows(
    await safeAll(
      db,
      `SELECT target_type, target_id, repo_url, repo_branch, workspace_hint, source
       FROM repository_links
       WHERE organization_id = ?
       ORDER BY updated_at DESC
       LIMIT 20`,
      [principal.organizationId],
    ),
  );
  if (repositories.length) sources.push("repositories");

  const submittedReports = isManager
    ? await safeAll(
        db,
        `SELECT COUNT(*) AS submitted
         FROM work_days
         WHERE organization_id = ? AND review_status IN ('submitted', 'changes_requested')`,
        [principal.organizationId],
      )
    : [];
  if (Number(submittedReports[0]?.submitted || 0) > 0)
    sources.push("report-review");

  const lines = [
    "SNAPSHOT OPERATIVO OPTIMA",
    `Data snapshot: ${today}`,
    `Visibilita utente: ${isManager ? "manager/team" : "personale"}`,
    "",
    `Task: ${Number(taskSummary?.total || 0)} totali, ${Number(taskSummary?.completed || 0)} completati, ${Number(taskSummary?.overdue || 0)} in ritardo, ${Number(taskSummary?.due_soon || 0)} entro 7 giorni.`,
    ...tasks
      .slice(0, 10)
      .map(
        (task) =>
          `- Task: ${compact(task.title, 120)} | stato ${compact(task.column_id || task.status, 40)} | priorita ${compact(task.priority, 30)} | scadenza ${formatDate(task.due_at)} | cliente ${compact(task.client_name || "-", 80)} | progetto ${compact(task.project_name || "-", 80)} | assegnato ${compact(task.assignee_name || "-", 80)}`,
      ),
    "",
    "Progetti rilevanti:",
    ...projects
      .slice(0, 8)
      .map(
        (project) =>
          `- ${compact(project.name, 100)} | cliente ${compact(project.client_name || "-", 80)} | stato ${compact(project.status, 40)} | scadenza ${formatDate(project.due_at)} | task ${Number(project.completed_tasks || 0)}/${Number(project.task_count || 0)}${canViewEconomics ? ` | budget €${(Number(project.budget_cents || 0) / 100).toLocaleString("it-IT")}` : ""}`,
      ),
  ];

  if (clients.length) {
    lines.push(
      "",
      "Clienti visibili:",
      ...clients
        .slice(0, 8)
        .map(
          (client) =>
            `- ${compact(client.name, 90)} | azienda ${compact(client.company || "-", 80)} | stato ${compact(client.status, 30)} | task ${Number(client.task_count || 0)}`,
        ),
    );
  }

  if (quotes.length) {
    lines.push(
      "",
      "Preventivi recenti:",
      ...quotes
        .slice(0, 8)
        .map(
          (quote) =>
            `- ${compact(quote.title, 110)} | cliente ${compact(quote.client_name || "-", 90)} | stato ${compact(quote.status, 40)} | valore ${formatCurrencyCents(quote.total_cents, String(quote.currency || "EUR"))} | aggiornato ${formatDate(quote.updated_at)} | note ${compact(quote.description || "-", 140)}`,
        ),
    );
  }

  if (externalRecords.length) {
    lines.push(
      "",
      "Fonti importate recenti:",
      ...externalRecords.slice(0, 8).map((record) => {
        const amount = record.amount_cents
          ? ` | importo ${formatCurrencyCents(record.amount_cents, record.currency || "EUR")}`
          : "";
        return `- ${compact(record.title, 110)} | tipo ${compact(record.record_type, 30)} | cliente ${compact(record.client_name || "-", 80)}${amount} | source ${compact(record.provider, 30)} | confidence ${compact(record.confidence, 30)}`;
      }),
    );
  }

  if (clientInteractions.length) {
    lines.push(
      "",
      "Call/incontri recenti:",
      ...clientInteractions
        .slice(0, 6)
        .map(
          (interaction) =>
            `- ${compact(interaction.title, 110)} | tipo ${compact(interaction.interaction_type, 30)} | cliente ${compact(interaction.client_name || "-", 80)} | data ${formatDate(interaction.occurred_at)} | ${compact(interaction.summary || "-", 140)}`,
        ),
    );
  }

  if (timeEntries.length) {
    lines.push(
      "",
      "Consuntivi recenti 45 giorni:",
      ...timeEntries.slice(0, 8).map((entry) => {
        const totalMinutes = Number(entry.total_minutes || 0);
        const billableMinutes = Number(entry.billable_minutes || 0);
        return `- cliente ${compact(entry.client_name || "-", 90)} | progetto ${compact(entry.project_name || "-", 90)} | ore ${Math.round(totalMinutes / 60)}h (${Math.round(billableMinutes / 60)}h fatturabili) | righe ${Number(entry.entry_count || 0)} | ultimo ${formatDate(entry.last_entry_date)}`;
      }),
    );
  }

  if (people.length) {
    lines.push(
      "",
      "Presenza team oggi:",
      ...people.map((person) => {
        const name = compact(
          [person.first_name, person.last_name].filter(Boolean).join(" ") ||
            person.email,
          100,
        );
        const status =
          person.status === "absent"
            ? "assente"
            : person.check_in_at && !person.check_out_at
              ? "presente"
              : person.check_out_at
                ? "uscito"
                : "non segnato";
        return `- ${name} | ruolo ${compact(person.role, 40)} | ${status}`;
      }),
    );
  }

  if (repositories.length) {
    lines.push(
      "",
      "Repository collegati al grafo:",
      ...repositories
        .slice(0, 8)
        .map(
          (repo) =>
            `- ${repo.targetType}:${repo.targetId} -> ${repo.repoUrl} (${repo.repoBranch || "default"})`,
        ),
    );
  }

  if (submittedReports[0]) {
    lines.push(
      "",
      `Rapportini in review: ${Number(submittedReports[0].submitted || 0)}`,
    );
  }

  return {
    text: lines.join("\n").slice(0, 7000),
    sources: uniqueSources(sources),
    isManager,
    commandContext: {
      availableClients: clients.map((client) => ({
        id: String(client.id),
        name: String(client.name || ""),
        email: "",
        tenantId: principal.organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      availableUsers: people.map((person) => ({
        id: String(person.id),
        email: String(person.email || ""),
        firstName: String(person.first_name || ""),
        lastName: String(person.last_name || ""),
        role: String(person.role || "junior") as User["role"],
        tenantId: principal.organizationId,
        createdAt: new Date(),
      })),
    },
    graph: {
      clients,
      projects,
      tasks,
      quotes,
      externalRecords,
      clientInteractions,
      timeEntries,
      people,
      repositories,
    },
  };
}

export async function inferRepositoryForAgentJob(
  db: any,
  principal: WorkspacePrincipal,
  input: {
    jobType?: unknown;
    repoUrl?: unknown;
    repoBranch?: unknown;
    workspaceHint?: unknown;
    context?: any;
    input?: any;
  },
) {
  const explicitRepoUrl =
    typeof input.repoUrl === "string" ? input.repoUrl.trim() : "";
  if (explicitRepoUrl) {
    return {
      repoUrl: explicitRepoUrl,
      repoBranch:
        typeof input.repoBranch === "string" && input.repoBranch.trim()
          ? input.repoBranch.trim()
          : "main",
      workspaceHint:
        typeof input.workspaceHint === "string" && input.workspaceHint.trim()
          ? input.workspaceHint.trim()
          : null,
      inferred: false,
      source: "manual",
    };
  }

  const context =
    input.context && typeof input.context === "object" ? input.context : {};
  const payload =
    input.input && typeof input.input === "object" ? input.input : {};
  const taskId = String(context.taskId || payload.taskId || "").trim();
  const projectIdInput = String(
    context.projectId || payload.projectId || "",
  ).trim();
  const clientIdInput = String(
    context.clientId || payload.clientId || "",
  ).trim();

  let projectId = projectIdInput;
  let clientId = clientIdInput;
  if (taskId) {
    const task = await safeFirst(
      db,
      `SELECT project_id, client_id
       FROM tasks
       WHERE organization_id = ? AND id = ?
       LIMIT 1`,
      [principal.organizationId, taskId],
    );
    projectId = projectId || String(task?.project_id || "");
    clientId = clientId || String(task?.client_id || "");
  }

  if (projectId && !clientId) {
    const project = await safeFirst(
      db,
      `SELECT client_id FROM projects WHERE organization_id = ? AND id = ? LIMIT 1`,
      [principal.organizationId, projectId],
    );
    clientId = String(project?.client_id || "");
  }

  const targets = [
    taskId ? ["task", taskId] : null,
    projectId ? ["project", projectId] : null,
    clientId ? ["client", clientId] : null,
    ["organization", principal.organizationId],
  ].filter(Boolean) as Array<[string, string]>;

  for (const [targetType, targetId] of targets) {
    const repo = await safeFirst(
      db,
      `SELECT repo_url, repo_branch, workspace_hint, source
       FROM repository_links
       WHERE organization_id = ? AND target_type = ? AND target_id = ?
       ORDER BY updated_at DESC
       LIMIT 1`,
      [principal.organizationId, targetType, targetId],
    );

    if (repo?.repo_url) {
      return {
        repoUrl: String(repo.repo_url),
        repoBranch: String(repo.repo_branch || "main"),
        workspaceHint: repo.workspace_hint ? String(repo.workspace_hint) : null,
        inferred: true,
        source: `repository_links:${targetType}`,
      };
    }
  }

  const jobType = String(input.jobType || "");
  if (["codex_patch", "deploy"].includes(jobType)) {
    return {
      repoUrl: process.env.OPTIMA_DEFAULT_REPO_URL || DEFAULT_OPTIMA_REPO_URL,
      repoBranch: "main",
      workspaceHint: null,
      inferred: true,
      source: "default-optima-repository",
    };
  }

  return {
    repoUrl: null,
    repoBranch: null,
    workspaceHint: null,
    inferred: false,
    source: "none",
  };
}
