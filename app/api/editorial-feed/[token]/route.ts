export const dynamic = "force-dynamic";

import { adminDb } from "@/lib/firebase-admin";
import { buildIcs, verifyFeedToken, type IcsEvent } from "@/lib/editorial-feed";

function platformLabel(platform: unknown): string {
  if (Array.isArray(platform)) return platform.join(", ");
  return platform ? String(platform) : "";
}

/** Costruisce start/end dai campi del post; salta i post senza data. */
function postToEvent(post: any): IcsEvent | null {
  const title = String(post.name || post.title || "Contenuto");
  let start: Date | null = null;
  let allDay = true;

  if (typeof post.scheduledDate === "string" && post.scheduledDate) {
    const time =
      typeof post.scheduledTime === "string" && post.scheduledTime
        ? post.scheduledTime
        : null;
    start = new Date(`${post.scheduledDate}T${time || "00:00"}:00`);
    allDay = !time;
  } else if (post.date) {
    const raw =
      typeof post.date?.toDate === "function"
        ? post.date.toDate()
        : new Date(post.date);
    if (raw && !Number.isNaN(raw.getTime())) {
      start = raw;
      allDay = false;
    }
  }

  if (!start || Number.isNaN(start.getTime())) return null;

  const end = new Date(start);
  if (allDay) end.setDate(end.getDate() + 1);
  else end.setMinutes(end.getMinutes() + 30);

  const details: string[] = [];
  const platform = platformLabel(post.platform);
  if (platform) details.push(`Piattaforma: ${platform}`);
  if (post.status) details.push(`Stato: ${post.status}`);
  if (post.format || post.type) {
    details.push(`Formato: ${post.format || post.type}`);
  }
  if (post.caption || post.content) {
    details.push(String(post.caption || post.content).slice(0, 300));
  }

  return {
    uid: `${post.id}@optima.wearerighello.com`,
    start,
    end,
    allDay,
    summary: title,
    description: details.join("\n") || undefined,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const decoded = await verifyFeedToken(token);
  if (!decoded) {
    return new Response("Feed non valido o revocato.", { status: 401 });
  }

  try {
    let query = adminDb
      .collection("editorialPosts")
      .where("tenantId", "==", decoded.tenantId);
    if (decoded.clientId) {
      query = query.where("clientId", "==", decoded.clientId);
    }
    const snapshot = await query.get();
    const events = (snapshot.docs || [])
      .map((doc: any) => postToEvent({ id: doc.id, ...doc.data() }))
      .filter((event: IcsEvent | null): event is IcsEvent => event !== null);

    const ics = buildIcs("Optima · Calendario editoriale", events);
    return new Response(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="optima-editoriale.ics"',
        "Cache-Control": "public, max-age=1800",
      },
    });
  } catch (error) {
    console.error("[editorial-feed] errore generazione feed:", error);
    return new Response("Errore nella generazione del feed.", { status: 500 });
  }
}
