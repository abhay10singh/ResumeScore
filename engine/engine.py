
import os
from pathlib import Path
from dotenv import load_dotenv
env_path = Path(__file__).parent / ".env"
if not env_path.exists():
    env_path = Path(__file__).parent / ".env.example"
load_dotenv(env_path)

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn

from chains.resume_chain import analyze_resume
from utils.pdf_parser import extract_text_from_pdf
from utils.url_fetcher import fetch_external_content, extract_urls
from sqlalchemy.orm import Session
from database import get_db, engine, Base
from models import AnalysisResult
import hashlib

# Initialize FastAPI app
app = FastAPI(
    title="ResumeScore Engine",
    description="AI-powered resume analysis engine using LangChain with multi-LLM consensus",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    os.environ.get("FRONTEND_URL", "https://your-app.vercel.app"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BreakdownModel(BaseModel):
    skills: int
    experience: int
    projects: int
    quality: int
    education: int
    external: int


class HighlightPairModel(BaseModel):
    jd_phrase: str
    resume_excerpt: str
    
class AnalysisResponse(BaseModel):
    success: bool
    score: Optional[int] = None
    breakdown: Optional[BreakdownModel] = None
    strengths: List[str] = []
    weaknesses: List[str] = []
    suggested_keywords: List[str] = []
    highlight_pairs: List[HighlightPairModel] = []
    external_links: List[str] = []
    llm_count: Optional[int] = None
    individual_scores: Optional[List[int]] = None
    extracted_text: Optional[str] = None
    
class HealthResponse(BaseModel):
    status: str
    version: str
    service: str

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None
    
Base.metadata.create_all(bind=engine)
@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint - service info."""
    return {
        "status": "running",
        "version": "1.0.0",
        "service": "ResumeScore Engine"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for cloud deployment monitoring."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "ResumeScore Engine"
    }

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze(
    resume: UploadFile = File(..., description="Resume file (PDF/DOCX)"),
    job_description: str = Form(..., alias="jd", description="Job description text"),
    db: Session = Depends(get_db)
):
    """
    Analyze a resume against a job description using multi-LLM consensus.    
    - **resume**: PDF or DOCX file of the resume
    - **job_description**: Text of the job description to match against
    
    Returns a comprehensive analysis with scores, strengths, weaknesses, and suggestions.
    """
    # Validate file type
    filename = resume.filename or ""
    allowed_extensions = ('.pdf', '.docx', '.doc')
    
    if not filename.lower().endswith(allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    try:
        
        content = await resume.read()
        
        if len(content) == 0:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty"
            )  
        resume_hash = hashlib.sha256(content).hexdigest()         
        extracted_text = await extract_text_from_pdf(content, filename)        
        if not extracted_text or len(extracted_text.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail="Could not extract sufficient text from the uploaded file. Please ensure the file contains readable text."
            )                
        urls = extract_urls(extracted_text)
        print(f"Found {len(urls)} external URLs: {urls}")                
        external_content = ""
        if urls:
            external_content = await fetch_external_content(urls)
            print(f"Fetched external content: {len(external_content)} chars")                
        analysis = await analyze_resume(
            resume_text=extracted_text,
            job_description=job_description,
            external_content=external_content
        )
        print(f"📊 Analysis result: score = {analysis.get('score')}")
        print(f"💾 Attempting to save to database...")
        try:
            db_result = AnalysisResult(
                resume_hash=resume_hash,
                job_description=job_description[:2000],
                score=analysis.get("score"),
                breakdown=analysis.get("breakdown"),
                strengths=analysis.get("strengths", []),
                weaknesses=analysis.get("weaknesses", []),
                suggested_keywords=analysis.get("suggested_keywords", [])
            )
            db.add(db_result)
            db.commit()
            db.refresh(db_result)
            print(f"✅ Saved analysis to database with ID: {db_result.id}")
        except Exception as db_error:
            print(f"❌ Database save error: {db_error}")
            db.rollback()        
        return AnalysisResponse(
            success=True,
            score=analysis.get("score"),
            breakdown=analysis.get("breakdown"),
            strengths=analysis.get("strengths", []),
            weaknesses=analysis.get("weaknesses", []),
            suggested_keywords=analysis.get("suggested_keywords", []),
            highlight_pairs=analysis.get("highlight_pairs", []),
            external_links=urls,
            llm_count=analysis.get("llm_count"),
            individual_scores=analysis.get("individual_scores"),
            extracted_text=extracted_text[:1000] + "..." if len(extracted_text) > 1000 else extracted_text
        )        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Analysis error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )

@app.get("/db-test")
async def test_db(db: Session = Depends(get_db)):
    """Test database connection."""
    try:
        # Try to count records
        count = db.query(AnalysisResult).count()
        return {"status": "connected", "records": count}
    except Exception as e:
        return {"status": "error", "message": str(e)}  
    
@app.post("/extract-text")
async def extract_text_only(
    resume: UploadFile = File(..., description="Resume file (PDF/DOCX)")
):
    """
    Extract text from a resume without analysis.
    Useful for debugging or preview.
    """
    filename = resume.filename or ""
    
    if not filename.lower().endswith(('.pdf', '.docx', '.doc')):
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    try:
        content = await resume.read()
        extracted_text = await extract_text_from_pdf(content, filename)
        
        if not extracted_text:
            raise HTTPException(status_code=400, detail="Could not extract text")
        
        urls = extract_urls(extracted_text)
        
        return {
            "success": True,
            "text": extracted_text,
            "char_count": len(extracted_text),
            "word_count": len(extracted_text.split()),
            "external_links": urls
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    host = os.environ.get("HOST", "0.0.0.0")
    
    print(f"Starting ResumeScore Engine on {host}:{port}")
    print(f"API Docs: http://{host}:{port}/docs")
    
    uvicorn.run(
        "engine:app",
        host=host,
        port=port,
        reload=os.environ.get("ENV", "production") == "development"
    )
