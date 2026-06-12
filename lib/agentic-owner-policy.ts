import type { WorkspacePrincipal } from "@/lib/workspace-db"

const DEFAULT_GITHUB_OWNER_EMAILS = [
  "axel@wearerighello.com",
  "fleureau.axel@gmail.com",
]

function configuredGitHubOwnerEmails() {
  const raw = process.env.OPTIMA_GITHUB_OWNER_EMAILS || process.env.AXEL_GITHUB_OWNER_EMAILS || ""
  const configured = raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  return configured.length ? configured : DEFAULT_GITHUB_OWNER_EMAILS
}

export function isGitHubOwnerPrincipal(principal: WorkspacePrincipal) {
  const email = principal.email.trim().toLowerCase()
  return Boolean(email && configuredGitHubOwnerEmails().includes(email))
}

export function githubOwnerPolicySummary() {
  return "GitHub aziendale è una capability personale dell'owner tecnico: solo Axel o email esplicitamente configurate in OPTIMA_GITHUB_OWNER_EMAILS possono attivare commit, push e deploy."
}
