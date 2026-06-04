import { AgentJobsClient } from "@/components/agent-jobs/agent-jobs-client"
import { AGENT_ADMIN_ROLES, listAgentJobs } from "@/lib/agent-jobs"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { requireClerkUser } from "@/lib/server-clerk"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

export const dynamic = "force-dynamic"

const pageClass =
  "h-[calc(100svh-73px)] overflow-y-auto overscroll-contain bg-[#050914] text-slate-100 md:h-auto md:min-h-screen md:overflow-visible"

export default async function AgentiPage() {
  const user = await requireClerkUser()
  const db = await getCloudflareDb()

  if (!user) {
    return (
      <div className={pageClass}>
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 text-slate-300">
            Accedi per usare la control room agentica.
          </div>
        </main>
      </div>
    )
  }

  if (!db) {
    return (
      <div className={pageClass}>
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-5 text-red-100">
            Database Cloudflare non disponibile.
          </div>
        </main>
      </div>
    )
  }

  const principal = await ensureWorkspacePrincipal(db, user)
  if (!AGENT_ADMIN_ROLES.has(principal.role)) {
    return (
      <div className={pageClass}>
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 text-slate-300">
            La control room agentica è riservata a direzione e admin.
          </div>
        </main>
      </div>
    )
  }

  const jobs = await listAgentJobs(db, principal.organizationId)

  return (
    <div className={pageClass}>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 md:py-8">
        <header className="max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-righello-pink">Óptima AI Ops</p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">
            Base operativa agentica.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-400 md:text-lg">
            Crea job per Codex Runner, preventivi strutturati, patch, report e task update. Óptima orchestra, il VPS esegue in sandbox, la direzione approva.
          </p>
        </header>

        <AgentJobsClient initialJobs={jobs} />
      </main>
    </div>
  )
}
