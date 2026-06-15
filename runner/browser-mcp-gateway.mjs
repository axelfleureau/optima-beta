#!/usr/bin/env node
import { spawn } from "node:child_process"
import { createServer } from "node:http"
import net from "node:net"
import { createHash, randomBytes } from "node:crypto"
import { mkdir } from "node:fs/promises"
import { existsSync } from "node:fs"

const config = {
  host: process.env.BROWSER_MCP_HOST || "0.0.0.0",
  port: Number(process.env.BROWSER_MCP_PORT || 8789),
  chromeHost: "127.0.0.1",
  chromePort: Number(process.env.BROWSER_MCP_CHROME_PORT || 9233),
  profileDir: process.env.BROWSER_MCP_PROFILE_DIR || "/srv/optima-agent/browser-profiles/righello",
  chromeBin: process.env.BROWSER_MCP_CHROME_BIN || "",
  mode: process.env.BROWSER_MCP_MODE || "desktop",
  display: process.env.BROWSER_MCP_DISPLAY || ":109",
  vncPort: Number(process.env.BROWSER_MCP_VNC_PORT || 5909),
  noVncHost: process.env.BROWSER_MCP_NOVNC_HOST || "127.0.0.1",
  noVncPort: Number(process.env.BROWSER_MCP_NOVNC_PORT || 8790),
  noVncWebDir: process.env.BROWSER_MCP_NOVNC_WEB || "/usr/share/novnc",
}

const targets = new Map([
  ["chatgpt", "https://chatgpt.com"],
  ["gemini", "https://gemini.google.com/app"],
  ["nanobanana", "https://gemini.google.com/app"],
  ["nano-banana", "https://gemini.google.com/app"],
  ["perplexity", "https://www.perplexity.ai"],
  ["claude", "https://claude.ai"],
])

let chromeProcess = null
let startingChrome = null
let chromeLaunchMode = "stopped"
let displayProcess = null
let vncProcess = null
let noVncProcess = null
let activePageTarget = null

await mkdir(config.profileDir, { recursive: true })

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`)

    if (url.pathname === "/health") {
      const chromeReady = await isChromeReady()
      json(response, 200, {
        ok: true,
        chromeReady,
        launchMode: chromeLaunchMode,
        requestedMode: config.mode,
        remoteBrowserReady: Boolean(noVncProcess),
        remoteBrowserUrl: remoteBrowserUrl(request),
        profileDir: config.profileDir,
        port: config.port,
      })
      return
    }

    if (url.pathname === "/pair") {
      const session = url.searchParams.get("session") || ""
      const code = url.searchParams.get("code") || ""
      const target = url.searchParams.get("target") || "chatgpt"
      const callback = url.searchParams.get("callback") || ""
      const startUrl = targets.get(target) || targets.get("chatgpt")

      if (!/^bmcp_[a-f0-9]{32}$/.test(session) || !/^[A-F0-9]{4}-[A-F0-9]{4}$/.test(code)) {
        html(response, 400, page("Pairing non valido", "Sessione o codice pairing non validi. Torna in Optima e avvia una nuova sessione."))
        return
      }

      await ensureChrome()
      const pageTarget = await openChromeTarget(startUrl)
      activePageTarget = pageTarget
      if (callback) notifyCallback(callback, { session, status: "opened", target, openedAt: new Date().toISOString() }).catch(() => {})

      html(response, 200, page(
        `Login ${target}`,
        [
          `<div class="badge">Codice pairing ${escapeHtml(code)}</div>`,
          `<p>Usa il Chromium isolato del VPS. Non inserire credenziali dentro Optima e non usare API key per questo passaggio.</p>`,
          `<div class="actions">`,
          `<a class="button" href="${escapeHtml(remoteControlUrl(request, session, code))}">Apri browser controllabile</a>`,
          `<a class="secondary" href="${escapeHtml(remoteBrowserUrl(request))}">Solo noVNC</a>`,
          `<a class="secondary" href="/complete?session=${encodeURIComponent(session)}&code=${encodeURIComponent(code)}&target=${encodeURIComponent(target)}&callback=${encodeURIComponent(callback)}">Ho completato il login</a>`,
          `</div>`,
          `<p class="hint">Da iPhone usa “Apri browser controllabile”: include noVNC e una tastiera nativa sotto la vista remota. Tocca prima il campo nel browser remoto, poi scrivi nella tastiera mobile. Se ChatGPT continua a chiedere verifica umana, completa il pairing dal Mac collegato alla tailnet.</p>`,
          `<div class="actions"><a class="secondary" href="/health">Verifica gateway</a></div>`,
          `<details><summary>Fallback tecnico DevTools</summary><p><a class="secondary" href="${escapeHtml(devtoolsUrl(request, pageTarget))}">Apri DevTools</a></p></details>`,
        ].join("\n"),
      ))
      return
    }

    if (url.pathname === "/remote") {
      const session = url.searchParams.get("session") || ""
      const code = url.searchParams.get("code") || ""
      if (!/^bmcp_[a-f0-9]{32}$/.test(session) || !/^[A-F0-9]{4}-[A-F0-9]{4}$/.test(code)) {
        html(response, 400, page("Sessione non valida", "Torna in Optima e avvia una nuova sessione Browser MCP."))
        return
      }

      await ensureChrome()
      html(response, 200, remoteControlPage(request, session, code))
      return
    }

    if (url.pathname === "/type") {
      const session = url.searchParams.get("session") || ""
      const code = url.searchParams.get("code") || ""
      if (!/^bmcp_[a-f0-9]{32}$/.test(session) || !/^[A-F0-9]{4}-[A-F0-9]{4}$/.test(code)) {
        json(response, 400, { ok: false, error: "Sessione o codice non validi." })
        return
      }

      await ensureChrome()
      const payload = await readJsonBody(request)
      await sendChromeInput(payload)
      json(response, 200, { ok: true })
      return
    }

    if (url.pathname === "/complete") {
      const session = url.searchParams.get("session") || ""
      const code = url.searchParams.get("code") || ""
      const target = url.searchParams.get("target") || "chatgpt"
      const callback = url.searchParams.get("callback") || ""

      if (!/^bmcp_[a-f0-9]{32}$/.test(session) || !/^[A-F0-9]{4}-[A-F0-9]{4}$/.test(code) || !callback) {
        html(response, 400, page("Pairing non valido", "Sessione, codice o callback non validi. Torna in Optima e avvia una nuova sessione."))
        return
      }

      await notifyCallback(callback, {
        session,
        status: "login_completed_by_user",
        target,
        completedAt: new Date().toISOString(),
      })

      html(response, 200, page(
        "Login registrato",
        [
          `<p>Optima ha ricevuto la conferma del login nel profilo Browser MCP.</p>`,
          `<p>Ora torna in Optima ed esegui il job health-check prima di usare il connector in produzione.</p>`,
          `<div class="actions"><a class="button" href="/health">Verifica gateway</a></div>`,
        ].join("\n"),
      ))
      return
    }

    if (url.pathname.startsWith("/json") || url.pathname.startsWith("/devtools/")) {
      proxyHttp(request, response)
      return
    }

    html(response, 200, page("Optima Browser MCP Gateway", [
      `<p>Gateway attivo. Per creare una sessione valida apri Optima, sezione Agenti, e usa il wizard Browser MCP.</p>`,
      `<div class="actions"><a class="button" href="/health">Verifica gateway</a></div>`,
    ].join("\n")))
  } catch (error) {
    html(response, 500, page("Errore gateway", error instanceof Error ? error.message : String(error)))
  }
})

server.on("upgrade", (request, socket, head) => {
  const upstream = net.connect(config.chromePort, config.chromeHost, () => {
    upstream.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n`)
    for (const [key, value] of Object.entries(request.headers)) {
      if (Array.isArray(value)) {
        for (const item of value) upstream.write(`${key}: ${item}\r\n`)
      } else if (value) {
        upstream.write(`${key}: ${value}\r\n`)
      }
    }
    upstream.write("\r\n")
    if (head.length) upstream.write(head)
    socket.pipe(upstream)
    upstream.pipe(socket)
  })
  socket.on("error", () => upstream.destroy())
  upstream.on("error", () => socket.destroy())
})

server.listen(config.port, config.host, () => {
  console.log(`Optima Browser MCP Gateway listening on ${config.host}:${config.port}`)
  console.log(`Profile: ${config.profileDir}`)
})

async function ensureChrome() {
  if (await isChromeReady()) return
  if (startingChrome) return startingChrome

  startingChrome = (async () => {
    const chromeBin = config.chromeBin || findChrome()
    if (!chromeBin) {
      throw new Error("Chromium non trovato. Installa chromium/google-chrome o imposta BROWSER_MCP_CHROME_BIN.")
    }

    await ensureDesktopServices()

    const commonChromeArgs = [
      `--remote-debugging-address=${config.chromeHost}`,
      `--remote-debugging-port=${config.chromePort}`,
      "--remote-allow-origins=*",
      `--user-data-dir=${config.profileDir}`,
      "--no-sandbox",
      "--no-first-run",
      "--no-default-browser-check",
      "--noerrdialogs",
      "--disable-dev-shm-usage",
      "--window-size=1440,1000",
      "about:blank",
    ]

    const { command, args, launchMode, env } = buildChromeLaunch(chromeBin, commonChromeArgs)
    chromeLaunchMode = launchMode
    console.log(`Starting Chrome with Browser MCP mode=${launchMode}`)

    chromeProcess = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
      env: { ...process.env, ...env },
    })

    chromeProcess.stdout.on("data", (chunk) => process.stdout.write(`[chrome] ${chunk}`))
    chromeProcess.stderr.on("data", (chunk) => process.stderr.write(`[chrome] ${chunk}`))
    chromeProcess.on("exit", (code, signal) => {
      console.log(`Chrome exited code=${code} signal=${signal}`)
      chromeProcess = null
      chromeLaunchMode = "stopped"
    })

    const deadline = Date.now() + 12_000
    while (Date.now() < deadline) {
      if (await isChromeReady()) return
      await sleep(300)
    }
    throw new Error("Chromium avviato ma remote debugging non risponde.")
  })()

  try {
    await startingChrome
  } finally {
    startingChrome = null
  }
}

async function ensureDesktopServices() {
  const requestedMode = String(config.mode || "desktop").toLowerCase()
  if (["headless", "headless-new"].includes(requestedMode)) return

  if (!process.env.DISPLAY && !displayProcess && !displayLockExists()) {
    const xvfb = findExecutable([process.env.BROWSER_MCP_XVFB || "", "/usr/bin/Xvfb", "/bin/Xvfb"])
    if (xvfb) {
      displayProcess = spawn(xvfb, [config.display, "-screen", "0", "1440x1000x24", "-ac"], {
        stdio: ["ignore", "pipe", "pipe"],
        detached: false,
      })
      displayProcess.stderr.on("data", (chunk) => process.stderr.write(`[xvfb] ${chunk}`))
      displayProcess.on("exit", (code, signal) => {
        console.log(`Xvfb exited code=${code} signal=${signal}`)
        displayProcess = null
      })
      await sleep(500)
    }
  }

  const display = process.env.DISPLAY || (displayProcess || displayLockExists() ? config.display : "")
  if (!display) return

  if (!vncProcess) {
    const x11vnc = findExecutable([process.env.BROWSER_MCP_X11VNC || "", "/usr/bin/x11vnc", "/bin/x11vnc"])
    if (x11vnc) {
      vncProcess = spawn(x11vnc, [
        "-display", display,
        "-localhost",
        "-nopw",
        "-forever",
        "-shared",
        "-noshm",
        "-rfbport", String(config.vncPort),
        "-quiet",
      ], {
        stdio: ["ignore", "pipe", "pipe"],
        detached: false,
      })
      vncProcess.stderr.on("data", (chunk) => process.stderr.write(`[x11vnc] ${chunk}`))
      vncProcess.on("exit", (code, signal) => {
        console.log(`x11vnc exited code=${code} signal=${signal}`)
        vncProcess = null
      })
      await sleep(300)
    }
  }

  if (!noVncProcess && vncProcess) {
    const websockify = findExecutable([process.env.BROWSER_MCP_WEBSOCKIFY || "", "/usr/bin/websockify", "/bin/websockify"])
    if (websockify && existsSync(config.noVncWebDir)) {
      noVncProcess = spawn(websockify, [
        "--web", config.noVncWebDir,
        `${config.noVncHost}:${config.noVncPort}`,
        `127.0.0.1:${config.vncPort}`,
      ], {
        stdio: ["ignore", "pipe", "pipe"],
        detached: false,
      })
      noVncProcess.stderr.on("data", (chunk) => process.stderr.write(`[websockify] ${chunk}`))
      noVncProcess.on("exit", (code, signal) => {
        console.log(`websockify exited code=${code} signal=${signal}`)
        noVncProcess = null
      })
      await sleep(300)
    }
  }
}

function buildChromeLaunch(chromeBin, commonChromeArgs) {
  const requestedMode = String(config.mode || "desktop").toLowerCase()
  const forceHeadless = ["headless", "headless-new"].includes(requestedMode)

  if (!forceHeadless && process.env.DISPLAY) {
    return {
      command: chromeBin,
      args: [...commonChromeArgs, "--disable-gpu"],
      env: {},
      launchMode: "desktop-display",
    }
  }

  if (!forceHeadless && (displayProcess || displayLockExists())) {
    return {
      command: chromeBin,
      args: [...commonChromeArgs, "--disable-gpu"],
      env: { DISPLAY: config.display },
      launchMode: "desktop-xvfb-vnc",
    }
  }

  return {
    command: chromeBin,
    args: [
      ...commonChromeArgs,
      "--disable-gpu",
      "--headless=new",
      "--ozone-platform=headless",
      "--use-angle=swiftshader-webgl",
    ],
    env: {},
    launchMode: forceHeadless ? "headless-forced" : "headless-fallback",
  }
}

function displayLockExists() {
  const displayNumber = String(config.display).replace(/^:/, "").split(".")[0]
  return Boolean(displayNumber) && existsSync(`/tmp/.X${displayNumber}-lock`)
}

async function isChromeReady() {
  try {
    const response = await fetch(`http://${config.chromeHost}:${config.chromePort}/json/version`)
    return response.ok
  } catch {
    return false
  }
}

async function openChromeTarget(url) {
  const response = await fetch(`http://${config.chromeHost}:${config.chromePort}/json/new?${encodeURIComponent(url)}`, {
    method: "PUT",
  }).catch(() => null)

  if (response?.ok) return response.json()

  const list = await fetch(`http://${config.chromeHost}:${config.chromePort}/json/list`).then((item) => item.json())
  const first = Array.isArray(list) ? list[0] : null
  if (!first) throw new Error("Nessun target Chrome disponibile.")
  return first
}

function devtoolsUrl(request, target) {
  const host = request.headers.host || `localhost:${config.port}`
  const protocol = request.headers["x-forwarded-proto"] || "http"
  const wsTarget = `${host}/devtools/page/${target.id}`
  return `${protocol}://${host}/devtools/inspector.html?ws=${encodeURIComponent(wsTarget)}`
}

function remoteBrowserUrl(request) {
  const hostHeader = request.headers.host || `localhost:${config.port}`
  const hostname = hostHeader.split(":")[0]
  const protocol = request.headers["x-forwarded-proto"] || "http"
  return `${protocol}://${hostname}:${config.noVncPort}/vnc.html?autoconnect=1&resize=scale&reconnect=1&path=websockify`
}

function remoteControlUrl(request, session, code) {
  const host = request.headers.host || `localhost:${config.port}`
  const protocol = request.headers["x-forwarded-proto"] || "http"
  return `${protocol}://${host}/remote?session=${encodeURIComponent(session)}&code=${encodeURIComponent(code)}`
}

function proxyHttp(clientRequest, clientResponse) {
  const upstream = new URL(clientRequest.url || "/", `http://${config.chromeHost}:${config.chromePort}`)
  const proxy = fetch(upstream, {
    method: clientRequest.method,
    headers: clientRequest.headers,
  })

  proxy
    .then(async (upstreamResponse) => {
      clientResponse.writeHead(upstreamResponse.status, Object.fromEntries(upstreamResponse.headers.entries()))
      if (upstreamResponse.body) {
        const reader = upstreamResponse.body.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          clientResponse.write(value)
        }
      }
      clientResponse.end()
    })
    .catch((error) => {
      html(clientResponse, 502, page("Proxy Chrome non disponibile", error instanceof Error ? error.message : String(error)))
    })
}

async function sendChromeInput(payload) {
  const action = String(payload?.action || "insert")
  const text = String(payload?.text || "").slice(0, 4000)

  if (action === "insert") {
    if (!text.trim()) return
    await sendChromeCommand("Input.insertText", { text })
    return
  }

  if (action === "enter") {
    await sendKey("Enter", "Enter", 13)
    return
  }

  if (action === "tab") {
    await sendKey("Tab", "Tab", 9)
    return
  }

  if (action === "backspace") {
    await sendKey("Backspace", "Backspace", 8)
    return
  }

  throw new Error("Azione tastiera non supportata.")
}

async function sendKey(key, code, keyCode) {
  await sendChromeCommand("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  })
  await sendChromeCommand("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  })
}

async function sendChromeCommand(method, params = {}) {
  const target = activePageTarget || await getPrimaryChromeTarget()
  if (!target?.webSocketDebuggerUrl) throw new Error("Target Chrome non disponibile.")
  await sendWebSocketJson(target.webSocketDebuggerUrl, {
    id: Date.now(),
    method,
    params,
  })
}

async function getPrimaryChromeTarget() {
  const list = await fetch(`http://${config.chromeHost}:${config.chromePort}/json/list`).then((item) => item.json())
  const pages = Array.isArray(list) ? list.filter((item) => item.type === "page") : []
  return pages.find((item) => item.url && !item.url.startsWith("devtools://")) || pages[0] || null
}

function sendWebSocketJson(webSocketUrl, payload) {
  return new Promise((resolve, reject) => {
    const target = new URL(webSocketUrl)
    const port = Number(target.port || 80)
    const key = randomBytes(16).toString("base64")
    const socket = net.connect(port, target.hostname)
    const timeout = setTimeout(() => {
      socket.destroy()
      reject(new Error("Timeout WebSocket Chrome."))
    }, 5000)

    let buffer = ""
    let opened = false

    socket.on("connect", () => {
      socket.write([
        `GET ${target.pathname}${target.search} HTTP/1.1`,
        `Host: ${target.host}`,
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Key: ${key}`,
        "Sec-WebSocket-Version: 13",
        "\r\n",
      ].join("\r\n"))
    })

    socket.on("data", (chunk) => {
      if (opened) return
      buffer += chunk.toString("utf8")
      if (!buffer.includes("\r\n\r\n")) return
      if (!buffer.startsWith("HTTP/1.1 101")) {
        clearTimeout(timeout)
        socket.destroy()
        reject(new Error("Handshake WebSocket Chrome non riuscito."))
        return
      }
      const accept = createHash("sha1")
        .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
        .digest("base64")
      if (!buffer.toLowerCase().includes(`sec-websocket-accept: ${accept}`.toLowerCase())) {
        clearTimeout(timeout)
        socket.destroy()
        reject(new Error("Handshake WebSocket Chrome non verificato."))
        return
      }
      opened = true
      socket.write(encodeWebSocketFrame(JSON.stringify(payload)))
      setTimeout(() => {
        clearTimeout(timeout)
        socket.end()
        resolve()
      }, 120)
    })

    socket.on("error", (error) => {
      clearTimeout(timeout)
      reject(error)
    })
  })
}

function encodeWebSocketFrame(message) {
  const payload = Buffer.from(message)
  const mask = randomBytes(4)
  let header

  if (payload.length < 126) {
    header = Buffer.alloc(2)
    header[1] = 0x80 | payload.length
  } else if (payload.length < 65536) {
    header = Buffer.alloc(4)
    header[1] = 0x80 | 126
    header.writeUInt16BE(payload.length, 2)
  } else {
    header = Buffer.alloc(10)
    header[1] = 0x80 | 127
    header.writeBigUInt64BE(BigInt(payload.length), 2)
  }

  header[0] = 0x81
  const masked = Buffer.alloc(payload.length)
  for (let index = 0; index < payload.length; index += 1) {
    masked[index] = payload[index] ^ mask[index % 4]
  }
  return Buffer.concat([header, mask, masked])
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = ""
    request.on("data", (chunk) => {
      body += chunk
      if (body.length > 16_384) {
        request.destroy()
        reject(new Error("Payload troppo grande."))
      }
    })
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        resolve({})
      }
    })
    request.on("error", reject)
  })
}

async function notifyCallback(callback, payload) {
  await fetch(callback, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

function findChrome() {
  return findExecutable([
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
  ])
}

function findExecutable(candidates) {
  return candidates.filter(Boolean).find((candidate) => existsSync(candidate)) || ""
}

function html(response, status, body) {
  response.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" })
  response.end(body)
}

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" })
  response.end(JSON.stringify(body, null, 2))
}

function page(title, body) {
  const content = String(body).includes("<") ? body : `<p>${escapeHtml(body)}</p>`
  return `<!doctype html>
<html lang="it">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: #070b15; color: #f8fafc; font: 16px/1.55 system-ui, -apple-system, Segoe UI, sans-serif; display: grid; place-items: center; padding: max(18px, env(safe-area-inset-top)) 18px max(18px, env(safe-area-inset-bottom)); }
  main { width: min(720px, 100%); min-width: 0; border: 1px solid rgba(255,255,255,.14); background: #111827; border-radius: 18px; padding: clamp(18px, 5vw, 28px); box-shadow: 0 30px 90px rgba(0,0,0,.35); overflow: hidden; }
  h1 { margin: 0 0 16px; font-size: clamp(25px, 8vw, 42px); line-height: 1.05; overflow-wrap: anywhere; }
  p { margin: 10px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; color: #cbd5e1; }
  .content { display: grid; gap: 12px; min-width: 0; }
  .badge { display: inline-flex; width: fit-content; max-width: 100%; border: 1px solid rgba(219,63,134,.35); background: rgba(219,63,134,.12); color: #ffe4f1; border-radius: 999px; padding: 8px 12px; font-weight: 900; overflow-wrap: anywhere; }
  .hint { border: 1px solid rgba(251,191,36,.22); background: rgba(251,191,36,.08); color: #fde68a; border-radius: 14px; padding: 12px; }
  .actions { display: grid; gap: 10px; margin-top: 10px; }
  .button, .secondary { display: inline-flex; min-height: 48px; align-items: center; justify-content: center; border-radius: 12px; padding: 13px 18px; text-align: center; text-decoration: none; font-weight: 900; overflow-wrap: anywhere; }
  .button { background: #db3f86; color: #fff; }
  .secondary { border: 1px solid rgba(255,255,255,.18); color: #e2e8f0; }
  @media (min-width: 640px) { .actions { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
</style>
<main>
  <h1>${escapeHtml(title)}</h1>
  <div class="content">${content}</div>
</main>`
}

function remoteControlPage(request, session, code) {
  const vncUrl = remoteBrowserUrl(request)
  return `<!doctype html>
<html lang="it">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Browser MCP controllabile</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; background: #070b15; color: #f8fafc; font: 15px/1.45 system-ui, -apple-system, Segoe UI, sans-serif; }
  body { padding: max(10px, env(safe-area-inset-top)) 10px max(10px, env(safe-area-inset-bottom)); }
  .shell { display: grid; gap: 10px; min-height: calc(100vh - 20px); }
  .viewer { min-height: 54vh; border: 1px solid rgba(255,255,255,.14); border-radius: 16px; overflow: hidden; background: #020617; }
  iframe { width: 100%; height: 100%; min-height: 54vh; border: 0; display: block; }
  .panel { border: 1px solid rgba(219,63,134,.28); background: #111827; border-radius: 16px; padding: 12px; box-shadow: 0 20px 70px rgba(0,0,0,.35); }
  h1 { margin: 0 0 4px; font-size: 18px; line-height: 1.1; }
  p { margin: 4px 0 10px; color: #cbd5e1; }
  textarea { width: 100%; min-height: 74px; resize: vertical; border: 1px solid rgba(255,255,255,.18); border-radius: 12px; background: #020617; color: #fff; padding: 12px; font: 16px/1.4 system-ui, -apple-system, Segoe UI, sans-serif; }
  .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
  button, a { min-height: 44px; border: 1px solid rgba(255,255,255,.14); border-radius: 12px; background: rgba(255,255,255,.06); color: #fff; font-weight: 850; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; padding: 10px 12px; }
  .primary { background: #db3f86; border-color: rgba(219,63,134,.55); }
  .status { min-height: 20px; margin-top: 8px; color: #93c5fd; font-size: 13px; }
  @media (orientation: landscape) and (max-height: 520px) {
    .shell { grid-template-columns: minmax(0, 1fr) minmax(280px, 380px); align-items: stretch; }
    .viewer, iframe { min-height: calc(100vh - 20px); }
    .panel { align-self: stretch; overflow: auto; }
  }
</style>
<div class="shell">
  <div class="viewer"><iframe src="${escapeHtml(vncUrl)}" title="Chrome remoto Optima"></iframe></div>
  <section class="panel">
    <h1>Tastiera mobile</h1>
    <p>1. Tocca il campo dentro Chrome remoto. 2. Scrivi qui. 3. Premi invia testo.</p>
    <textarea id="mobileText" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Scrivi qui email, codice o testo da inviare al campo attivo..."></textarea>
    <div class="actions">
      <button class="primary" id="sendText">Invia testo</button>
      <button id="sendEnter">Enter</button>
      <button id="sendTab">Tab</button>
      <button id="sendBackspace">Backspace</button>
      <a href="${escapeHtml(vncUrl)}" target="_blank" rel="noreferrer">noVNC pieno schermo</a>
      <a href="/health" target="_blank" rel="noreferrer">Health</a>
    </div>
    <div class="status" id="status"></div>
  </section>
</div>
<script>
  const endpoint = "/type?session=${encodeURIComponent(session)}&code=${encodeURIComponent(code)}";
  const status = document.getElementById("status");
  async function send(action, text = "") {
    status.textContent = "Invio...";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, text }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Invio non riuscito");
    status.textContent = "Inviato al browser remoto.";
  }
  document.getElementById("sendText").addEventListener("click", async () => {
    const field = document.getElementById("mobileText");
    try {
      await send("insert", field.value);
      field.value = "";
      field.focus();
    } catch (error) {
      status.textContent = error.message || String(error);
    }
  });
  document.getElementById("sendEnter").addEventListener("click", () => send("enter").catch((error) => status.textContent = error.message || String(error)));
  document.getElementById("sendTab").addEventListener("click", () => send("tab").catch((error) => status.textContent = error.message || String(error)));
  document.getElementById("sendBackspace").addEventListener("click", () => send("backspace").catch((error) => status.textContent = error.message || String(error)));
</script>`
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
