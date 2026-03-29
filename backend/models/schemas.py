"""
Pydantic models for API requests and responses
"""

from pydantic import BaseModel, Field
from typing import Optional


class GenerateRequest(BaseModel):
    """Base request model for generation endpoints"""
    prompt: str = Field(..., min_length=1, max_length=500)


class MusicGenerateRequest(GenerateRequest):
    """Request model for music generation"""
    genre: Optional[str] = Field(default="electronic", max_length=50)
    mood: Optional[str] = Field(default="uplifting", max_length=50)
    duration: Optional[int] = Field(default=8, ge=1, le=30)  # 1-30 seconds


class LyricsGenerateRequest(GenerateRequest):
    """Request model for lyrics generation"""
    genre: Optional[str] = Field(default="pop", max_length=50)
    mood: Optional[str] = Field(default="happy", max_length=50)


class CoverArtRequest(GenerateRequest):
    """Request model for cover art generation"""
    genre: Optional[str] = Field(default="electronic", max_length=50)


class SuccessResponse(BaseModel):
    """Standard success response"""
    status: str = "success"
    file: Optional[str] = None
    message: Optional[str] = None


class ErrorResponse(BaseModel):
    """Standard error response"""
    status: str = "error"
    message: str
    detail: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = "ok"
    service: str = "artist-amp-backend"
    version: str = "1.0.0"
