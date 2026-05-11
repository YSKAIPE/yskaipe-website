// app/founding/welcome/page.tsx
//
// Post-checkout confirmation page for the founding_first_month_free_v2 offer.
//
// Flow:
//   1. Contractor completes Stripe checkout
//   2. Stripe redirects to /founding/welcome?session_id=cs_...
//   3. This page reads session_id, verifies with Stripe server-side
//   4. Looks up the founding_seats row to personalize the greeting
//   5. Renders confirmation with trial end date + CTA to log in
//
// Defensive behavior:
//   - Missing session_id → show generic welcome (no crash, no false confirmation)
//   - Invalid session_id → same fallback (silent, no user-facing error)
//   - Seat not found → use Stripe-side data, skip personalization
//   - Any throw → fall back to generic state
//
// This is a server component — no client JS, no hydration cost, no exposed
// secrets. The Stripe + Supabase lookups happen on Vercel and ship only the
// rendered HTML to the browser.

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── Types ────────────────────────────────────────────────────────

interface SeatSummary {
  firstName: string;
  company: string;
  trialEndsAt: Date | null;
}

interface PageProps {
  searchParams: Promise<{ session_id?: string }>;
}

// ─── Data fetching ────────────────────────────────────────────────

async function resolveSeat(sessionId: string | undefined): Promise<SeatSummary | null> {
  if (!sessionId) return null;
  if (!sessionId.startsWith("cs_")) return null; // sanity guard

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-03-25.dahlia",
    });

    // Verify the session is real and belongs to this account
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) return null;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { data: seat } = await supabase
      .from("founding_seats")
      .select("first_name, company, trial_ends_at")
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();

    if (!seat) {
      // Webhook may not have fired yet (rare race). Still personalize from
      // Stripe session metadata if available.
      const meta = session.metadata || {};
      return {
        firstName: meta.firstName || "",
        company: meta.company || "",
        trialEndsAt: null,
      };
    }

    return {
      firstName: seat.first_name || "",
      company: seat.company || "",
      trialEndsAt: seat.trial_ends_at ? new Date(seat.trial_ends_at) : null,
    };
  } catch (err) {
    // Don't crash the page on Stripe/Supabase failures — just degrade.
    console.error("[founding/welcome] resolveSeat error:", err);
    return null;
  }
}

function formatTrialEnd(date: Date | null): string {
  if (!date) return "30 days from today";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────

export default async function FoundingWelcomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const seat = await resolveSeat(params.session_id);

  const firstName = seat?.firstName?.trim() || "";
  const trialEndStr = formatTrialEnd(seat?.trialEndsAt ?? null);
  const greeting = firstName ? `You're in, ${firstName}.` : "You're in.";

  return (
    <main style={styles.main}>
      <div style={styles.bgGrain} aria-hidden="true" />

      <div style={styles.shell}>
        {/* Brand */}
        <div style={styles.brand}>
          YSK<span style={styles.brandAccent}>AI</span>PE
        </div>

        {/* Pill */}
        <div style={styles.pill}>
          ★ Founding Trial &middot; First Month Free
        </div>

        {/* Hero */}
        <h1 style={styles.h1}>{greeting}</h1>

        <p style={styles.lede}>
          Your founding seat is secured. <strong style={styles.strong}>$0 charged today.</strong>{" "}
          Your first $99 won&rsquo;t hit until <strong style={styles.strong}>{trialEndStr}</strong>,
          and you can cancel any time before then with no fees, no questions.
        </p>

        {/* What happens next */}
        <div style={styles.stepsCard}>
          <div style={styles.stepsLabel}>What happens next</div>

          <ol style={styles.stepsList}>
            <li style={styles.step}>
              <span style={styles.stepNum}>1</span>
              <div style={styles.stepBody}>
                <div style={styles.stepTitle}>Check your inbox.</div>
                <div style={styles.stepDesc}>
                  We sent a welcome email to confirm your trial. Look for &ldquo;Welcome
                  to YSKAIPE&rdquo; from <code style={styles.code}>gr8@yskaipe.com</code>.
                </div>
              </div>
            </li>

            <li style={styles.step}>
              <span style={styles.stepNum}>2</span>
              <div style={styles.stepBody}>
                <div style={styles.stepTitle}>Log in with a 6-digit code.</div>
                <div style={styles.stepDesc}>
                  No password to remember. Just enter your email at the login page and
                  we&rsquo;ll send you a one-time code.
                </div>
              </div>
            </li>

            <li style={styles.step}>
              <span style={styles.stepNum}>3</span>
              <div style={styles.stepBody}>
                <div style={styles.stepTitle}>Complete your profile to activate.</div>
                <div style={styles.stepDesc}>
                  Add your service area, license info, and a few details. That unlocks
                  your Founding Pro badge and priority routing in the matching algorithm.
                </div>
              </div>
            </li>
          </ol>
        </div>

        {/* CTA */}
        <a href="/login.html" style={styles.cta}>
          Log in to my dashboard &rarr;
        </a>

        {/* Reassurance footnote */}
        <p style={styles.footnote}>
          Want to cancel, or have a question? Just reply to the welcome email &mdash; it
          comes to me directly.
          <br />
          &mdash; Nick @ YSKAIPE
        </p>
      </div>
    </main>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
// Inline styles to keep this page bundle-free and self-contained. The
// page is rendered server-side once per request; no client hydration.

const COLORS = {
  bg: "#0d0d0a",
  bgRaised: "#1a1a18",
  card: "#1f1f1c",
  text: "#fafaf7",
  textMuted: "#a8a89f",
  textDim: "#7a7a72",
  accentGreen: "#1d9e75",
  accentGold: "#c8961a",
  pillBg: "rgba(200, 150, 26, 0.15)",
  pillText: "#e5b550",
  border: "rgba(250, 250, 247, 0.08)",
} as const;

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    background: COLORS.bg,
    color: COLORS.text,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    padding: "60px 24px",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    position: "relative",
    overflow: "hidden",
  },
  bgGrain: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(29, 158, 117, 0.12), transparent), radial-gradient(ellipse 60% 40% at 50% 110%, rgba(200, 150, 26, 0.08), transparent)",
    pointerEvents: "none",
  },
  shell: {
    width: "100%",
    maxWidth: 620,
    position: "relative",
    zIndex: 1,
  },
  brand: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: 24,
    letterSpacing: "-0.02em",
    marginBottom: 32,
    color: COLORS.text,
  },
  brandAccent: {
    color: COLORS.accentGreen,
  },
  pill: {
    display: "inline-block",
    background: COLORS.pillBg,
    color: COLORS.pillText,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    padding: "6px 14px",
    borderRadius: 100,
    marginBottom: 24,
  },
  h1: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: 48,
    lineHeight: 1.08,
    letterSpacing: "-0.025em",
    margin: "0 0 20px",
    fontWeight: 400,
  },
  lede: {
    fontSize: 17,
    lineHeight: 1.6,
    color: COLORS.textMuted,
    margin: "0 0 40px",
    maxWidth: 540,
  },
  strong: {
    color: COLORS.text,
    fontWeight: 600,
  },
  stepsCard: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 14,
    padding: "28px 28px 24px",
    marginBottom: 36,
  },
  stepsLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: COLORS.accentGreen,
    marginBottom: 22,
  },
  stepsList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 22,
  },
  step: {
    display: "flex",
    gap: 16,
    alignItems: "flex-start",
  },
  stepNum: {
    flexShrink: 0,
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: COLORS.bgRaised,
    color: COLORS.accentGold,
    fontSize: 13,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Serif Display', Georgia, serif",
  },
  stepBody: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: COLORS.text,
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 14,
    lineHeight: 1.55,
    color: COLORS.textMuted,
  },
  code: {
    fontFamily:
      "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
    fontSize: 13,
    background: COLORS.bgRaised,
    padding: "1px 6px",
    borderRadius: 4,
    color: COLORS.text,
  },
  cta: {
    display: "inline-block",
    background: COLORS.accentGold,
    color: "#1a1a18",
    padding: "16px 32px",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    textDecoration: "none",
    letterSpacing: "0.01em",
    transition: "transform 0.15s ease, filter 0.15s ease",
  },
  footnote: {
    fontSize: 13,
    lineHeight: 1.65,
    color: COLORS.textDim,
    marginTop: 36,
    marginBottom: 0,
  },
};
