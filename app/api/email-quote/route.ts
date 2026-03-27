import { NextRequest, NextResponse } from "next/server";
import { Resend } from "YSKAIPE AutoQuote <quotes@yskaipe.com>";
import { QuoteResult } from "@/types/quote";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatCurrency(n: number) {
  return (
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

function buildEmailHTML(quote: QuoteResult): string {
  const materialsHTML = quote.materials_list?.length
    ? `<ul style="margin:8px 0;padding-left:20px;color:#555;">
        ${quote.materials_list.map((m) => `<li style="margin:4px 0;">${m}</li>`).join("")}
       </ul>`
    : '<p style="color:#888;font-size:13px;">Not specified</p>';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e6e0;">

        <!-- Header -->
        <tr>
          <td style="background:#0a0a0a;padding:28px 32px;">
            <p style="margin:0;font-size:11px;letter-spacing:0.12em;color:#888;text-transform:uppercase;">YSKAIPE AutoQuote</p>
            <h1 style="margin:6px 0 0;font-size:24px;font-weight:500;color:#fff;">Your Standard Cost Estimate</h1>
          </td>
        </tr>

        <!-- Trade + ID -->
        <tr>
          <td style="padding:24px 32px 0;border-bottom:1px solid #f0eeea;">
            <table width="100%"><tr>
              <td>
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.08em;">Trade</p>
                <p style="margin:4px 0 0;font-size:18px;font-weight:500;color:#0a0a0a;">${quote.trade}</p>
              </td>
              <td align="right">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.08em;">Complexity</p>
                <p style="margin:4px 0 0;font-size:14px;font-weight:500;color:#0a0a0a;text-transform:capitalize;">${quote.complexity}</p>
              </td>
            </tr></table>
            <p style="margin:12px 0 16px;font-size:13px;color:#888;">${quote.description}</p>
          </td>
        </tr>

        <!-- Cost breakdown -->
        <tr>
          <td style="padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#f9f8f5;border-radius:8px;padding:16px 20px;width:30%;" align="center">
                  <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.06em;">Labor</p>
                  <p style="margin:6px 0 0;font-size:22px;font-weight:500;color:#0a0a0a;">${formatCurrency(quote.labor_total)}</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#aaa;">${quote.labor_hours}h @ ${formatCurrency(quote.labor_rate)}/hr</p>
                </td>
                <td width="12"></td>
                <td style="background:#f9f8f5;border-radius:8px;padding:16px 20px;width:30%;" align="center">
                  <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.06em;">Materials</p>
                  <p style="margin:6px 0 0;font-size:22px;font-weight:500;color:#0a0a0a;">${formatCurrency(quote.materials_total)}</p>
                </td>
                <td width="12"></td>
                <td style="background:#0a0a0a;border-radius:8px;padding:16px 20px;width:30%;" align="center">
                  <p style="margin:0;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.06em;">Total Standard</p>
                  <p style="margin:6px 0 0;font-size:22px;font-weight:500;color:#fff;">${formatCurrency(quote.grand_total)}</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#666;">${quote.time_estimate}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Breakdown -->
        <tr>
          <td style="padding:0 32px 24px;">
            <div style="background:#f9f8f5;border-radius:8px;padding:16px 20px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:500;color:#0a0a0a;text-transform:uppercase;letter-spacing:0.06em;">Estimate breakdown</p>
              <p style="margin:0;font-size:14px;color:#555;line-height:1.7;">${quote.breakdown}</p>
            </div>
          </td>
        </tr>

        <!-- Materials list -->
        <tr>
          <td style="padding:0 32px 24px;border-top:1px solid #f0eeea;">
            <p style="margin:16px 0 8px;font-size:12px;font-weight:500;color:#0a0a0a;text-transform:uppercase;letter-spacing:0.06em;">Materials</p>
            ${materialsHTML}
          </td>
        </tr>

        ${
          quote.notes
            ? `
        <!-- Notes -->
        <tr>
          <td style="padding:0 32px 24px;">
            <div style="border-left:3px solid #e8a020;padding-left:16px;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:500;color:#0a0a0a;">Important notes</p>
              <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">${quote.notes}</p>
            </div>
          </td>
        </tr>`
            : ""
        }

        <!-- CTA -->
        <tr>
          <td style="padding:24px 32px;background:#f9f8f5;border-top:1px solid #f0eeea;" align="center">
            <a href="https://www.yskaipe.com/autoquote" style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:500;">Get another quote</a>
            <p style="margin:16px 0 0;font-size:12px;color:#aaa;">Based on verified NC 2026 industry standards · YSKAIPE · <a href="mailto:hello@yskaipe.com" style="color:#aaa;">hello@yskaipe.com</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const { quote, email }: { quote: QuoteResult; email: string } =
      await req.json();

    if (!quote || !email) {
      return NextResponse.json(
        { error: "quote and email are required" },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    const { data, error } = await resend.emails.send({
      from: "YSKAIPE AutoQuote <quotes@yskaipe.com>",
      to: [email],
      subject: `Your ${quote.trade} Standard Cost Estimate — $${quote.grand_total.toLocaleString()}`,
      html: buildEmailHTML(quote),
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    console.error("Email route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
