import { TaskReportImporter } from "@/components/tasks/task-report-importer"

const pageClass =
  "h-[calc(100svh-73px)] overflow-y-auto overscroll-contain bg-[#050914] text-slate-100 md:h-auto md:min-h-screen md:overflow-visible"

export default function ImportaTaskPage() {
  return (
    <div className={pageClass}>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 md:py-8">
        <header className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-righello-pink">Command center</p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">Importa task operative.</h1>
          <p className="mt-4 text-base leading-7 text-slate-400 md:text-lg">
            Incolla un report operativo GitHub o un riepilogo strutturato: Optima lo divide per data e progetto, verifica duplicati e crea task reali collegate al workspace.
          </p>
        </header>

        <TaskReportImporter />
      </main>
    </div>
  )
}
