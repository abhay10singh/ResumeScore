# 🚀 ResumeScore Engine

AI-powered resume analysis engine using **LangChain** with multi-LLM consensus scoring.

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    ResumeScore Engine                         │
│                    (FastAPI + LangChain)                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │    Gemini   │    │   Ollama    │    │   OpenAI    │       │
│  │             │    │   Cloud     │    │   (Backup)  │       │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘       │
│         │                  │                  │               │
│         └──────────────────┼──────────────────┘               │
│                            ▼                                  │
│              ┌─────────────────────────┐                      │
│              │   Consensus Engine      │                      │
│              │   (Average + Merge)     │                      │
│              └─────────────────────────┘                      │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
engine/
├── engine.py              # Main FastAPI application
├── chains/
│   ├── __init__.py
│   └── resume_chain.py    # LangChain analysis logic
├── utils/
│   ├── __init__.py
│   ├── pdf_parser.py      # PDF/DOCX text extraction
│   └── url_fetcher.py     # External URL content fetching
├── requirements.txt       # Python dependencies
├── Dockerfile            # Container configuration
├── .env.example          # Environment variables template
└── README.md             # This file
```

## 🚀 Quick Start

### Local Development

1. **Create virtual environment:**
   ```bash
   cd engine
   python -m venv venv
   
   # Windows
   .\venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

4. **Run the server:**
   ```bash
   python engine.py
   ```

5. **Test the API:**
   - Open http://localhost:8080/docs for Swagger UI (Yeah !!, I tried Something New Here)
   - Health check: http://localhost:8080/health

### Using Docker

```bash
# Build
docker build -t resume-engine .

# Run
docker run -p 8080:8080 \
  -e GOOGLE_API_KEY=your-key \
  -e OLLAMA_API_KEY=your-key \
  resume-engine
```

## ☁️ Cloud Deployment

### Google Cloud Run

```bash
# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Deploy
gcloud run deploy resume-engine \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_API_KEY=xxx,OLLAMA_API_KEY=xxx,FRONTEND_URL=https://your-app.vercel.app"

# Get the URL
gcloud run services describe resume-engine --region us-central1 --format 'value(status.url)'
```

### Azure Container Apps

```bash
# Login
az login

# Create resource group
az group create --name resumescore-rg --location eastus

# Create container registry
az acr create --resource-group resumescore-rg --name resumescoreacr --sku Basic

# Build and push
az acr build --registry resumescoreacr --image resume-engine:v1 .

# Create container app environment
az containerapp env create \
  --name resumescore-env \
  --resource-group resumescore-rg \
  --location eastus

# Deploy
az containerapp create \
  --name resume-engine \
  --resource-group resumescore-rg \
  --environment resumescore-env \
  --image resumescoreacr.azurecr.io/resume-engine:v1 \
  --target-port 8080 \
  --ingress external \
  --env-vars GOOGLE_API_KEY=xxx OLLAMA_API_KEY=xxx
```

### AWS App Runner

```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin xxx.dkr.ecr.us-east-1.amazonaws.com

docker build -t resume-engine .
docker tag resume-engine:latest xxx.dkr.ecr.us-east-1.amazonaws.com/resume-engine:latest
docker push xxx.dkr.ecr.us-east-1.amazonaws.com/resume-engine:latest

# Deploy via AWS Console or CLI
```

## 📡 API Endpoints

### `GET /health`
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "service": "ResumeScore Engine"
}
```

### `POST /analyze`
Analyze a resume against a job description.

**Request (multipart/form-data):**
- `resume`: PDF/DOCX file
- `jd`: Job description text

**Response:**
```json
{
  "success": true,
  "score": 78,
  "breakdown": {
    "skills": 85,
    "experience": 70,
    "projects": 80,
    "quality": 75,
    "education": 65,
    "external": 60
  },
  "strengths": [
    "Strong Python and ML experience",
    "Relevant project portfolio"
  ],
  "weaknesses": [
    "Limited cloud infrastructure experience",
    "No Kubernetes mentioned"
  ],
  "suggested_keywords": [
    "Kubernetes", "CI/CD", "AWS"
  ],
  "highlight_pairs": [
    {
      "jd_phrase": "5+ years Python experience",
      "resume_excerpt": "6 years developing Python applications"
    }
  ],
  "external_links": ["https://github.com/username"],
  "llm_count": 2,
  "individual_scores": [76, 80]
}
```

### `POST /extract-text`
Extract text from resume without analysis (for debugging).

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | At least one LLM | GOOGLE API key |
| `OLLAMA_API_KEY` | At least one LLM | Ollama Cloud API key |
| `OPENAI_API_KEY` | Optional | OpenAI API key (backup) |
| `PORT` | No | Server port (default: 8080) |
| `HOST` | No | Server host (default: 0.0.0.0) |
| `FRONTEND_URL` | No | Frontend URL for CORS |

## 🧪 Testing

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest tests/ -v
```

## 📊 Scoring Rubric

| Category | Weight | Description |
|----------|--------|-------------|
| Skills | 35% | Technical skills match |
| Experience | 20% | Role relevance & seniority |
| Projects | 20% | Portfolio alignment |
| Quality | 15% | Resume formatting & clarity |
| Education | 5% | Degrees & certifications |
| External | 5% | GitHub, LinkedIn presence |

## 🛠️ Tech Stack

- **Framework:** FastAPI
- **AI/ML:** LangChain, GOOGLE, Ollama
- **PDF Processing:** pypdf, pdfplumber, python-docx
- **Async HTTP:** aiohttp
- **Deployment:** Docker, Cloud Run, Azure Container Apps

