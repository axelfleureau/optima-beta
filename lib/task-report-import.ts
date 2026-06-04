export type ParsedTaskReportItem = {
  dateLabel: string
  dateIso: string
  projectName: string
  repo: string
  title: string
  description: string
  richDescription: string
  areas: string
  fileHints: string[]
  taskBullets: string[]
  projectId: string
  clientId: string
  clientName: string
  type: string
  workflowStatus: "in-progress" | "done"
  priority: "low" | "medium" | "high" | "urgent"
  score: number
  tags: string[]
  createdAt: string
  dueAt: string
}

export type ProjectImportTarget = {
  projectId: string
  clientId: string
  clientName: string
  projectName: string
  type: string
}

const PROJECT_TARGETS: Record<string, ProjectImportTarget> = {
  "solero sport village": {
    projectId: "project_internal_solero_sport_village",
    clientId: "client_rig_ssvo",
    clientName: "Solero Sport Village",
    projectName: "Solero Sport Village",
    type: "Frontend / Admin CMS",
  },
  "revolut crypto scalper": {
    projectId: "project_internal_revolut_crypto_scalper",
    clientId: "client_internal_righello_ops",
    clientName: "Righello",
    projectName: "Revolut Crypto Scalper",
    type: "Trading Automation",
  },
  optima: {
    projectId: "project_internal_optima",
    clientId: "client_internal_righello_ops",
    clientName: "Righello",
    projectName: "Optima",
    type: "Gestionale interno",
  },
  portopiccolo: {
    projectId: "project_internal_portopiccolo",
    clientId: "client_rig_ppap",
    clientName: "Portopiccolo",
    projectName: "Portopiccolo",
    type: "Booking / Operations",
  },
  "finestre art": {
    projectId: "project_internal_finestre_art",
    clientId: "client_rig_finestre_art",
    clientName: "Finestre Art",
    projectName: "Finestre Art",
    type: "Frontend / Branding",
  },
  "canale77 ott platform": {
    projectId: "project_internal_canale77_ott_platform",
    clientId: "client_internal_canale77",
    clientName: "Canale77",
    projectName: "Canale77 OTT Platform",
    type: "OTT Platform",
  },
  "dico online site": {
    projectId: "project_internal_dico_online_site",
    clientId: "client_internal_dico_online",
    clientName: "DICO Online",
    projectName: "DICO Online Site",
    type: "Frontend / Institutional UX",
  },
  "obs padel stream overlay": {
    projectId: "project_internal_obs_padel_stream_overlay",
    clientId: "client_internal_righello_ops",
    clientName: "Righello",
    projectName: "Righello Live Studio",
    type: "Prodotto Righello / Live Production",
  },
  "scale site": {
    projectId: "project_internal_scale_site",
    clientId: "client_internal_righello_ops",
    clientName: "Righello",
    projectName: "Scale Site",
    type: "SEO / Design System",
  },
  "righello site": {
    projectId: "project_internal_righello_site",
    clientId: "client_internal_righello_ops",
    clientName: "Righello",
    projectName: "Righello Site",
    type: "SEO locale / Sito Righello",
  },
  tetha: {
    projectId: "project_internal_tetha",
    clientId: "client_internal_righello_ops",
    clientName: "Righello",
    projectName: "Tetha",
    type: "Prodotto Righello",
  },
  buffr: {
    projectId: "project_internal_buffr",
    clientId: "client_internal_righello_ops",
    clientName: "Righello",
    projectName: "BUFFR",
    type: "Mobile / App Store",
  },
  "lumis / photo publisher righello": {
    projectId: "project_internal_lumis_photo_publisher",
    clientId: "client_internal_righello_ops",
    clientName: "Righello",
    projectName: "Lumis / Photo Publisher Righello",
    type: "Mobile / Media Product",
  },
  "reguta gest": {
    projectId: "project_internal_reguta_gest",
    clientId: "client_rig_reca",
    clientName: "Reguta Cantina / Anselmi",
    projectName: "Reguta Gest",
    type: "Gestionale / Access Control",
  },
}

const MONTHS: Record<string, string> = {
  gennaio: "01",
  febbraio: "02",
  marzo: "03",
  aprile: "04",
  maggio: "05",
  giugno: "06",
  luglio: "07",
  agosto: "08",
  settembre: "09",
  ottobre: "10",
  novembre: "11",
  dicembre: "12",
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function slug(value: string) {
  return normalizeKey(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function parseDateLabel(heading: string) {
  const match = heading.match(/(\d{1,2})\s+([a-zà]+)\s+(\d{4})/i)
  if (!match) return null
  const [, day, monthName, year] = match
  const month = MONTHS[normalizeKey(monthName)]
  if (!month) return null
  const dateIso = `${year}-${month}-${day.padStart(2, "0")}`
  return {
    dateIso,
    dateLabel: heading.replace(/^#+\s*/, "").trim(),
  }
}

function parseDateFromPeriod(content: string) {
  const match = content.match(/periodo\s+(?:analizzato|aggiunto):\s*(?:dal\s*)?(\d{1,2})\s+([a-zà]+)\s+(\d{4})/i)
  if (!match) return null
  const [, day, monthName, year] = match
  const month = MONTHS[normalizeKey(monthName)]
  if (!month) return null

  return {
    dateIso: `${year}-${month}-${day.padStart(2, "0")}`,
    dateLabel: `${day} ${monthName} ${year}`,
  }
}

function isProjectHeading(heading: string) {
  const key = normalizeKey(heading)
  if (!key || parseDateLabel(heading)) return false

  const nonProjectHeadings = [
    "riepilogo",
    "riepilogo generale",
    "dettagli tecnici",
    "criticita",
    "criticità",
    "macro aree",
    "fonte",
    "periodo",
    "obiettivo",
  ]

  return !nonProjectHeadings.some((value) => key.startsWith(value))
}

function parseInlineFileHints(value: string) {
  const backtickMatches = Array.from(value.matchAll(/`([^`]+)`/g)).map((match) => match[1].trim())
  if (backtickMatches.length > 0) return backtickMatches

  return value
    .split(",")
    .map((item) => item.replace(/`/g, "").trim())
    .filter(Boolean)
}

function getTarget(projectName: string): ProjectImportTarget {
  const key = normalizeKey(projectName)
  return (
    PROJECT_TARGETS[key] || {
      projectId: `project_internal_${slug(projectName).replace(/-/g, "_")}`,
      clientId: "client_internal_righello_ops",
      clientName: "Righello",
      projectName,
      type: "Operazioni",
    }
  )
}

function choosePriority(projectName: string, tasks: string[]): ParsedTaskReportItem["priority"] {
  const text = `${projectName} ${tasks.join(" ")}`.toLowerCase()
  if (text.includes("risk") || text.includes("booking") || text.includes("production") || text.includes("deploy")) {
    return "high"
  }
  if (tasks.length >= 10) return "high"
  if (tasks.length <= 2) return "medium"
  return "medium"
}

function chooseWorkflowStatus(): ParsedTaskReportItem["workflowStatus"] {
  // Operational reports describe work already done. The linked project can stay active separately.
  return "done"
}

function createdAtFor(dateIso: string, blockIndex: number, dateLabel: string) {
  if (dateLabel.toLowerCase().includes("sera")) return `${dateIso}T21:30:00.000Z`
  if (dateLabel.toLowerCase().includes("mattina")) return `${dateIso}T09:30:00.000Z`
  const hour = Math.min(17, 9 + Math.floor(blockIndex / 2))
  const minute = blockIndex % 2 === 0 ? "00" : "30"
  return `${dateIso}T${String(hour).padStart(2, "0")}:${minute}:00.000Z`
}

export function parseTaskReport(content: string): ParsedTaskReportItem[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n")
  const items: ParsedTaskReportItem[] = []
  let currentDate: { dateIso: string; dateLabel: string } | null = parseDateFromPeriod(content)
  let currentProject = ""
  let repo = ""
  let tasks: string[] = []
  let areas = ""
  let fileHints: string[] = []
  let mode: "none" | "tasks" | "files" | "details" = "none"
  let blockIndex = 0

  const flush = () => {
    if (!currentDate || !currentProject || tasks.length === 0) return
    const target = getTarget(currentProject)
    const firstTask = tasks[0].replace(/\.$/, "")
    const createdAt = createdAtFor(currentDate.dateIso, blockIndex, currentDate.dateLabel)
    const dueAt = currentDate.dateLabel.toLowerCase().includes("sera")
      ? `${currentDate.dateIso}T23:32:00.000Z`
      : `${currentDate.dateIso}T18:00:00.000Z`

    items.push({
      dateLabel: currentDate.dateLabel,
      dateIso: currentDate.dateIso,
      projectName: target.projectName,
      repo,
      title: `${currentDate.dateIso} - ${target.projectName}: ${firstTask}`,
      description: `${firstTask}${tasks.length > 1 ? ` e altre ${tasks.length - 1} attività operative.` : "."}`,
      richDescription: tasks.join(" "),
      areas,
      fileHints,
      taskBullets: tasks,
      projectId: target.projectId,
      clientId: target.clientId,
      clientName: target.clientName,
      type: areas || target.type,
      workflowStatus: chooseWorkflowStatus(),
      priority: choosePriority(target.projectName, tasks),
      score: Math.min(10, Math.max(5, Math.round(5 + tasks.length / 3))),
      tags: [
        "github-real",
        currentDate.dateIso,
        slug(target.projectName),
        "report-import",
        ...(repo ? [repo.replace("axelfleureau/", "")] : []),
      ],
      createdAt,
      dueAt,
    })

    blockIndex += 1
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (line.startsWith("## ")) {
      flush()
      const heading = line.replace(/^##\s*/, "").trim()
      const parsedDate = parseDateLabel(line)
      if (parsedDate) {
        currentDate = parsedDate
        blockIndex = 0
        currentProject = ""
        repo = ""
        tasks = []
        areas = ""
        fileHints = []
        mode = "none"
        continue
      }

      if (isProjectHeading(heading)) {
        currentProject = heading
        repo = ""
        tasks = []
        areas = ""
        fileHints = []
        mode = "tasks"
        continue
      }

      currentProject = ""
      repo = ""
      tasks = []
      areas = ""
      fileHints = []
      mode = "none"
      continue
    }

    if (line.startsWith("### Progetto:")) {
      flush()
      currentProject = line.replace(/^### Progetto:\s*/i, "").trim()
      repo = ""
      tasks = []
      areas = ""
      fileHints = []
      mode = "tasks"
      continue
    }

    if (/^###\s+dettagli tecnici/i.test(line)) {
      mode = "details"
      continue
    }

    if (line.startsWith("Repo:")) {
      repo = line.replace(/^Repo:\s*/i, "").replace(/`/g, "").trim()
      continue
    }

    if (/^Task svolti:/i.test(line)) {
      mode = "tasks"
      continue
    }

    if (/^Aree:/i.test(line)) {
      areas = line.replace(/^Aree:\s*/i, "").trim()
      mode = "none"
      continue
    }

    if (mode === "details" && /^-\s*Aree:/i.test(line)) {
      areas = line.replace(/^-\s*Aree:\s*/i, "").trim()
      continue
    }

    if (/^File principali:/i.test(line)) {
      mode = "files"
      continue
    }

    if (mode === "details" && /^-\s*File principali:/i.test(line)) {
      fileHints.push(...parseInlineFileHints(line.replace(/^-\s*File principali:\s*/i, "").trim()))
      continue
    }

    if (mode === "tasks" && line.startsWith("- ")) {
      tasks.push(line.replace(/^-\s*/, "").trim())
      continue
    }

    if (mode === "files" && line.startsWith("- ")) {
      fileHints.push(line.replace(/^-\s*/, "").replace(/`/g, "").trim())
    }
  }

  flush()
  return items
}

export function looksLikeOperationalTaskReport(value: string) {
  const text = value.trim()
  if (!text) return false
  const lower = text.toLowerCase()
  const strongSignals =
    lower.includes("attività operative") ||
    lower.includes("task svolti:") ||
    lower.includes("### progetto:") ||
    lower.includes("periodo analizzato:")

  return strongSignals && (text.length > 300 || lower.includes("inserisci in optima"))
}

export function getProjectImportTargets() {
  return Object.values(PROJECT_TARGETS)
}
