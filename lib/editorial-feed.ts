/**
 * Feed iCal del calendario editoriale.
 *
 * Optima pubblica un feed .ics sottoscrivibile da Google Calendar e Apple
 * Calendar come calendario condiviso in sola lettura, che si aggiorna da solo.
 * Il token firmato (HMAC) racchiude il tenant (e opzionalmente il cliente):
 * l'URL è stabile e non richiede login per essere letto dai calendari.
 */

const encoder = new TextEncoder();

function feedSecret(): string {
  return process.env.EDITORIAL_FEED_SECRET || "optima-editorial-feed";
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToString(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(feedSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return bytesToBase64Url(new Uint8Array(signature));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function signFeedToken(
  tenantId: string,
  clientId?: string | null,
): Promise<string> {
  const payload = bytesToBase64Url(
    encoder.encode(`${tenantId}~${clientId || ""}`),
  );
  const signature = await hmac(payload);
  return `${payload}.${signature}`;
}

export async function verifyFeedToken(
  token: string,
): Promise<{ tenantId: string; clientId: string | null } | null> {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;
  const expected = await hmac(payload);
  if (!timingSafeEqual(signature, expected)) return null;
  try {
    const [tenantId, clientId] = base64UrlToString(payload).split("~");
    if (!tenantId) return null;
    return { tenantId, clientId: clientId || null };
  } catch {
    return null;
  }
}

export type IcsEvent = {
  uid: string;
  start: Date;
  end: Date;
  allDay: boolean;
  summary: string;
  description?: string;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toIcsDate(date: Date, allDay: boolean): string {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  if (allDay) return `${y}${m}${d}`;
  return `${y}${m}${d}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

function toIcsStamp(date: Date): string {
  const iso = date.toISOString();
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(value: string): string {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Ripiega le righe a 75 ottetti come da RFC 5545. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let remaining = line;
  chunks.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 74) {
    chunks.push(` ${remaining.slice(0, 74)}`);
    remaining = remaining.slice(74);
  }
  if (remaining.length) chunks.push(` ${remaining}`);
  return chunks.join("\r\n");
}

export function buildIcs(calendarName: string, events: IcsEvent[]): string {
  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Righello//Optima Calendario Editoriale//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    "X-WR-TIMEZONE:Europe/Rome",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTAMP:${toIcsStamp(now)}`);
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(event.start, true)}`);
      lines.push(`DTEND;VALUE=DATE:${toIcsDate(event.end, true)}`);
    } else {
      lines.push(`DTSTART:${toIcsDate(event.start, false)}`);
      lines.push(`DTEND:${toIcsDate(event.end, false)}`);
    }
    lines.push(foldLine(`SUMMARY:${escapeIcs(event.summary)}`));
    if (event.description) {
      lines.push(foldLine(`DESCRIPTION:${escapeIcs(event.description)}`));
    }
    lines.push("STATUS:CONFIRMED");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
