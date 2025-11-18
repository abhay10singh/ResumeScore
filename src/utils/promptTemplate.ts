export function buildPrompt(resumeText: string, jobDescription: string): string {
  return `Analyze this resume against the job description and return a JSON response.

Resume Text:
${resumeText}

Job Description:
${jobDescription}

Return a JSON object with these exact fields:
- score: number from 0 to 100
- summary: brief summary string
- matched_skills: array of skills found in both resume and job description
- missing_skills: array of skills in job description but not in resume
- recommendations: array of improvement suggestions

Example format:
{
  "score": 75,
  "summary": "Good match with room for improvement",
  "matched_skills": ["JavaScript", "React"],
  "missing_skills": ["TypeScript", "Node.js"],
  "recommendations": ["Add TypeScript experience", "Highlight backend skills"]
}`;
}