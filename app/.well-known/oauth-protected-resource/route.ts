import {
  mcpAuthorizationServerUrl,
  mcpResourceUrl,
} from "@/lib/mcp-auth"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authorizationServer = mcpAuthorizationServerUrl(request)

  return Response.json({
    resource: mcpResourceUrl(request),
    authorization_servers: [authorizationServer],
    resource_documentation: `${new URL(request.url).origin}/mcp`,
    scopes_supported: [
      "optima:read",
      "optima:agent-jobs",
      "optima:repositories",
      "optima:reports",
      "optima:connectors",
    ],
    bearer_methods_supported: ["header"],
  })
}
