# 🎯 ResumeScore - LangChain-Powered Resume-to-JD Matching System Multi-Model Ensemble

Instantly analyze how well your resume matches any job description using multi-LLM consensus scoring.

![ResumeScore Architecture](https://img.shields.io/badge/Architecture-Microservices-blue)
![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014-black)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20LangChain-green)
![Deployment](https://img.shields.io/badge/Deployment-Vercel%20%2B%20Cloud%20Run-purple)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-🦜-green)
![Next.js](https://img.shields.io/badge/Next.js%2014-black?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-8E75B2?logo=google&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)
![Cloud Run](https://img.shields.io/badge/Cloud%20Run-4285F4?logo=googlecloud&logoColor=white)

## 🚀 Live Demo

 [https://resumescore.vercel.app](https://resumescore.vercel.app)

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                         ResumeScore System                             │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌─────────────────────┐         ┌─────────────────────────────────┐  │
│   │    Frontend         │  HTTPS  │      Backend Engine             │  │
│   │    (Vercel)         │──────▶ |     (Google Cloud Run)          │  |
│   │                     │         │                                 │  │
│   │  • Next.js 14       │         │  • Python 3.11 + FastAPI        │  │
│   │  • TypeScript       │         │  • LangChain                    |  │
│   │  • Tailwind CSS     │         │  • Multi-LLM Consensus          │  │
│   │  • React Components │         │  • PDF/DOCX Parsing             │  │
│   └─────────────────────┘         └─────────────────────────────────┘  │
│                                                    │                   │
│                                                    ▼                   │
│                              ┌─────────────────────────────────────┐   │
│                              │         LLM Providers               │   │
│                              │                                     │   │
│                              │  ┌───────────┐  ┌───────────────┐   │   │
│                              │  │  GEMINI   │  | Ollama Cloud  │   │   │
│                              │  │           │  |               │   │   |
│                              │  └───────────┘  └───────────────┘   │   │
│                              └─────────────────────────────────────┘   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
ResumeScore/
│
├── frontend/                    # Next.js Frontend (Deployed to Vercel)
│   └── src/
│       ├── app/
│       │   ├── page.tsx        # Main upload page
│       │   ├── layout.tsx      # Root layout
│       │   └── api/
│       │       └── analyze/
│       │           ├── route.ts        # Current TypeScript implementation
│       │           └── route.proxy.ts  # Proxy to Python backend
│       ├── components/
│       │   ├── UploadForm.tsx
│       │   └── ResumeScoreExact.tsx
│       └── lib/
│           └── cloudinary.ts
│
├── engine/                      # Python Backend (Deployed to Cloud Run)
│   ├── engine.py               # FastAPI application
│   ├── chains/
│   │   └── resume_chain.py     # LangChain multi-LLM logic
│   ├── utils/
│   │   ├── pdf_parser.py       # PDF/DOCX extraction
│   │   └── url_fetcher.py      # External URL scraping
│   ├── requirements.txt
│   ├── Dockerfile
│   └── README.md
│
├── package.json                 # Frontend dependencies
└── README.md                    # This file 😊
```

---

## ✨ Features

- 📄 **PDF/DOCX Support** - Upload resumes in any common format
- 🎯 **Multi-LLM Consensus** - Uses multiple AI models for accurate scoring
- 📊 **Detailed Breakdown** - Scores for skills, experience, projects, quality
- 💡 **Actionable Insights** - Strengths, weaknesses, and keyword suggestions
- 🔗 **External Link Analysis** - Automatically analyzes GitHub, LinkedIn
- ⚡ **Fast & Scalable** - Serverless deployment on cloud infrastructure

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 14 | React framework with App Router |
| TypeScript | Type-safe JavaScript |
| Tailwind CSS | Utility-first styling |
| Vercel | Deployment & CDN |

### Backend Engine
| Technology | Purpose |
|------------|---------|
| Python 3.11 | Runtime |
| FastAPI | High-performance API framework |
| LangChain | LLM orchestration & chaining |
| pypdf/pdfplumber | PDF text extraction |
| aiohttp | Async HTTP client |
| Docker | Containerization |
| Cloud Run/Azure | Serverless deployment |

### AI/LLM Providers
| Provider | Model |
|----------|-------|
| GEMINI   |  gemini-3-pro-preview |
| Ollama Cloud | GPT-OSS 120B |
| OpenAI (backup) | GPT-4 Turbo |

---

## 🚀 Deployment steps if you want to Run For yourself
---

## 🔧 Local Development

### Frontend

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### Backend Engine

```bash
cd engine

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your API keys

# Run server
python engine.py

# Open http://localhost:8080/docs
```

---

## 📊 Scoring Rubric

| Category | Weight | Description |
|----------|--------|-------------|
| **Skills** | 35% | Technical skills match with job requirements |
| **Experience** | 20% | Role relevance, seniority, years |
| **Projects** | 20% | Portfolio alignment with responsibilities |
| **Quality** | 15% | Resume formatting, clarity, ATS-friendliness |
| **Education** | 5% | Degrees, certifications relevance |
| **External** | 5% | GitHub, LinkedIn, portfolio quality |

---

## 🔐 Environment Variables

### Frontend (.env.local)
```bash
BACKEND_ENGINE_URL=http://localhost:8080  # or your Cloud Run URL
```

### Backend Engine (.env)
```bash
# At least one LLM provider required
GOOGLE_API_KEY=sk-or-v1-xxx
OLLAMA_API_KEY=xxx

# Optional
OPENAI_API_KEY=sk-xxx
FRONTEND_URL=https://your-app.vercel.app
```

---

## 📝 API Reference

### `POST /analyze`

Analyze a resume against a job description.

**Request:**
```bash
curl -X POST https://your-engine.run.app/analyze \
  -F "resume=@resume.pdf" \
  -F "jd=We are looking for a Back-End Developer developer..."
```

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
  "strengths": ["Strong Python experience", "Relevant projects"],
  "weaknesses": ["Limited cloud experience"],
  "suggested_keywords": ["Kubernetes", "AWS", "CI/CD"],
  "highlight_pairs": [...]
}
```

---

## 👤 Author

**Abhay Singh**
- GitHub: [@abhay10singh](https://github.com/abhay10singh)

---



---

## 🙏 Acknowledgments

- [LangChain](https://langchain.com/) for LLM orchestration
- [Ollama] (https://ollama.com/) for the LLM APIs
- [Gemini] (NO thanks) Cause I bought the Keys
- [Vercel](https://vercel.com/) for frontend hosting
- [Google Cloud Run](https://cloud.google.com/run) for serverless containers
