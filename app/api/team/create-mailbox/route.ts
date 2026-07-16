export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { getCloudflareDb } from "@/lib/cloudflare-db";
import { requireClerkUser } from "@/lib/server-clerk";
import { ensureWorkspacePrincipal } from "@/lib/workspace-db";
import {
  createOrgMailbox,
  generateTempPassword,
  getCompanyMailDomain,
  ZohoMailError,
} from "@/lib/zoho-mail";

const ALLOWED_ROLES = new Set(["super-admin", "admin", "direzione"]);

// Local part valido per Zoho: minuscole, numeri, punti/underscore/trattini interni
const LOCAL_PART_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;

export async function POST(request: NextRequest) {
  try {
    const user = await requireClerkUser();
    if (!user) {
      return Response.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const db = await getCloudflareDb();
    if (!db) {
      return Response.json(
        { error: "D1 database binding missing" },
        { status: 500 },
      );
    }

    const principal = await ensureWorkspacePrincipal(db, user);
    if (!ALLOWED_ROLES.has(principal.role)) {
      return Response.json(
        { error: "Non hai i permessi per creare caselle email aziendali" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const localPart = String(body.localPart || "")
      .trim()
      .toLowerCase();

    if (!firstName || !lastName) {
      return Response.json(
        { error: "Nome e cognome sono obbligatori" },
        { status: 400 },
      );
    }

    if (!LOCAL_PART_PATTERN.test(localPart)) {
      return Response.json(
        {
          error:
            "Nome casella non valido: usa minuscole, numeri e . _ - (non a inizio o fine)",
        },
        { status: 400 },
      );
    }

    const tempPassword = generateTempPassword();
    const mailbox = await createOrgMailbox({
      localPart,
      firstName,
      lastName,
      password: tempPassword,
    });

    return Response.json({
      email: mailbox.email,
      zuid: mailbox.zuid,
      tempPassword,
    });
  } catch (error) {
    if (error instanceof ZohoMailError) {
      const isDuplicate =
        error.status === 400 &&
        /exist|già|duplicate/i.test(`${error.message} ${error.moreInfo}`);
      if (isDuplicate) {
        return Response.json(
          { error: "Esiste già una casella con questo indirizzo" },
          { status: 409 },
        );
      }
      console.error("Zoho mailbox creation failed:", error);
      return Response.json(
        {
          error: `Zoho ha rifiutato la creazione: ${error.moreInfo || error.message}`,
        },
        { status: 502 },
      );
    }
    console.error("create-mailbox error:", error);
    return Response.json(
      { error: "Errore durante la creazione della casella" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const user = await requireClerkUser();
  if (!user) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }
  try {
    return Response.json({ domain: await getCompanyMailDomain() });
  } catch {
    return Response.json({ domain: "wearerighello.com" });
  }
}
