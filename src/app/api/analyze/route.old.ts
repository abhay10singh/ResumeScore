import { NextRequest, NextResponse } from "next/server";
import { extractTextFromBuffer } from "@/utils/parsePdf";
import cloudinary from "@/lib/cloudinary";
import { Ollama } from 'ollama';
export const runtime = "nodejs";

// LLM API Keys
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ;
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY ;
const OLLAMA_URL = "https://ollama.com"; 
const OLLAMA_MODEL = "gpt-oss:120b";
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions' ;

// Detailed rubric prompt generator
function buildDetailedPrompt(
  resumeText: string,
  jobDescription: string,
  externalContent?: string
): string {
  const externalSection = externalContent
    ? `\n\n### Additional Information from External Links:\n${externalContent}\n`
    : "";

  return `You are a highly experienced hiring-manager and career consultant. You will evaluate how well a candidate's resume matches a given job description.  
Your task: produce a **structured JSON output only** (no extra commentary) with the keys defined below.  
Use the rubric and weights described to compute your scores.

### Rubric:  
- Skills match (weight: 35%): how closely the resume lists and demonstrates the required skills in the job description.  
- Experience match (weight: 20%): relevance and seniority of roles, years of experience, consistency with job description.  
- Projects/Portfolio match (weight: 20%): if the candidate's projects (side-projects, GitHub, work) clearly align with the job's responsibilities and show depth.  
- Resume quality (weight: 15%): clarity, structure, formatting, ATS-friendly, readability, absence of errors.  
- Education & Certifications (weight: 5%): relevance of degrees, certifications, courses as required by the job description.
- External presence (weight: 5%): quality of portfolio, GitHub, LinkedIn, personal website if provided.

### Output format (JSON only):  
{
  "score": <integer from 0 to 100>,
  "breakdown": {
    "skills": <0-100>,
    "experience": <0-100>,
    "projects": <0-100>,
    "quality": <0-100>,
    "education": <0-100>,
    "external": <0-100>
  },
  "strengths": [<string>, …],
  "weaknesses": [<string>, …],
  "suggested_keywords": [<string>, …],
  "highlight_pairs": [
    { "jd_phrase": <string>, "resume_excerpt": <string> },
    … up to 5 entries
  ]
}

### Instructions & Considerations:
- Read the entire job description carefully. Focus on specific required skills, preferred skills, responsibilities, years of experience, certifications, tools/technologies.
- Read the resume carefully. Identify explicit statements of skills, experience, projects. If years of experience aren't explicit, estimate reasonably.
- For each category (skills, experience, etc) give a sub-score 0-100. Then compute a **weighted average** to produce the final "score".
  - Formula: final = 0.35 × skills + 0.20 × experience + 0.20 × projects + 0.15 × quality + 0.05 × education + 0.05 × external.
- "strengths" = 2-4 bullet points summarizing what the candidate does well for this job.
- "weaknesses" = 2-4 bullet points summarizing what the candidate is missing or weak on relative to the job.
- "suggested_keywords" = 5-10 keywords that the candidate should add or emphasise in the resume (matching job description and ATS).
- "highlight_pairs" = show up to 5 pairs where you quote a phrase from the job description ("jd_phrase") and show the exactly matching or similar phrase in the resume ("resume_excerpt").

### Resume and Job Description:
Resume:
"""
${resumeText}
"""

Job Description:
"""
${jobDescription}
"""
${externalSection}
Please output exactly valid JSON following the schema above, nothing else.`;
}


function extractURLs(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex) || [];
  return matches
    .filter(url => 
      url.includes("github.com") || 
      url.includes("linkedin.com") || 
      url.includes("portfolio") ||
      url.includes("personal") ||
      url.match(/\.(com|io|dev|me|xyz)/)
    )
    .slice(0, 5); // Limit to 5 URLs
}

// Fetch content from external URLs
async function fetchExternalContent(urls: string[]): Promise<string> {
  if (urls.length === 0) return "";

  const results = await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; ResumeScoreBot/1.0)",
          },
          signal: AbortSignal.timeout(5000), // 5 sec timeout
        });

        if (!response.ok) return null;

        const html = await response.text();
        // Basic text extraction (remove HTML tags)
        const text = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 2000); // First 2000 chars

        return `\n[${url}]\n${text}`;
      } catch (e) {
        console.error(`Failed to fetch ${url}:`, e);
        return null;
      }
    })
  );

  return results
    .filter(r => r.status === "fulfilled" && r.value)
    .map(r => (r as PromiseFulfilledResult<string | null>).value)
    .join("\n\n");
}

// Parse AI response to extract JSON
function parseAIResponse(rawResponse: string): any {
  try {
    let cleanJson = rawResponse.trim();
    cleanJson = cleanJson.replace(/```json\s*/g, "").replace(/```\s*/g, "");
    const firstBrace = cleanJson.indexOf("{");
    const lastBrace = cleanJson.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Failed to parse AI response:", e);
    return null;
  }
}

// Call OpenRouter DeepSeek
async function callOpenRouter(prompt: string): Promise<any> {
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost",
        "X-Title": "ResumeScore",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const rawResponse = data.choices?.[0]?.message?.content || "";
    return parseAIResponse(rawResponse);
  } catch (e) {
    console.error("OpenRouter call failed:", e);
    return null;
  }
}

// Call Ollama Cloud
async function callOllama(prompt: string): Promise<any> {
  try {
    const ollama = new Ollama({
      host: OLLAMA_URL,
      headers: { Authorization: 'Bearer ' + OLLAMA_API_KEY },
    });

    const response = await ollama.chat({
      model: OLLAMA_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    });

    // Ollama SDK returns the response object directly
    // Structure: { message: { content: "..." }, ... }
    const rawResponse = response.message?.content || "";
    
    if (!rawResponse) {
      console.error("Ollama returned empty response");
      return null;
    }

    console.log("Ollama raw response:", rawResponse.substring(0, 200));
    return parseAIResponse(rawResponse);
  } catch (e) {
    console.error("Ollama call failed:", e);
    return null;
  }
}

// Combine multiple LLM responses into consensus
function combineAnalyses(analyses: any[]): any {
  const validAnalyses = analyses.filter(a => a !== null);
  
  if (validAnalyses.length === 0) {
    return {
      score: null,
      breakdown: null,
      strengths: [],
      weaknesses: [],
      suggested_keywords: [],
      highlight_pairs: [],
      consensus: "No valid LLM responses received"
    };
  }

  // Average the scores
  const avgScore = Math.round(
    validAnalyses.reduce((sum, a) => sum + (a.score || 0), 0) / validAnalyses.length
  );

  // Average breakdown scores
  const breakdown = {
    skills: Math.round(
      validAnalyses.reduce((sum, a) => sum + (a.breakdown?.skills || 0), 0) / validAnalyses.length
    ),
    experience: Math.round(
      validAnalyses.reduce((sum, a) => sum + (a.breakdown?.experience || 0), 0) / validAnalyses.length
    ),
    projects: Math.round(
      validAnalyses.reduce((sum, a) => sum + (a.breakdown?.projects || 0), 0) / validAnalyses.length
    ),
    quality: Math.round(
      validAnalyses.reduce((sum, a) => sum + (a.breakdown?.quality || 0), 0) / validAnalyses.length
    ),
    education: Math.round(
      validAnalyses.reduce((sum, a) => sum + (a.breakdown?.education || 0), 0) / validAnalyses.length
    ),
    external: Math.round(
      validAnalyses.reduce((sum, a) => sum + (a.breakdown?.external || 0), 0) / validAnalyses.length
    ),
  };

  // Merge and deduplicate
  const allStrengths = validAnalyses.flatMap(a => a.strengths || []);
  const allWeaknesses = validAnalyses.flatMap(a => a.weaknesses || []);
  const allKeywords = validAnalyses.flatMap(a => a.suggested_keywords || []);
  const allHighlights = validAnalyses.flatMap(a => a.highlight_pairs || []);

  const strengths = [...new Set(allStrengths)].slice(0, 6);
  const weaknesses = [...new Set(allWeaknesses)].slice(0, 6);
  const suggested_keywords = [...new Set(allKeywords)].slice(0, 12);
  const highlight_pairs = allHighlights.slice(0, 6);

  return {
    score: avgScore,
    breakdown,
    strengths,
    weaknesses,
    suggested_keywords,
    highlight_pairs,
    llm_count: validAnalyses.length,
    individual_scores: validAnalyses.map(a => a.score),
  };
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("resume") as File | null;
    const jobDescription = (form.get("jd") as string | null) || "";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Guard PDF/Doc
    const isAllowed =
      file.type === "application/pdf" ||
      file.name?.toLowerCase().endsWith(".pdf") ||
      file.name?.toLowerCase().endsWith(".docx") ||
      file.name?.toLowerCase().endsWith(".doc");
    if (!isAllowed) {
      return NextResponse.json({ error: "Only PDF/DOC/DOCX files are allowed" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type || "application/pdf"};base64,${buffer.toString("base64")}`;

    const uploaded = await cloudinary.uploader.upload(dataUri, {
      folder: "resumes",
      resource_type: "raw",
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    });

    // Extract text from PDF
    const pdfResp = await fetch(uploaded.secure_url);
    if (!pdfResp.ok) {
      return NextResponse.json({
        success: true,
        cloudinaryUrl: uploaded.secure_url,
        publicId: uploaded.public_id,
        analysis: null,
        extractedText: null,
        bytes: uploaded.bytes,
        warning: `Could not fetch uploaded PDF for text extraction`,
      });
    }

    const pdfArrayBuf = await pdfResp.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuf);
    const extractedText = await extractTextFromBuffer(pdfBuffer);

    // Extract URLs and fetch external content
    const urls = extractURLs(extractedText);
    console.log("Found URLs:", urls);
    
    const externalContent = urls.length > 0 
      ? await fetchExternalContent(urls)
      : "";


    let finalAnalysis = null;
    
    if (jobDescription && jobDescription.trim().length > 0) {
      const prompt = buildDetailedPrompt(extractedText, jobDescription, externalContent);
      
      console.log("Calling LLMs in parallel...");
      
      // Call both LLMs in parallel
      const [openRouterResult, ollamaResult] = await Promise.all([
        callOpenRouter(prompt),
        callOllama(prompt),
      ]);

      console.log("OpenRouter score:", openRouterResult?.score);
      console.log("Ollama score:", ollamaResult?.score);

      // Combine results
      finalAnalysis = combineAnalyses([openRouterResult, ollamaResult]);
    }

    return NextResponse.json({
      success: true,
      cloudinaryUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
      analysis: finalAnalysis,
      extractedText,
      externalLinks: urls,
      bytes: uploaded.bytes,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Analysis failed",
      },
      { status: 500 }
    );
  }
}