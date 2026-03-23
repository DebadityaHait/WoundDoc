/**
 * GeminiClient
 *
 * Calls the Gemini 2.0 Flash-Lite Preview multimodal API directly from the
 * client (no proxy needed for Expo apps). Sends wound image(s) + structured
 * metrics as context and returns a clinical analysis narrative.
 *
 * Two modes:
 *  1. analyzeObservation   — single observation: image + metrics → initial assessment
 *  2. analyzeProgress      — all observations chronologically → healing progress report
 *
 * API: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 * Model: gemini-2.0-flash-lite (latest preview with vision support)
 */

import { appConfig } from "@/src/lib/config";
import { WoundObservation, WoundRecord } from "@/src/features/wounds/wounds.types";
import { readImageAsDataUrl } from "@/src/lib/image";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = "gemini-2.0-flash-lite";

export type GeminiAnalysisResult = {
  /** Main clinical narrative */
  summary: string;
  /** Key findings as bullet points */
  keyFindings: string[];
  /** Recommended next steps */
  recommendations: string[];
  /** Healing trajectory: improving | stable | worsening | insufficient_data */
  healingTrajectory?: "improving" | "stable" | "worsening" | "insufficient_data";
  /** Any concerns the model flagged */
  concerns: string[];
  /** Raw model text (for debugging / display fallback) */
  rawText: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTissueInfo(obs: WoundObservation): string {
  const m = obs.metrics;
  if (!m) return "No metrics available.";

  const lines: string[] = [];

  if (m.totalAreaCm2 != null) {
    lines.push(`Total wound area: ${m.totalAreaCm2.toFixed(2)} cm²`);
  }
  if (m.infectionRiskScore) {
    lines.push(`Infection risk score: ${m.infectionRiskScore}`);
  }
  if (m.calibration?.method === "aruco_rectification") {
    lines.push(`Calibration: ArUco marker (${m.calibration.marker_size_cm} cm), ${m.calibration.pixels_per_cm?.toFixed(1)} px/cm`);
  }

  // Prefer calibrated tissue sizes (cm²) over percentages
  if (m.tissueSizeInformation && Object.keys(m.tissueSizeInformation).length > 0) {
    lines.push("Tissue breakdown (ArUco-calibrated):");
    const sorted = Object.entries(m.tissueSizeInformation).sort((a, b) => b[1].area_cm2 - a[1].area_cm2);
    for (const [key, info] of sorted) {
      lines.push(`  • ${key.replace(/_/g, " ")}: ${info.area_cm2.toFixed(3)} cm² (${info.percentage.toFixed(1)}%)`);
    }
  } else if (m.tissueComposition && Object.keys(m.tissueComposition).length > 0) {
    lines.push("Tissue composition:");
    const sorted = Object.entries(m.tissueComposition).sort((a, b) => b[1] - a[1]);
    for (const [key, pct] of sorted) {
      lines.push(`  • ${key.replace(/_/g, " ")}: ${pct.toFixed(1)}%`);
    }
  }

  return lines.join("\n");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Convert a local file:// URI or data URL to a base64 string + mimeType for Gemini. */
async function toGeminiInlinePart(imageUri: string): Promise<{ inlineData: { mimeType: string; data: string } } | null> {
  try {
    const dataUrl = await readImageAsDataUrl(imageUri);
    // dataUrl = "data:image/jpeg;base64,/9j/..."
    const commaIdx = dataUrl.indexOf(",");
    if (commaIdx === -1) return null;
    const meta = dataUrl.slice(5, commaIdx); // "image/jpeg;base64"
    const mimeType = meta.split(";")[0] ?? "image/jpeg";
    const data = dataUrl.slice(commaIdx + 1);
    return { inlineData: { mimeType, data } };
  } catch {
    return null;
  }
}

async function callGemini(parts: unknown[]): Promise<string> {
  const apiKey = appConfig.geminiApiKey;
  if (!apiKey) throw new Error("Gemini API key is not configured (EXPO_PUBLIC_GEMINI_API_KEY).");

  const url = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
    systemInstruction: {
      parts: [{
        text: `You are a clinical wound care assistant AI. Analyse wound images and metrics provided by a clinician.
Always respond with valid JSON matching this exact schema:
{
  "summary": "string — 2-4 sentence overall clinical assessment",
  "keyFindings": ["string", ...],
  "recommendations": ["string", ...],
  "healingTrajectory": "improving" | "stable" | "worsening" | "insufficient_data",
  "concerns": ["string", ...]
}
Be concise and clinically precise. Do not diagnose — provide observations and suggestions for clinician review.
Always include a disclaimer that AI analysis is for informational purposes only and must be reviewed by a qualified clinician.`
      }]
    }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({})) as any;
      throw new Error(err?.error?.message ?? `Gemini API error ${resp.status}`);
    }

    const json = await resp.json() as any;
    const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

function parseGeminiResponse(raw: string): GeminiAnalysisResult {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<GeminiAnalysisResult>;
    return {
      summary: parsed.summary ?? raw,
      keyFindings: parsed.keyFindings ?? [],
      recommendations: parsed.recommendations ?? [],
      healingTrajectory: parsed.healingTrajectory,
      concerns: parsed.concerns ?? [],
      rawText: raw,
    };
  } catch {
    // Fallback: return raw text as summary
    return {
      summary: raw,
      keyFindings: [],
      recommendations: [],
      concerns: [],
      rawText: raw,
    };
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export class GeminiClient {
  /**
   * Analyse a single observation: sends the wound image + metrics to Gemini
   * and returns a structured clinical assessment.
   */
  async analyzeObservation(
    obs: WoundObservation,
    wound: WoundRecord,
  ): Promise<GeminiAnalysisResult> {
    const imagePart = await toGeminiInlinePart(
      obs.rectifiedOverlayUri ?? obs.segmentationOverlayUri ?? obs.originalImageUri
    );

    const textContent = `
Wound: "${wound.label}"${wound.bodyLocation ? ` | Location: ${wound.bodyLocation}` : ""}
Wound type (classified): ${wound.woundType.topClassKey.replace(/_/g, " ")}
Observation date: ${formatDate(obs.capturedAt)}

Measurements:
${formatTissueInfo(obs)}

${obs.notes ? `Clinician notes: ${obs.notes}` : ""}

Please provide a clinical assessment of this wound observation based on the image and the measurements above.
    `.trim();

    const parts: unknown[] = [];
    if (imagePart) parts.push(imagePart);
    parts.push({ text: textContent });

    const raw = await callGemini(parts);
    return parseGeminiResponse(raw);
  }

  /**
   * Analyse healing progress across all observations (or compared to the
   * previous one). Sends up to 4 images + structured metrics chronologically.
   */
  async analyzeProgress(
    wound: WoundRecord,
    mode: "all" | "last_two" = "all",
  ): Promise<GeminiAnalysisResult> {
    const sorted = [...wound.observations].sort(
      (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
    );

    const observations = mode === "last_two" ? sorted.slice(-2) : sorted;

    // Build parts: for each observation, add image + text block
    const parts: unknown[] = [];

    for (let i = 0; i < observations.length; i++) {
      const obs = observations[i];
      const imagePart = await toGeminiInlinePart(
        obs.rectifiedOverlayUri ?? obs.segmentationOverlayUri ?? obs.originalImageUri
      );
      if (imagePart) parts.push(imagePart);
      parts.push({
        text: `--- Observation ${i + 1} of ${observations.length} (${formatDate(obs.capturedAt)}) ---\n${formatTissueInfo(obs)}${obs.notes ? `\nClinician notes: ${obs.notes}` : ""}`
      });
    }

    const summaryText = `
Wound: "${wound.label}"${wound.bodyLocation ? ` | Location: ${wound.bodyLocation}` : ""}
Wound type: ${wound.woundType.topClassKey.replace(/_/g, " ")}
Total observations: ${sorted.length}
Analysis mode: ${mode === "last_two" ? "Comparison of last two observations" : "Full healing progress across all observations"}

The images and measurements above are shown in chronological order (oldest → newest).
Please analyse the healing trajectory, changes in tissue composition, wound size trends, and provide recommendations.
    `.trim();

    parts.push({ text: summaryText });

    const raw = await callGemini(parts);
    return parseGeminiResponse(raw);
  }
}

export const geminiClient = new GeminiClient();
