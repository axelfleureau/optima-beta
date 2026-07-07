import { AgentJobsClient } from "@/components/agent-jobs/agent-jobs-client";
import { getAgentRunnerControlState } from "@/lib/agent-runner-control";
import {
  AGENT_ADMIN_ROLES,
  listAgentJobs,
  listAgentRunnerHeartbeats,
} from "@/lib/agent-jobs";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";

export const dynamic = "force-dynamic";

const pageClass = "optima-ops-page";

export default async function AgentiPage() {
  const user = await requireClerkUser();
  const db = await getCloudflareDb();

  if (!user) {
    return (
      <div className={pageClass}>
        <main className="optima-ops-container">
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 text-slate-300">
            Accedi per usare la control room agentica.
          </div>
        </main>
      </div>
    );
  }

  if (!db) {
    return (
      <div className={pageClass}>
        <main className="optima-ops-container">
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-5 text-red-100">
            Database Cloudflare non disponibile.
          </div>
        </main>
      </div>
    );
  }

  const principal = await ensureWorkspacePrincipal(db, user);
  if (!AGENT_ADMIN_ROLES.has(principal.role)) {
    return (
      <div className={pageClass}>
        <main className="optima-ops-container">
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 text-slate-300">
            La control room agentica è riservata a direzione e admin.
          </div>
        </main>
      </div>
    );
  }

  const jobs = await listAgentJobs(db, principal.organizationId);
  let runners: Awaited<ReturnType<typeof listAgentRunnerHeartbeats>> = [];
  try {
    runners = await listAgentRunnerHeartbeats(db);
  } catch (error) {
    console.warn("Runner heartbeat table unavailable:", error);
  }

  return (
    <div className={pageClass}>
      <main className="optima-ops-container optima-ops-stack">
        <header className="max-w-4xl">
          <p className="optima-ops-eyebrow">Optima Agentic OS</p>
          <h1 className="optima-ops-title mt-3">Control room agentica.</h1>
          <p className="optima-ops-subtitle mt-4">
            Trasforma richieste operative in job revisionabili: Optima risolve
            grafo, repository, subagenti e runtime; il runner VPS esegue in
            sandbox e la direzione decide cosa approvare.
          </p>
        </header>

        <AgentJobsClient
          initialJobs={jobs}
          initialRunners={runners}
          initialRunnerControl={getAgentRunnerControlState()}
        />
      </main>
    </div>
  );
}
