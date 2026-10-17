# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.wordle import router as wordle_router

app = FastAPI(title="Wordle Solver API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(wordle_router)


@app.get("/health")
def health():
    return {"status": "ok"}
