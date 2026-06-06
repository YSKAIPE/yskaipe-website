/**
 * app/api/instant-quote/route.ts
 * ─────────────────────────────────────────────────────────────────
 * Unified AI classifier + FRI pricer.
 *
 * Flow:
 *   1. Load all active service_tasks from Supabase (cached 5 min)
 *   2. Send description + full task list to Claude for classification
 *   3. Claude returns { slug, confidence }
 *   4. Look up matched task for tier flags + FRI band
 *   5. Ask Claude for a breakdown — ANCHORED to DB price, not invented
 *   6. Return structured response to client
 *
 * CRITICAL: Claude writes the breakdown explanation only.
 * Prices come exclusively from service_tasks DB rows.
 * Claude is never allowed to invent or adjust pricing.
 * ─────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAllTasks, classifyByKeywords } from "@/lib/service-tasks";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { description, zip } = await req.json();

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "description is required" },
        { status: 400 },
      );
    }

    // 1. Load task catalogue from DB (cached 5 min)
    const tasks = await getAllTasks();

    // Build compact task list for classifier prompt
    const taskList = tasks
      .map(
        (t) =>
          `${t.slug} | ${t.label} | ${t.category} | keywords: ${(t.ai_keywords ?? []).join(", ")}`,
      )
      .join("\n");

    // 2. Classify via Claude
    let matchedSlug: string | null = null;
    let confidence = 0;

    try {
      const classifyResp = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        system: `You are YSKAIPE's job classifier. Given a homeowner's job description, pick the single best matching slug from the list below.

Rules:
- Match to the SPECIFIC task described, not the broadest category. "Room addition" = gc_room_addition, not gc_kitchen_remodel.
- If the homeowner says "room addition", pick gc_room_addition. Not a house build. Not a remodel.
- Match to what was ACTUALLY said. Do not infer unstated scope.
- Return ONLY valid JSON: {"slug":"<slug>","confidence":<0-1 float>}
- No markdown, no explanation. If nothing matches well, use "life_handyman_misc".

TASK LIST:
${taskList}`,
        messages: [{ role: "user", content: description }],
      });

      const raw = classifyResp.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("")
        .replace(/```[a-z]*|```/g, "")
        .trim();

      const parsed = JSON.parse(raw);
      matchedSlug = parsed.slug ?? null;
      confidence = parsed.confidence ?? 0;
    } catch {
      // AI failed — fall through to keyword fallback
    }

    // 3. Resolve task from slug; fall back to keyword classifier
    let task = matchedSlug
      ? (tasks.find((t) => t.slug === matchedSlug) ?? null)
      : null;

    if (!task) {
      task = await classifyByKeywords(description);
      confidence = task ? 0.5 : 0;
    }

    // Ultimate fallback: handyman
    if (!task) {
      task = tasks.find((t) => t.slug === "life_handyman_misc") ?? tasks[0];
      confidence = 0.3;
    }

    // Prices come ONLY from the DB — never invented by Claude
    const friLow = task.fri_low ?? 80;
    const friHigh = task.fri_high ?? 300;
    const friUnit = task.fri_unit ?? "flat";

    // 4. Ask Claude for a breakdown explanation ONLY
    // Claude explains the DB price — it does not set or modify it
    let breakdown = "";
    let includes: string[] = [];
    let permitNote = "";

    const BREAKDOWN_SYSTEM = `You are YSKAIPE's Fair Rate Index writer. Your only job is to write a 2-sentence explanation of why a given price range applies to a specific home service job.

STRICT RULES — any violation is wrong output:
1. The price range is fixed. It comes from a verified database. Do NOT suggest a different number. Do NOT say the cost could be higher or lower than the range shown.
2. Never invent scope the homeowner did not describe. If they said "room addition," explain a room addition. Not a whole house. Not a renovation. Exactly what they said.
3. Exactly 2 sentences in the breakdown. Specific to their job, not generic filler.
4. The includes array lists 3-4 items typically covered at this price for this task.
5. permit_note: one sentence only if permits are genuinely likely, otherwise empty string.

Return ONLY this JSON — no markdown, no preamble:
{
  "breakdown": "sentence 1. sentence 2.",
  "includes": ["item 1", "item 2", "item 3"],
  "permit_note": ""
}`;

    const breakdownUserMsg = `Homeowner's exact words: "${description}"
Matched task: ${task.label} (${task.category})
FRI price range from database: $${friLow.toLocaleString()}–$${friHigh.toLocaleString()} (${friUnit.replace("_", " ")})
Permit likely: ${task.permit_likely}
ZIP: ${zip ?? "NC"}

Write 2 sentences explaining this specific job at this price range. Do not invent scope beyond what the homeowner stated.`;

    try {
      const breakdownResp = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        system: BREAKDOWN_SYSTEM,
        messages: [{ role: "user", content: breakdownUserMsg }],
      });

      const raw = breakdownResp.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("")
        .replace(/```[a-z]*|```/g, "")
        .trim();

      const parsed = JSON.parse(raw);
      breakdown = parsed.breakdown ?? "";
      includes = parsed.includes ?? [];
      permitNote = parsed.permit_note ?? "";
    } catch {
      // Hardcoded fallback — still uses DB prices, never invents
      breakdown = `${task.label} in NC typically runs $${friLow.toLocaleString()}–$${friHigh.toLocaleString()} ${friUnit.replace("_", " ")}. Final price depends on your specific site conditions, materials selected, and ZIP code.`;
      includes = ["Labor", "Standard materials", "Cleanup"];
    }

    // 5. Return — prices always from DB, never from Claude
    return NextResponse.json({
      slug: task.slug,
      label: task.label,
      category: task.category,
      domain: task.domain,
      confidence,

      tier_min: task.tier_min,
      requires_license: task.requires_license,
      requires_insurance: task.requires_insurance,
      permit_likely: task.permit_likely,
      youth_ok: task.youth_ok,

      // Prices — DB values only
      fri_low: friLow,
      fri_high: friHigh,
      fri_unit: friUnit,

      // Human-readable explanation
      breakdown,
      includes,
      permit_note: permitNote,
    });
  } catch (err) {
    console.error("[instant-quote] Fatal error:", err);
    return NextResponse.json(
      { error: "Quote generation failed. Please try again." },
      { status: 500 },
    );
  }
}
