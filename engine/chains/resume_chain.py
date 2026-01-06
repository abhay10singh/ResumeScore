
import os
import asyncio
from typing import Optional, List, Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
class ResumeBreakdown(BaseModel):
    """Score breakdown by category."""
    skills: int = Field(description="Skills match score 0-100", ge=0, le=100)
    experience: int = Field(description="Experience match score 0-100", ge=0, le=100)
    projects: int = Field(description="Projects/portfolio match score 0-100", ge=0, le=100)
    quality: int = Field(description="Resume quality score 0-100", ge=0, le=100)
    education: int = Field(description="Education & certifications score 0-100", ge=0, le=100)
    external: int = Field(description="External presence score 0-100", ge=0, le=100)


class HighlightPair(BaseModel):
    """A matching pair between job description and resume."""
    jd_phrase: str = Field(description="Phrase from job description")
    resume_excerpt: str = Field(description="Matching excerpt from resume")


class ResumeAnalysis(BaseModel):
    """Complete resume analysis result."""
    score: int = Field(description="Overall weighted score 0-100", ge=0, le=100)
    breakdown: ResumeBreakdown = Field(description="Score breakdown by category")
    strengths: List[str] = Field(description="2-4 key strengths", min_length=2, max_length=6)
    weaknesses: List[str] = Field(description="2-4 key weaknesses", min_length=2, max_length=6)
    suggested_keywords: List[str] = Field(description="5-10 keywords to add", min_length=5, max_length=15)
    highlight_pairs: List[HighlightPair] = Field(description="Up to 5 JD-resume matching pairs", max_length=5)


RESUME_ANALYSIS_PROMPT = """You are a highly experienced hiring-manager and career consultant with expertise in ATS systems and resume optimization.

Your task: Evaluate how well a candidate's resume matches a given job description and produce a **structured JSON output only**.

### Scoring Rubric (use these weights for final score):
- **Skills match (35%)**: How closely the resume demonstrates required and preferred skills from the job description.
- **Experience match (20%)**: Relevance of roles, seniority level, years of experience, industry alignment.
- **Projects/Portfolio (20%)**: Alignment of projects, side-projects, GitHub contributions with job responsibilities.
- **Resume quality (15%)**: Clarity, structure, formatting, ATS-friendliness, grammar, readability.
- **Education & Certifications (5%)**: Relevance of degrees, certifications, courses to job requirements.
- **External presence (5%)**: Quality of portfolio, GitHub activity, LinkedIn completeness if provided.

### Scoring Guidelines:
- 90-100: Exceptional match, exceeds requirements
- 75-89: Strong match, meets most requirements
- 60-74: Good match, meets core requirements
- 45-59: Partial match, missing some key requirements
- 30-44: Weak match, significant gaps
- 0-29: Poor match, major misalignment

### Analysis Instructions:
1. Read the job description carefully - identify required skills, responsibilities, experience level, certifications.
2. Read the resume carefully - extract skills, experience, projects, education.
3. Score each category 0-100 based on match quality.
4. Calculate final score: 0.35×skills + 0.20×experience + 0.20×projects + 0.15×quality + 0.05×education + 0.05×external
5. Identify 2-4 concrete strengths the candidate has for this role.
6. Identify 2-4 concrete weaknesses or gaps relative to job requirements.
7. Suggest 5-10 keywords from the JD that candidate should incorporate.
8. Find up to 5 specific phrases where JD requirements match resume content.

### Resume:
\"\"\"
{resume_text}
\"\"\"

### Job Description:
\"\"\"
{job_description}
\"\"\"

{external_section}

Respond with valid JSON matching this exact schema:
{{
  "score": <integer 0-100>,
  "breakdown": {{
    "skills": <integer 0-100>,
    "experience": <integer 0-100>,
    "projects": <integer 0-100>,
    "quality": <integer 0-100>,
    "education": <integer 0-100>,
    "external": <integer 0-100>
  }},
  "strengths": ["<string>", ...],
  "weaknesses": ["<string>", ...],
  "suggested_keywords": ["<string>", ...],
  "highlight_pairs": [
    {{"jd_phrase": "<string>", "resume_excerpt": "<string>"}},
    ...
  ]
}}

Output ONLY valid JSON, no other text."""



def get_gemini_llm() -> ChatOpenAI:
    """
    Initialize gemini-3-pro-preview .
    """
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set")
    
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set")
    
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=api_key,
        temperature=0.1,
        max_output_tokens=4000
    )



def get_ollama_llm() -> ChatOpenAI:
    """
    Initialize Ollama Cloud LLM.
    Requires OLLAMA_API_KEY environment variable.
    """
    api_key = os.environ.get("OLLAMA_API_KEY")
    if not api_key:
        raise ValueError("OLLAMA_API_KEY environment variable not set")
    
    return ChatOpenAI(
        model=os.environ.get("OLLAMA_MODEL", "deepseek-v3:671b"),
        openai_api_key=api_key,
        openai_api_base=os.environ.get("OLLAMA_URL", "https://ollama.com/v1"),
        temperature=0.1,
        max_tokens=4000
    )


def get_backup_llm() -> ChatOpenAI:
    """
    Backup LLM using OpenAI GPT-4 if available.
    Requires OPENAI_API_KEY environment variable.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None
    
    return ChatOpenAI(
        model="gpt-4-turbo-preview",
        openai_api_key=api_key,
        temperature=0.1,
        max_tokens=4000
    )



def create_analysis_chain(llm: ChatOpenAI):
    """Create a LangChain for resume analysis with structured output."""
    prompt = ChatPromptTemplate.from_template(RESUME_ANALYSIS_PROMPT)
    parser = JsonOutputParser(pydantic_object=ResumeAnalysis)
    
    chain = prompt | llm | parser
    return chain


async def run_single_llm(
    chain,
    inputs: Dict[str, str],
    llm_name: str
) -> Optional[Dict[str, Any]]:
    """
    Run a single LLM chain with error handling.
    Returns None if the chain fails.
    """
    try:
        print(f"Running {llm_name}...")
        result = await chain.ainvoke(inputs)
        print(f"{llm_name} completed successfully")
        return result
    except Exception as e:
        print(f"{llm_name} failed: {type(e).__name__}: {e}")
        return None



def combine_analyses(analyses: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Combine multiple LLM responses into a consensus result.
    Averages numerical scores and merges/deduplicates lists.
    """
    valid = [a for a in analyses if a is not None]
    
    if not valid:
        return {
            "score": None,
            "breakdown": None,
            "strengths": [],
            "weaknesses": [],
            "suggested_keywords": [],
            "highlight_pairs": [],
            "consensus": "No valid LLM responses received",
            "llm_count": 0,
            "individual_scores": []
        }
    
    n = len(valid)
    
    # Average 
    avg_score = round(sum(a.get("score", 0) for a in valid) / n)
    
    # Average each breakdown category
    breakdown = {
        "skills": round(sum(a.get("breakdown", {}).get("skills", 0) for a in valid) / n),
        "experience": round(sum(a.get("breakdown", {}).get("experience", 0) for a in valid) / n),
        "projects": round(sum(a.get("breakdown", {}).get("projects", 0) for a in valid) / n),
        "quality": round(sum(a.get("breakdown", {}).get("quality", 0) for a in valid) / n),
        "education": round(sum(a.get("breakdown", {}).get("education", 0) for a in valid) / n),
        "external": round(sum(a.get("breakdown", {}).get("external", 0) for a in valid) / n),
    }
    
    all_strengths = []
    all_weaknesses = []
    all_keywords = []
    all_highlights = []
    
    for a in valid:
        all_strengths.extend(a.get("strengths", []))
        all_weaknesses.extend(a.get("weaknesses", []))
        all_keywords.extend(a.get("suggested_keywords", []))
        all_highlights.extend(a.get("highlight_pairs", []))
    
    def dedupe(items: List[str], max_count: int) -> List[str]:
        seen = set()
        result = []
        for item in items:
            normalized = item.lower().strip()
            if normalized not in seen:
                seen.add(normalized)
                result.append(item)
                if len(result) >= max_count:
                    break
        return result
    
    seen_phrases = set()
    unique_highlights = []
    for h in all_highlights:
        phrase = h.get("jd_phrase", "").lower().strip()
        if phrase and phrase not in seen_phrases:
            seen_phrases.add(phrase)
            unique_highlights.append(h)
            if len(unique_highlights) >= 6:
                break
    
    return {
        "score": avg_score,
        "breakdown": breakdown,
        "strengths": dedupe(all_strengths, 6),
        "weaknesses": dedupe(all_weaknesses, 6),
        "suggested_keywords": dedupe(all_keywords, 12),
        "highlight_pairs": unique_highlights,
        "llm_count": n,
        "individual_scores": [a.get("score") for a in valid]
    }


async def analyze_resume(
    resume_text: str,
    job_description: str,
    external_content: str = ""
) -> Dict[str, Any]:
    """
    Main function to analyze resume using multiple LLMs via LangChain.
    
    Args:
        resume_text: Extracted text from the resume
        job_description: The job description to match against
        external_content: Optional content fetched from external URLs
    
    Returns:
        Combined analysis result with consensus scores
    """

    external_section = ""
    if external_content and external_content.strip():
        external_section = f"""### Additional Information from External Links (GitHub, LinkedIn, Portfolio):
\"\"\"
{external_content[:3000]}
\"\"\""""
    
    inputs = {
        "resume_text": resume_text,
        "job_description": job_description,
        "external_section": external_section
    }
    
    llms_to_run = []
    
    try:
        gemini_llm = get_gemini_llm()
        gemini_chain = create_analysis_chain(gemini_llm)
        llms_to_run.append(("Gemini", gemini_chain))
    except ValueError as e:
        print(f"gemini not available: {e}")
    
    try:
        ollama_llm = get_ollama_llm()
        ollama_chain = create_analysis_chain(ollama_llm)
        llms_to_run.append(("Ollama", ollama_chain))
    except ValueError as e:
        print(f"Ollama not available: {e}")
    
    try:
        backup_llm = get_backup_llm()
        if backup_llm:
            backup_chain = create_analysis_chain(backup_llm)
            llms_to_run.append(("OpenAI/GPT-4", backup_chain))
    except Exception as e:
        print(f"Backup LLM not available: {e}")
    
    if not llms_to_run:
        return {
            "score": None,
            "breakdown": None,
            "strengths": [],
            "weaknesses": [],
            "suggested_keywords": [],
            "highlight_pairs": [],
            "error": "No LLM providers configured. Set OPENROUTER_API_KEY, OLLAMA_API_KEY, or OPENAI_API_KEY.",
            "llm_count": 0
        }
    
    print(f"Running analysis with {len(llms_to_run)} LLM(s): {[name for name, _ in llms_to_run]}")
    
    # Run all LLMs in parallel
    tasks = [
        run_single_llm(chain, inputs, name)
        for name, chain in llms_to_run
    ]
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Filter out exceptions and None results
    valid_results = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            print(f"LLM {i} raised exception: {result}")
        elif result is not None:
            valid_results.append(result)
    
    # Combine into consensus
    return combine_analyses(valid_results)
