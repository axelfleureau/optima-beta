import { TaskReportImporter } from "@/components/tasks/task-report-importer";

const pageClass = "optima-ops-page";

export default function ImportaTaskPage() {
  return (
    <div className={pageClass}>
      <main className="optima-ops-container optima-ops-stack">
        <header className="max-w-3xl">
          <p className="optima-ops-eyebrow">Command center</p>
          <h1 className="optima-ops-title mt-3">Importa task operative.</h1>
          <p className="optima-ops-subtitle mt-4">
            Incolla un report operativo GitHub o un riepilogo strutturato:
            Optima lo divide per data e progetto, verifica duplicati e crea task
            reali collegate al workspace.
          </p>
        </header>

        <TaskReportImporter />
      </main>
    </div>
  );
}
