import { mcpAuthorizationServerUrl } from "@/lib/mcp-auth"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const issuer = mcpAuthorizationServerUrl(request)
  const authorizationEndpoint = process.env.OPTIMA_MCP_AUTHORIZATION_ENDPOINT
  const tokenEndpoint = process.env.OPTIMA_MCP_TOKEN_ENDPOINT
  const jwksUri = process.env.OPTIMA_MCP_JWKS_URI

  if (!authorizationEndpoint || !tokenEndpoint) {
    return Response.json(
      {
        issuer,
        warning:
          "Configura OPTIMA_MCP_AUTHORIZATION_ENDPOINT e OPTIMA_MCP_TOKEN_ENDPOINT oppure usa un authorization server esterno dichiarato in OPTIMA_MCP_AUTHORIZATION_SERVER.",
      },
      { status: 503 },
    )
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
