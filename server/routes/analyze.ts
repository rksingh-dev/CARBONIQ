import type { RequestHandler } from "express";
import { AnalysisResult } from "@shared/api";

export const analyzeReport: RequestHandler = async (req, res) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ error: "GEMINI_API_KEY not set" });

    const { fileBase64, reportName } = req.body as { fileBase64: string; reportName?: string };
    if (!fileBase64) return res.status(400).json({ error: "fileBase64 required" });

    const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

    const prompt = `You are an expert carbon accounting auditor. Analyze the provided Blue Carbon project PDF and extract:\n- Estimated verified carbon credits (integer tokens) achieved to date\n- Confidence (0 to 1)\n- 2-3 sentence summary of the project and key factors.\nReturn JSON exactly with keys: estimatedTokens (integer), confidence (0..1), summary.`;

    const content = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "application/pdf",
                data: fileBase64.replace(/^data:.*;base64,/, ""),
              },
            },
          ],
        },
      ],
    } as any;

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      },
    );

    if (!r.ok) {
      const text = await r.text();
      return res.status(500).json({ error: "Gemini request failed", details: text });
    }

    const json = (await r.json()) as any;
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Try to parse JSON from the model output
    let result: AnalysisResult | null = null;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
    } catch {}

    if (!result) {
      // Fallback heuristic extraction
      const estMatch = text.match(/(\d{1,6})/);
      const estimatedTokens = estMatch ? parseInt(estMatch[1], 10) : 100;
      result = {
        estimatedTokens,
        confidence: 0.75,
        summary: text.slice(0, 400),
        model,
      };
    } else {
      result.model = model;
    }

    return res.status(200).json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Analyze failed" });
  }
};
