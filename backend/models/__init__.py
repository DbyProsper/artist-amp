"""
Models package initialization
"""
from .schemas import (
    GenerateRequest,
    MusicGenerateRequest,
    LyricsGenerateRequest,
    CoverArtRequest,
    SuccessResponse,
    ErrorResponse,
    HealthResponse,
)

__all__ = [
    "GenerateRequest",
    "MusicGenerateRequest",
    "LyricsGenerateRequest",
    "CoverArtRequest",
    "SuccessResponse",
    "ErrorResponse",
    "HealthResponse",
]
