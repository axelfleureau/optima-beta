export const dynamic = "force-dynamic"

const PROXY_PATH = "/__clerk"
const CLERK_FRONTEND_API_URL = "https://frontend-api.clerk.dev"

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
])

const RESPONSE_HEADERS_TO_STRIP = new Set(["content-encoding", "content-length"])
const ALLOWED_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS"

function getDynamicHopByHopHeaders(headers: Headers) {
  const connection = headers.get("connection")
  if (!connection) return new Set<string>()

  return new Set(
    connection
      .split(",")
      .map((header) => header.trim().toLowerCase())
      .filter(Boolean),
  )
}

function getPublicOrigin(request: Request, requestUrl: URL) {
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()

  return proto && host ? `${proto}://${host}` : requestUrl.origin
}

function getClientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  )
}

function jsonError(code: string, message: string, status = 500) {
  return Response.json(
    { errors: [{ code, message }] },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  )
}

function getSetCookieHeaders(headers: Headers) {
  const headersWithSetCookie = headers as Headers & { getSetCookie?: () => string[] }
  const setCookies = headersWithSetCookie.getSetCookie?.()
  if (setCookies?.length) return setCookies

  const singleHeader = headers.get("set-cookie")
  return singleHeader ? [singleHeader] : []
}

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin")
  const requestHeaders = request.headers.get("access-control-request-headers")
  return {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": requestHeaders || "Authorization, Content-Type, Clerk-Proxy-Url, Clerk-Secret-Key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin, Access-Control-Request-Headers",
  }
}

async function proxyClerkFrontendApi(request: Request) {
  const secretKey = process.env.CLERK_SECRET_KEY
  const requestUrl = new URL(request.url)

  if (!secretKey) {
    return jsonError("proxy_configuration_error", "Missing Clerk secret key for Frontend API proxy.")
  }

  if (requestUrl.pathname !== PROXY_PATH && !requestUrl.pathname.startsWith(`${PROXY_PATH}/`)) {
    return jsonError("proxy_path_mismatch", `Request path "${requestUrl.pathname}" does not match "${PROXY_PATH}".`, 400)
  }

  const targetPath = requestUrl.pathname.slice(PROXY_PATH.length) || "/"
  const targetUrl = new URL(`${CLERK_FRONTEND_API_URL}${targetPath}`)
  targetUrl.search = requestUrl.search

  const targetHost = new URL(CLERK_FRONTEND_API_URL).host
  const dynamicHopByHop = getDynamicHopByHopHeaders(request.headers)
  const headers = new Headers()

  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (!HOP_BY_HOP_HEADERS.has(lower) && !dynamicHopByHop.has(lower)) {
      headers.set(key, value)
    }
  })

  const proxyUrl = `${getPublicOrigin(request, requestUrl)}${PROXY_PATH}`
  headers.set("Clerk-Proxy-Url", proxyUrl)
  headers.set("Clerk-Secret-Key", secretKey)
  headers.set("Host", targetHost)
  headers.set("Accept-Encoding", "identity")

  if (!headers.has("X-Forwarded-Host")) headers.set("X-Forwarded-Host", requestUrl.host)
  if (!headers.has("X-Forwarded-Proto")) headers.set("X-Forwarded-Proto", requestUrl.protocol.replace(":", ""))

  const clientIp = getClientIp(request)
  if (clientIp) headers.set("X-Forwarded-For", clientIp)

  const fetchOptions: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
  }

  if (request.body) {
    fetchOptions.body = request.body
    fetchOptions.duplex = "half"
  }

  const response = await fetch(targetUrl.toString(), fetchOptions)
  const responseDynamicHopByHop = getDynamicHopByHopHeaders(response.headers)
  const responseHeaders = new Headers()

  response.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (lower === "set-cookie") return
    if (!HOP_BY_HOP_HEADERS.has(lower) && !RESPONSE_HEADERS_TO_STRIP.has(lower) && !responseDynamicHopByHop.has(lower)) {
      responseHeaders.set(key, value)
    }
  })

  for (const cookie of getSetCookieHeaders(response.headers)) {
    responseHeaders.append("Set-Cookie", cookie)
  }

  const location = response.headers.get("location")
  if (location) {
    try {
      const locationUrl = new URL(location, CLERK_FRONTEND_API_URL)
      if (locationUrl.host === targetHost) {
        responseHeaders.set("Location", `${proxyUrl}${locationUrl.pathname}${locationUrl.search}${locationUrl.hash}`)
      }
    } catch {
      // Keep the upstream location untouched if it is malformed.
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}

export const GET = proxyClerkFrontendApi
export const POST = proxyClerkFrontendApi
export const PUT = proxyClerkFrontendApi
export const DELETE = proxyClerkFrontendApi
export const PATCH = proxyClerkFrontendApi

export function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  })
}
