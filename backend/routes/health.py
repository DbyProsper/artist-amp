"""
Health check and system status endpoints
"""

import logging
from fastapi import APIRouter, Response
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from models import HealthResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Health check endpoint
    
    Returns:
        Health status response
    """
    logger.info("Health check requested")
    return HealthResponse(
        status="ok",
        service="artist-amp-backend",
        version="1.0.0"
    )


@router.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Artist Amp Backend",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "music": "/generate-music",
            "lyrics": "/generate-lyrics",
            "cover": "/generate-cover"
        }
    }
