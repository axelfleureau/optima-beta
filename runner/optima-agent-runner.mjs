#!/usr/bin/env node
import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

const args = new Set(process.argv.slice(2))

if (args.has("--help") || args.has("-h")) {
  console.log(`Optima Agent Runner

Usage:
  node runner/optima-agent-runner.mjs [--once] [--dry-run]

Environment:
  OPTIMA_URL              https://appbeta.wearerighello.com
  OPTIMA_BASE_URL         alias supported for OPTIMA_URL
  AGENT_RUNNER_API_KEY    required bearer token
  RUNNER_ID               hostinger-codex-01
  WORK_ROOT               /srv/optima-agent/jobs
  WORKDIR                 alias supported for WORK_ROOT
  POLL_INTERVAL_MS        30000
  MAX_JOB_SECONDS         1800
  RUNNER_MODE             codex | dry-run
  CODEX_BIN               codex
  CODEX_MODEL             optional model override
  CODEX_SANDBOX           workspace-write | danger-full-access
  CODEX_BYPASS_SANDBOX    1 to pass --dangerously-bypass-approvals-and-sandbox
`)
  process.exit(0)
}

const config = {
  optimaUrl: env("OPTIMA_URL", env("OPTIMA_BASE_URL", "https://appbeta.wearerighello.com")).replace(/\/+$/, ""),
  apiKey: env("AGENT_RUNNER_API_KEY", ""),
  runnerId: env("RUNNER_ID", `hostinger-codex-${os.hostname()}`).slice(0, 80),
  workRoot: env("WORK_ROOT", env("WORKDIR", "/srv/optima-agent/jobs")),
  pollIntervalMs: numberEnv("POLL_INTERVAL_MS", 30_000),
  maxJobSeconds: numberEnv("MAX_JOB_SECONDS", 1_800),
  runnerMode: args.has("--dry-run") ? "dry-run" : env("RUNNER_MODE", "codex"),
  codexBin: env("CODEX_BIN", "codex"),
  codexModel: env("CODEX_MODEL", ""),
  codexSandbox: env("CODEX_SANDBOX", "workspace-write"),
  codexBypass: env("CODEX_BYPASS_SANDBOX", "0") === "1",
  once: args.has("--once"),
}

if (!config.apiKey) {
  log("error", "AGENT_RUNNER_API_KEY is required")
  process.exit(1)
}

process.on("SIGINT", () => {
  log("info", "Stopping runner")
  process.exit(0)
})

process.on("SIGTERM", () => {
  log("info", "Stopping runner")
  process.exit(0)
})

await mkdir(config.workRoot, { recursive: true })
log("info", `Runner ${config.runnerId} ready for ${config.optimaUrl}`)

do {
  try {
    const job = await claimJob()
    if (job) {
      await processJob(job)
    } else if (config.once) {
      log("info", "No queued job")
    } else {
      await sleep(config.pollIntervalMs)
    }
  } catch (error) {
    log("error", error instanceof Error ? error.message : String(error))
    if (config.once) process.exitCode = 1
    if (!config.once) await sleep(config.pollIntervalMs)
  }
} while (!config.once)

async function claimJob() {
  const response = await api("/api/agent-jobs/runner/claim", {
    method: "POST",
    body: { runnerId: config.runnerId },
  })

  return response.job ?? null
}

async function processJob(job) {
  const jobDir = path.join(config.workRoot, safeName(job.id))
  await mkdir(jobDir, { recursive: true })
  await writeJson(path.join(jobDir, "job.json"), job)

  log("info", `Claimed ${job.id}: ${job.title}`)

  const repoDir = await prepareWorkspace(job, jobDir)
  const prompt = buildPrompt(job, jobDir, repoDir)
  const promptPath = path.join(jobDir, "prompt.md")
  const stdoutPath = path.join(jobDir, "codex.stdout.log")
  const stderrPath = path.join(jobDir, "codex.stderr.log")
  const resultPath = path.join(jobDir, "result.md")
  await writeFile(promptPath, prompt, "utf8")

  let runResult
  if (config.runnerMode === "dry-run") {
    const summary = `Dry-run completato per job ${job.id}. Workspace preparato in ${jobDir}.`
    await writeFile(resultPath, `${summary}\n\nPrompt salvato in ${promptPath}\n`, "utf8")
    runResult = { exitCode: 0, stdout: summary, stderr: "" }
  } else {
    runResult = await runCodex({ prompt, cwd: repoDir, resultPath, stdoutPath, stderrPath })
  }

  const resultText = await readOptional(resultPath)
  const stdoutTail = tail(runResult.stdout)
  const stderrTail = tail(runResult.stderr)
  const success = runResult.exitCode === 0
  const summary = summarizeResult(resultText || runResult.stdout || runResult.stderr, success)

  await api(`/api/agent-jobs/runner/${encodeURIComponent(job.id)}/complete`, {
    method: "POST",
    body: {
      runnerId: config.runnerId,
      status: success ? "needs_review" : "failed",
      resultSummary: summary,
      errorMessage: success ? null : summary,
      resultPayload: {
        jobId: job.id,
        runnerId: config.runnerId,
        workDir: jobDir,
        repoDir,
        exitCode: runResult.exitCode,
        stdoutTail,
        stderrTail,
        resultText: resultText || null,
        generatedAt: new Date().toISOString(),
      },
      artifacts: [
        {
          type: "report",
          label: success ? "Runner report" : "Runner error report",
          metadata: {
            jobDir,
            repoDir,
            promptPath,
            stdoutPath,
            stderrPath,
            resultPath,
            exitCode: runResult.exitCode,
          },
        },
      ],
    },
  })

  log(success ? "info" : "error", `Completed ${job.id} with exit code ${runResult.exitCode}`)
}

async function prepareWorkspace(job, jobDir) {
  if (!job.repoUrl) return jobDir

  const repoDir = path.join(jobDir, "repo")
  if (existsSync(path.join(repoDir, ".git"))) return repoDir

  const cloneArgs = ["clone", "--depth", "1"]
  if (job.repoBranch) cloneArgs.push("--branch", job.repoBranch)
  cloneArgs.push(job.repoUrl, repoDir)

  const result = await runCommand("git", cloneArgs, { cwd: jobDir, timeoutMs: 300_000 })
  if (result.exitCode !== 0) {
    throw new Error(`git clone failed for ${job.repoUrl}: ${tail(result.stderr)}`)
  }

  return repoDir
}

async function runCodex({ prompt, cwd, resultPath, stdoutPath, stderrPath }) {
  const codexArgs = ["exec", "--color", "never", "--output-last-message", resultPath]

  if (config.codexModel) codexArgs.push("--model", config.codexModel)
  if (config.codexBypass) {
    codexArgs.push("--dangerously-bypass-approvals-and-sandbox")
  } else if (config.codexSandbox) {
    codexArgs.push("--sandbox", config.codexSandbox)
  }

  codexArgs.push("--cd", cwd, "--skip-git-repo-check", "-")

  const result = await runCommand(config.codexBin, codexArgs, {
    cwd,
    stdin: prompt,
    timeoutMs: config.maxJobSeconds * 1000,
  })

  await writeFile(stdoutPath, result.stdout, "utf8")
  await writeFile(stderrPath, result.stderr, "utf8")
  return result
}

async function runCommand(command, commandArgs, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, commandArgs, {
      cwd: options.cwd,
      env: { ...process.env, CI: "1", NO_COLOR: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""
    let killed = false
    const timeout = setTimeout(() => {
      killed = true
      child.kill("SIGTERM")
      setTimeout(() => child.kill("SIGKILL"), 10_000).unref()
    }, options.timeoutMs ?? config.maxJobSeconds * 1000)

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString()
    })
    child.on("error", (error) => {
      clearTimeout(timeout)
      resolve({ exitCode: 127, stdout, stderr: `${stderr}\n${error.message}` })
    })
    child.on("close", (exitCode) => {
      clearTimeout(timeout)
      resolve({
        exitCode: killed ? 124 : exitCode ?? 1,
        stdout,
        stderr: killed ? `${stderr}\nCommand timed out.` : stderr,
      })
    })

    if (options.stdin) {
      child.stdin.write(options.stdin)
    }
    child.stdin.end()
  })
}

function buildPrompt(job, jobDir, repoDir) {
  const input = JSON.stringify(job.input ?? {}, null, 2)
  const context = job.contextSummary ? `\n## Contesto\n${job.contextSummary}\n` : ""
  const repo = job.repoUrl
    ? `\n## Repository\n- URL: ${job.repoUrl}\n- Branch: ${job.repoBranch || "default"}\n- Workspace: ${repoDir}\n`
    : "\n## Repository\nNessun repository indicato. Produci un report operativo nel workspace del job.\n"

  return `Sei il runner agentico di Óptima per Righello.

Lavora in modo controllato e produci output revisionabile da un admin.

## Job
- ID: ${job.id}
- Tipo: ${job.jobType}
- Titolo: ${job.title}
- Priorita: ${job.priority}
- Runner: ${config.runnerId}
- Directory job: ${jobDir}
${repo}${context}
## Brief operativo
${job.brief}

## Input strutturato
\`\`\`json
${input}
\`\`\`

## Regole operative
- Non pubblicare secret nei log o nel report.
- Non fare deploy, commit o push se il brief non lo richiede esplicitamente.
- Se modifichi codice, lascia un riepilogo preciso dei file e dei test eseguiti.
- Se generi PDF, report o patch, indica il path prodotto.
- Se mancano dati critici, produci un report con blocchi e domande puntuali.
- Concludi sempre con un risultato leggibile per Óptima.

Scrivi la risposta finale in italiano.`
}

async function api(pathname, options) {
  const response = await fetch(`${config.optimaUrl}${pathname}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Invalid JSON from ${pathname}: ${text.slice(0, 240)}`)
  }

  if (!response.ok) {
    throw new Error(json.error ?? `HTTP ${response.status} on ${pathname}`)
  }

  return json
}

async function writeJson(filePath, value) {
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8")
}

async function readOptional(filePath) {
  try {
    return await readFile(filePath, "utf8")
  } catch {
    return ""
  }
}

function summarizeResult(text, success) {
  const clean = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
  if (!clean) return success ? "Job completato. Report disponibile negli artifact." : "Job fallito senza output utile."
  return clean.slice(0, 700)
}

function safeName(value) {
  const raw = String(value ?? "job").replace(/[^a-zA-Z0-9._-]/g, "-")
  const hash = createHash("sha1").update(String(value)).digest("hex").slice(0, 8)
  return `${raw.slice(0, 80)}-${hash}`
}

function tail(value, max = 4000) {
  const text = String(value ?? "")
  return text.length > max ? text.slice(text.length - max) : text
}

function env(name, fallback) {
  return process.env[name] || fallback
}

function numberEnv(name, fallback) {
  const parsed = Number(process.env[name])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function log(level, message) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}`
  if (level === "error") console.error(line)
  else console.log(line)
}
