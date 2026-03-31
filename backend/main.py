from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routes import quiz_routes
import os

app = FastAPI(
    title="Quiz Generator API",
    description="AI-powered quiz generation using Gemini",
    version="1.0.0"
)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "https://iquizu-29da7.firebaseapp.com",
    "https://iquizu-29da7.web.app",
    "https://iquizu.online",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# ✅ Manual fallback: handle OPTIONS preflight globally
@app.middleware("http")
async def cors_fallback_middleware(request: Request, call_next):
    origin = request.headers.get("origin", "")
    
    if request.method == "OPTIONS":
        response = JSONResponse(content={}, status_code=200)
        if origin in ALLOWED_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Max-Age"] = "600"
        return response
    
    response = await call_next(request)
    
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    
    return response

app.include_router(quiz_routes.router, prefix="/api/quiz", tags=["Quiz"])

@app.get("/")
async def root():
    return {"message": "Quiz Generator API", "status": "running", "docs": "/docs"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}