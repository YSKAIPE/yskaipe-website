// lib/founding/completeActivation.ts
//
// Called from the contractor dashboard's profile completion flow.
//
// When a founding contractor finishes their business profile, this
// function flips:
//   - activation_status        → 'complete'
//   - founding_badge_active    → true  (shows on public profile)
//   - priority_routing_eligible → true (lead-scoring algorithm uses it)
//
// Lead scoring (leadScoring.ts) reads priority_routing_eligible to
// decide whether to apply the founding weight bonus. Until profile
// is complete, the contractor receives leads normally but doesn't
// get the priority boost or the public-facing badge.
//
// Why no penalties: we explicitly chose a low-friction model. The
// free month is automatic. The badge + priority are the carrot.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface ProfileCompletionInput {
  seatId: string;
  // Add fields as your dashboard captures them. These are read by
  // isProfileComplete() to decide whether activation should fire.
  businessAddress?: string | null;
  licenseNumber?: string | null;
  serviceRadiusMiles?: number | null;
  bio?: string | null;
}

// Minimum bar for activation.
// Kept light: business address + service radius + a short bio.
// License number is optional (some trades don't require state license).
function isProfileComplete (p: ProfileCompletionInput): boolean {
  return Boolean(
    p.businessAddress &&
      p.businessAddress.trim().length > 5 &&
      p.serviceRadiusMiles &&
      p.serviceRadiusMiles > 0 &&
      p.bio &&
      p.bio.trim().length >= 40,
  );
}

export interface ActivationResult {
  activated: boolean;
  reason?: string;
  alreadyActive?: boolean;
}

export async function maybeCompleteActivation (
  input: ProfileCompletionInput,
  supabase?: SupabaseClient,
): Promise<ActivationResult> {
  const db =
    supabase ??
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

  // Read current activation state.
  const { data: seat, error } = await db
    .from("founding_seats")
    .select(
      "id, activation_status, founding_badge_active, priority_routing_eligible",
    )
    .eq("id", input.seatId)
    .maybeSingle();

  if (error || !seat) {
    return { activated: false, reason: "Seat not found." };
  }

  if (seat.activation_status === "complete") {
    return { activated: true, alreadyActive: true };
  }

  if (!isProfileComplete(input)) {
    return {
      activated: false,
      reason:
        "Profile is not yet complete. Add business address, service radius, and a short bio (40+ chars).",
    };
  }

  const { error: updErr } = await db
    .from("founding_seats")
    .update({
      activation_status: "complete",
      activation_completed_at: new Date().toISOString(),
      founding_badge_active: true,
      priority_routing_eligible: true,
    })
    .eq("id", input.seatId);

  if (updErr) {
    return {
      activated: false,
      reason: `Activation update failed: ${updErr.message}`,
    };
  }

  return { activated: true };
}

// ─── Read-side helper for the lead-scoring algorithm ─────────────
// In leadScoring.ts, when computing the founding weight, call:
//   const eligible = await isPriorityRoutingEligible(contractorId)
//   if (eligible) score += founding * w_founding
//   else          // no founding bonus; contractor still scored normally
export async function isPriorityRoutingEligible (
  contractorId: string,
  supabase?: SupabaseClient,
): Promise<boolean> {
  const db =
    supabase ??
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

  // Contractor row links to founding_seats via the same email.
  // Adjust this join key if your schema uses a different FK.
  const { data, error } = await db
    .from("founding_seats")
    .select("priority_routing_eligible")
    .eq("id", contractorId)
    .maybeSingle();

  if (error || !data) return false;
  return Boolean(data.priority_routing_eligible);
}
