export const dynamic = "force-dynamic";

import { getSession } from "@/lib/session";
import { signFeedToken } from "@/lib/editorial-feed";

/**
 * Restituisce l'URL del feed iCal per l'utente corrente (tenant), da iscrivere
 * su Google/Apple Calendar. Con ?clientId=... il feed è limitato a quel cliente.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.tenantId) {
    return Response.json({ error: "Non autenticato" }, { status: 401 });
  }

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId") || undefined;
  const token = await signFeedToken(session.tenantId, clientId);

  const feedUrl = `${url.origin}/api/editorial-feed/${token}`;
  const webcalUrl = feedUrl.replace(/^https?:/, "webcal:");

  return Response.json({ ok: true, url: feedUrl, webcalUrl });
}
