/**
 * Proxy route to forward requests to Python backend engine.
 * 
 * Use this file by renaming it to route.ts when your Python backend is deployed.
 * Set BACKEND_ENGINE_URL environment variable to your deployed engine URL.
 * 
 * Example:
 *   BACKEND_ENGINE_URL=https://resume-engine-xxx-uc.a.run.app
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Python backend URL - set this in your Vercel environment variables
const BACKEND_URL = process.env.BACKEND_ENGINE_URL || "http://localhost:8080";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    
    // Validate that we have the required fields
    const file = form.get("resume") as File | null;
    const jobDescription = form.get("jd") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!jobDescription || jobDescription.trim().length === 0) {
      return NextResponse.json({ error: "Job description is required" }, { status: 400 });
    }

    // Create new FormData to forward to Python backend
    const backendForm = new FormData();
    backendForm.append("resume", file);
    backendForm.append("jd", jobDescription);

    console.log(`Forwarding request to ${BACKEND_URL}/analyze`);

    // Forward the request to Python backend
    const response = await fetch(`${BACKEND_URL}/analyze`, {
      method: "POST",
      body: backendForm,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
      console.error("Backend error:", errorData);
      return NextResponse.json(
        { error: errorData.detail || "Analysis failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Transform response to match frontend expectations
    return NextResponse.json({
      success: data.success,
      analysis: {
        score: data.score,
        breakdown: data.breakdown,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        suggested_keywords: data.suggested_keywords,
        highlight_pairs: data.highlight_pairs,
        llm_count: data.llm_count,
        individual_scores: data.individual_scores,
      },
      extractedText: data.extracted_text,
      externalLinks: data.external_links,
    });
    
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Proxy failed" },
      { status: 500 }
    );
  }
}

// Health check - also proxies to backend
export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();
    
    return NextResponse.json({
      frontend: "healthy",
      backend: data,
      backend_url: BACKEND_URL,
    });
  } catch (error) {
    return NextResponse.json({
      frontend: "healthy",
      backend: "unreachable",
      backend_url: BACKEND_URL,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
