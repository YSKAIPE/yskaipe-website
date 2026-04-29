// ============================================================
// FILE: lib/email/contractor-lead.ts
//
// Template builder for the email a contractor receives when they
// have been allocated a new lead via /api/lead.
//
// Style is consistent with the AutoQuote results email
// (dark header, card layout, neutral palette).
//
// Used from: app/api/lead/route.ts
// ============================================================

export interface ContractorLeadEmailData {
  // Contractor (who's receiving the email)
  contractor_name: string;
  contractor_company?: string | null;
  // Homeowner (who they need to contact)
  homeowner_name: string;
  homeowner_email: string;
  homeowner_phone?: string | null;
  // Job details
  trade: string;
  zip_code: string;
  description: string;
  quote_low?: number | null;
  quote_high?: number | null;
  difficulty_score?: number | null;
  // Bookkeeping
  job_ref: string;
  rank_position?: number | null;
}

function formatCurrency(n: number): string {
  return (
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

function tradeLabel(trade: string): string {
  // Convert enum string to display label
  const map: Record<string, string> = {
    plumbing: "Plumbing",
    electrical: "Electrical",
    hvac: "HVAC",
    roofing: "Roofing",
    landscaping: "Landscaping",
    painting: "Painting",
    general_contracting: "General Contracting",
    automotive: "Automotive",
  };
  return map[trade] || trade;
}

function difficultyLabel(score: number | null | undefined): string {
  if (!score) return "Standard";
  if (score <= 3) return "Easy";
  if (score <= 6) return "Moderate";
  if (score <= 8) return "Complex";
  return "Highly Complex";
}

export function buildContractorLeadEmailHTML(
  d: ContractorLeadEmailData,
): string {
  const greetingName = d.contractor_company || d.contractor_name;

  const quoteRangeHTML =
    d.quote_low != null && d.quote_high != null
      ? `<p style="margin:6px 0 0;font-size:22px;font-weight:500;color:#0a0a0a;">${formatCurrency(d.quote_low)} – ${formatCurrency(d.quote_high)}</p>`
      : `<p style="margin:6px 0 0;font-size:14px;color:#999;">Pending site visit</p>`;

  const phoneRow = d.homeowner_phone
    ? `<tr>
         <td style="padding:8px 0;font-size:13px;color:#888;width:100px;">Phone</td>
         <td style="padding:8px 0;font-size:14px;color:#0a0a0a;font-weight:500;">
           <a href="tel:${d.homeowner_phone.replace(/\D/g, "")}" style="color:#b85c2c;text-decoration:none;">${d.homeowner_phone}</a>
         </td>
       </tr>`
    : "";

  const rankNote =
    d.rank_position && d.rank_position > 1
      ? `<p style="margin:0 0 0 8px;display:inline;font-size:12px;color:#999;">(Rank #${d.rank_position} match)</p>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>New YSKAIPE Lead — ${tradeLabel(d.trade)} · ${d.zip_code}</title>
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e6e0;">

        <!-- Header -->
        <tr>
          <td style="background:#0a0a0a;padding:28px 32px;">
            <p style="margin:0;font-size:11px;letter-spacing:0.12em;color:#888;text-transform:uppercase;">YSKAIPE · New Lead</p>
            <h1 style="margin:6px 0 0;font-size:24px;font-weight:500;color:#fff;">A homeowner picked you</h1>
            <p style="margin:8px 0 0;font-size:13px;color:#aaa;">Job ref · ${d.job_ref}</p>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:24px 32px 8px;">
            <p style="margin:0;font-size:15px;color:#333;line-height:1.6;">
              Hi ${greetingName},
            </p>
            <p style="margin:12px 0 0;font-size:15px;color:#333;line-height:1.6;">
              <strong>${d.homeowner_name}</strong> just confirmed you as their contractor for a
              ${tradeLabel(d.trade).toLowerCase()} job in ${d.zip_code}. They are expecting you to reach out shortly.
              ${rankNote ? "" : ""}
            </p>
          </td>
        </tr>

        <!-- Job summary -->
        <tr>
          <td style="padding:16px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#f9f8f5;border-radius:8px;padding:16px 20px;width:48%;">
                  <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.06em;">Trade</p>
                  <p style="margin:6px 0 0;font-size:18px;font-weight:500;color:#0a0a0a;">${tradeLabel(d.trade)}</p>
                </td>
                <td width="12"></td>
                <td style="background:#f9f8f5;border-radius:8px;padding:16px 20px;width:48%;">
                  <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.06em;">Difficulty</p>
                  <p style="margin:6px 0 0;font-size:18px;font-weight:500;color:#0a0a0a;">${difficultyLabel(d.difficulty_score)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Fair Rate Index -->
        <tr>
          <td style="padding:12px 32px 0;">
            <div style="background:#0a0a0a;border-radius:8px;padding:18px 20px;">
              <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Fair Rate Index</p>
              ${quoteRangeHTML.replace("color:#0a0a0a;", "color:#fff;").replace("color:#999", "color:#aaa")}
              <p style="margin:8px 0 0;font-size:12px;color:#888;">Use this as your reference. Your final quote is your call.</p>
            </div>
          </td>
        </tr>

        <!-- Job description -->
        <tr>
          <td style="padding:24px 32px 8px;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:500;color:#0a0a0a;text-transform:uppercase;letter-spacing:0.08em;">What they need</p>
            <p style="margin:0;font-size:14px;color:#444;line-height:1.7;background:#f9f8f5;border-radius:8px;padding:16px 20px;">
              ${d.description.replace(/\n/g, "<br>")}
            </p>
          </td>
        </tr>

        <!-- Homeowner contact -->
        <tr>
          <td style="padding:16px 32px 8px;border-top:1px solid #f0eeea;">
            <p style="margin:16px 0 12px;font-size:11px;font-weight:500;color:#0a0a0a;text-transform:uppercase;letter-spacing:0.08em;">Homeowner contact</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#888;width:100px;">Name</td>
                <td style="padding:8px 0;font-size:14px;color:#0a0a0a;font-weight:500;">${d.homeowner_name}</td>
              </tr>
              ${phoneRow}
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#888;">Email</td>
                <td style="padding:8px 0;font-size:14px;color:#0a0a0a;font-weight:500;">
                  <a href="mailto:${d.homeowner_email}" style="color:#b85c2c;text-decoration:none;">${d.homeowner_email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#888;">ZIP</td>
                <td style="padding:8px 0;font-size:14px;color:#0a0a0a;font-weight:500;">${d.zip_code}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Reply prompt -->
        <tr>
          <td style="padding:8px 32px 16px;">
            <div style="border-left:3px solid #c49a35;padding:8px 0 8px 16px;">
              <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
                <strong style="color:#0a0a0a;">Hit Reply</strong> to message ${d.homeowner_name} directly —
                this email's reply goes straight to them. Founding/Elite contractors typically respond in &lt; 5 minutes.
              </p>
            </div>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:24px 32px;background:#f9f8f5;border-top:1px solid #f0eeea;" align="center">
            <a href="https://www.yskaipe.com/dashboard.html" style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:500;">Open dashboard</a>
            <p style="margin:16px 0 0;font-size:12px;color:#aaa;">YSKAIPE · Human Hands. AI Power. · <a href="mailto:gr8@yskaipe.com" style="color:#aaa;">gr8@yskaipe.com</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Plain-text fallback (Resend recommends sending both for deliverability)
export function buildContractorLeadEmailText(d: ContractorLeadEmailData): string {
  const lines: string[] = [];
  lines.push(`YSKAIPE — New Lead`);
  lines.push(`Job ref: ${d.job_ref}`);
  lines.push("");
  lines.push(`Hi ${d.contractor_company || d.contractor_name},`);
  lines.push("");
  lines.push(
    `${d.homeowner_name} just confirmed you as their contractor for a ${tradeLabel(d.trade).toLowerCase()} job in ${d.zip_code}.`,
  );
  lines.push("");
  lines.push(`TRADE: ${tradeLabel(d.trade)}`);
  lines.push(`DIFFICULTY: ${difficultyLabel(d.difficulty_score)}`);
  if (d.quote_low != null && d.quote_high != null) {
    lines.push(
      `FAIR RATE INDEX: ${formatCurrency(d.quote_low)} – ${formatCurrency(d.quote_high)}`,
    );
  }
  lines.push("");
  lines.push(`WHAT THEY NEED:`);
  lines.push(d.description);
  lines.push("");
  lines.push(`HOMEOWNER CONTACT:`);
  lines.push(`  Name:  ${d.homeowner_name}`);
  if (d.homeowner_phone) lines.push(`  Phone: ${d.homeowner_phone}`);
  lines.push(`  Email: ${d.homeowner_email}`);
  lines.push(`  ZIP:   ${d.zip_code}`);
  lines.push("");
  lines.push(
    `Hit Reply to message ${d.homeowner_name} directly — this email's reply goes straight to them.`,
  );
  lines.push("");
  lines.push(`Dashboard: https://www.yskaipe.com/dashboard.html`);
  lines.push(`YSKAIPE · gr8@yskaipe.com`);
  return lines.join("\n");
}
