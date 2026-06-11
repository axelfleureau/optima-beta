import { mcpAuthorizationServerUrl } from "@/lib/mcp-auth"
import { getMcpAuthReadiness } from "@/lib/mcp-auth"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const issuer = mcpAuthorizationServerUrl(request)
  const origin = new URL(request.url).origin
  const readiness = getMcpAuthReadiness()
  const authorizationEndpoint = process.env.OPTIMA_MCP_AUTHORIZATION_ENDPOINT
  const tokenEndpoint = process.env.OPTIMA_MCP_TOKEN_ENDPOINT
  const jwksUri = process.env.OPTIMA_MCP_JWKS_URI

  if (!authorizationEndpoint || !tokenEndpoint) {
    if (!readiness.serviceTokenConfigured && !readiness.jwtBearerConfigured) {
      return Response.json(
        {
          issuer,
          warning:
            "Configura OPTIMA_MCP_AUTHORIZATION_ENDPOINT e OPTIMA_MCP_TOKEN_ENDPOINT, oppure abilita OPTIMA_MCP_SERVICE_TOKEN/JWT per accesso MCP server-to-server.",
        },
        { status: 503 },
      )
    }

    return Response.json({
      issuer,
      token_endpoint: `${origin}/api/mcp/oauth/token`,
      jwks_uri: jwksUri,
      grant_types_supported: readiness.jwtBearerConfigured ? ["client_credentials", "urn:ietf:params:oauth:grant-type:jwt-bearer"] : ["client_credentials"],
      response_types_supported: [],
      token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
      scopes_supported: [
        "optima:read",
        "optima:agent-jobs",
        "optima:repositories",
        "optima:reports",
        "optima:connectors",
      ],
      optima_auth_modes_supported: [
        readiness.serviceTokenConfigured ? "service_token" : null,
        readiness.jwtBearerConfigured ? "jwt_bearer" : null,
      ].filter(Boolean),
      warning:
        "OAuth Authorization Code + PKCE non e ancora configurato. Questa metadata espone la modalita MCP server-to-server tramite token endpoint.",
    })
  }

  return Response.json({
    issuer,
    authorization_endpoint: authorizationEndpoint,
    token_endpoint: tokenEndpoint,
    jwks_uri: jwksUri,
    grant_types_supported: ["authorization_code", "refresh_token"],
    response_types_supported: ["code"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post", "none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: [
      "openid",
      "profile",
      "email",
      "optima:read",
      "optima:agent-jobs",
      "optima:repositories",
      "optima:reports",
      "optima:connectors",
    ],
  })
}
