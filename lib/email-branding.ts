export type EmailBrand = {
  organizationName: string;
  productName: string;
  siteUrl: string;
  logoText: string;
  primaryColor: string;
  accentColor: string;
};

export type BrandedEmailSection = {
  eyebrow?: string;
  title?: string;
  html: string;
};

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://appbeta.wearerighello.com"
  );
}

export function defaultEmailBrand(organizationName = "Righello"): EmailBrand {
  return {
    organizationName,
    productName: "Optima",
    siteUrl:
      process.env.NEXT_PUBLIC_TENANT_SITE_URL ||
      "https://www.wearerighello.com",
    logoText: organizationName || "Righello",
    primaryColor: "#0b1323",
    accentColor: "#ec4899",
  };
}

export async function resolveEmailBrand(
  db: any,
  organizationId: string,
): Promise<EmailBrand> {
  const organization = await db
    ?.prepare(
      `SELECT name, slug
       FROM organizations
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(organizationId)
    .first()
    .catch(() => null);

  const organizationName = String(organization?.name || "Righello").trim();
  return defaultEmailBrand(organizationName || "Righello");
}

export function renderEmailButton(
  label: string,
  url: string,
  brand: EmailBrand,
) {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;background:${brand.accentColor};color:#ffffff;padding:14px 20px;border-radius:10px;text-decoration:none;font-weight:800">${escapeHtml(label)}</a>`;
}

export function renderEmailPanel(html: string) {
  return `<div style="padding:18px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc">${html}</div>`;
}

export function renderInfoRows(
  rows: Array<{ label: string; value: string; strong?: boolean }>,
) {
  return `
    <table style="width:100%;border-collapse:collapse">
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                <td style="padding:9px 0;color:#64748b;font-size:13px;width:34%;vertical-align:top">${escapeHtml(row.label)}</td>
                <td style="padding:9px 0;color:#0f172a;font-size:14px;${row.strong ? "font-weight:800" : "font-weight:600"}">${escapeHtml(row.value)}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

export function renderBrandedEmail(params: {
  brand?: EmailBrand;
  preheader: string;
  eyebrow: string;
  title: string;
  intro?: string;
  sections?: BrandedEmailSection[];
  cta?: { label: string; url: string };
  footerNote?: string;
}) {
  const brand = params.brand || defaultEmailBrand();
  const intro = params.intro
    ? `<p style="font-size:16px;line-height:1.65;margin:0 0 22px;color:#334155">${escapeHtml(params.intro)}</p>`
    : "";
  const sections = (params.sections || [])
    .map(
      (section) => `
        <div style="margin-top:22px">
          ${
            section.eyebrow
              ? `<div style="font-size:11px;color:#64748b;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">${escapeHtml(section.eyebrow)}</div>`
              : ""
          }
          ${
            section.title
              ? `<h2 style="font-size:18px;line-height:1.3;color:#0f172a;margin:0 0 10px">${escapeHtml(section.title)}</h2>`
              : ""
          }
          ${section.html}
        </div>
      `,
    )
    .join("");
  const cta = params.cta
    ? `<p style="margin:28px 0 0">${renderEmailButton(params.cta.label, params.cta.url, brand)}</p>`
    : "";

  return `
    <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(params.preheader)}</div>
    <div style="margin:0;padding:0;background:#e7edf5">
      <div style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:720px;margin:0 auto;padding:28px 16px;color:#0f172a">
        <div style="background:${brand.primaryColor};color:#ffffff;padding:28px 30px;border-radius:18px 18px 0 0;border:1px solid #1f2a44">
          <a href="${escapeHtml(brand.siteUrl)}" style="text-decoration:none;color:#ffffff">
            <div style="display:inline-flex;align-items:center;gap:10px">
              <div style="display:inline-block;border:1px solid rgba(255,255,255,.22);border-radius:10px;padding:8px 10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#ffffff">${escapeHtml(brand.logoText)}</div>
            </div>
          </a>
          <div style="font-size:12px;color:#f9a8d4;font-weight:900;letter-spacing:.16em;text-transform:uppercase;margin-top:22px">${escapeHtml(params.eyebrow)}</div>
          <h1 style="margin:10px 0 0;font-size:29px;line-height:1.15;color:#ffffff">${escapeHtml(params.title)}</h1>
        </div>
        <div style="background:#ffffff;padding:30px;border:1px solid #dbe3ee;border-top:0;border-radius:0 0 18px 18px">
          ${intro}
          ${sections}
          ${cta}
          <div style="height:1px;background:#e2e8f0;margin:30px 0 18px"></div>
          <p style="font-size:12px;line-height:1.6;color:#64748b;margin:0">
            ${escapeHtml(params.footerNote || `${brand.productName} per ${brand.organizationName}`)}
            <br />
            <a href="${escapeHtml(brand.siteUrl)}" style="color:${brand.accentColor};text-decoration:none;font-weight:700">${escapeHtml(brand.siteUrl)}</a>
          </p>
        </div>
      </div>
    </div>
  `;
}
