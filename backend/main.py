"""
Render compatibility shim at backend/main.py
Render auto-detects and runs: uvicorn main:app --host 0.0.0.0 --port $PORT
This re-exports the FastAPI app so Render's auto-detected command works.
"""
from app.main import app  # noqa: F401

__all__ = ["app"]