import type { WorkspacePrincipal } from "@/lib/workspace-db"

const DEFAULT_GITHUB_OWNER_EMAILS = [
  "axel@wearerighello.com",
  "fleureau.axel@gmail.com",
]

const DEFAULT_REPOSITORY_PATTERNS = [
  "axelfleureau/*",
  "https://github.com/axelfleureau/*",
]

export type GitHubOwnerPolicy = {
  mode: "owner_scoped"
  ownerEmails: string[]
  allowedRepositoryPatterns: string[]
  commitPushEnabled: boolean
  deployEnabled: boolean
  connectorInstallState: string
  oauthSubject: string | null
  updatedAt: string | null
}

function configuredGitHubOwnerEmails() {
  const raw = process.env.OPTIMA_GITHUB_OWNER_EMAILS || process.env.AXEL_GITHUB_OWNER_EMAILS || ""
  const configured = raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  return configured.length ? configured : DEFAULT_GITHUB_OWNER_EMAILS
}

function parseJsonObject(value: unknown): Record<string, any> {
  if (!value || typeof value !== "string") return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function normalizeStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function normalizeOwnerEmails(value: unknown) {
  const explicit = normalizeStringList(value)
    .map((email) => email.toLowerCase())
    .filter((email) => email.includes("@"))
  return explicit.length ? explicit : configuredGitHubOwnerEmails()
}

function normalizeRepositoryPatterns(value: unknown) {
  const explicit = normalizeStringList(value).map((pattern) => pattern.toLowerCase())
  return explicit.length ? explicit : DEFAULT_REPOSITORY_PATTERNS
}

function defaultGitHubPolicy(): GitHubOwnerPolicy {
  return {
    mode: "owner_scoped",
    ownerEmails: configuredGitHubOwnerEmails(),
    allowedRepositoryPatterns: DEFAULT_REPOSITORY_PATTERNS,
    commitPushEnabled: true,
    deployEnabled: true,
    connectorInstallState: "not_installed",
    oauthSubject: null,
    updatedAt: null,
  }
}

export async function getGitHubOwnerPolicy(db: any, organizationId: string): Promise<GitHubOwnerPolicy> {
  const row = await db
    .prepare(
      `SELECT install_state, config_json, oauth_subject, updated_at
       FROM mcp_connector_installations
       WHERE organization_id = ? AND connector_id = 'github'
       LIMIT 1`,
    )
    .bind(organizationId)
    .first()

  if (!row) return defaultGitHubPolicy()

  const config = parseJsonObject(row.config_json)
  const policyConfig = parseJsonObject(JSON.stringify(config.ownerPolicy || {}))

  return {
    mode: "owner_scoped",
    ownerEmails: normalizeOwnerEmails(policyConfig.ownerEmails),
    allowedRepositoryPatterns: normalizeRepositoryPatterns(policyConfig.allowedRepositoryPatterns),
    commitPushEnabled: policyConfig.commitPushEnabled !== false,
    deployEnabled: policyConfig.deployEnabled !== false,
    connectorInstallState: String(row.install_state || "not_installed"),
    oauthSubject: row.oauth_subject ? String(row.oauth_subject) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  }
}

function normalizeGitHubRepository(value: string | null | undefined) {
  const raw = String(value || "").trim().toLowerCase()
  if (!raw) return ""
  const withoutGit = raw.replace(/\.git$/, "")
  const httpsMatch = withoutGit.match(/github\.com[:/]+([^/\s]+)\/([^/\s#?]+)/)
  if (httpsMatch) return `${httpsMatch[1]}/${httpsMatch[2]}`
  const shorthand = withoutGit.match(/^([^/\s]+)\/([^/\s#?]+)$/)
  if (shorthand) return `${shorthand[1]}/${shorthand[2]}`
  return withoutGit
}

function repositoryPatternMatches(repository: string, pattern: string) {
  const repo = normalizeGitHubRepository(repository)
  const normalizedPattern = normalizeGitHubRepository(pattern)
  if (!repo || !normalizedPattern) return false
  if (normalizedPattern === "*" || normalizedPattern === repo) return true
  if (normalizedPattern.endsWith("/*")) {
    return repo.startsWith(normalizedPattern.slice(0, -1))
  }
  return false
}

export function isRepositoryAllowedByGitHubPolicy(repository: string | null | undefined, policy: GitHubOwnerPolicy) {
  return policy.allowedRepositoryPatterns.some((pattern) => repositoryPatternMatches(repository || "", pattern))
}

export function isGitHubOwnerPrincipal(principal: WorkspacePrincipal, policy: GitHubOwnerPolicy = defaultGitHubPolicy()) {
  const email = principal.email.trim().toLowerCase()
  return Boolean(email && policy.ownerEmails.includes(email))
}

export async function canUseGitHubOwnerCapability(
  db: any,
  principal: WorkspacePrincipal,
  repositoryUrl?: string | null,
) {
  const policy = await getGitHubOwnerPolicy(db, principal.organizationId)
  if (!isGitHubOwnerPrincipal(principal, policy)) {
    return { allowed: false, reason: "not_github_owner", policy }
  }
  if (!policy.commitPushEnabled) {
    return { allowed: false, reason: "commit_push_disabled", policy }
  }
  if (repositoryUrl && !isRepositoryAllowedByGitHubPolicy(repositoryUrl, policy)) {
    return { allowed: false, reason: "repository_not_allowed", policy }
  }
  return { allowed: true, reason: "allowed", policy }
}

export function githubOwnerPolicySummary(policy: GitHubOwnerPolicy = defaultGitHubPolicy()) {
  const owners = policy.ownerEmails.join(", ")
  const repos = policy.allowedRepositoryPatterns.join(", ")
  const deploy = policy.deployEnabled ? "deploy abilitato" : "deploy disabilitato"
  return `GitHub aziendale è una capability personale dell'owner tecnico: solo ${owners} può attivare commit, push e deploy. Scope repository: ${repos}. Stato: ${deploy}.`
}
