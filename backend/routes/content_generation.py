"""
Lyrics and cover art generation endpoints
"""

import logging
import os
from fastapi import APIRouter, HTTPException, BackgroundTasks
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from models import LyricsGenerateRequest, CoverArtRequest, SuccessResponse
from services import get_lyrics_service, get_cover_service
from utils.file_handler import ensure_output_dir, cleanup_old_files

logger = logging.getLogger(__name__)

router = APIRouter(tags=["generation"])


# Support both /generate/lyrics and /generate-lyrics formats
@router.post("/generate/lyrics", response_model=SuccessResponse)
@router.post("/generate-lyrics", response_model=SuccessResponse)
async def generate_lyrics(
    request: LyricsGenerateRequest,
    background_tasks: BackgroundTasks
) -> SuccessResponse:
    """
    Generate lyrics from a text prompt
    
    Args:
        request: Lyrics generation request with prompt, genre, mood
        background_tasks: FastAPI background tasks for cleanup
        
    Returns:
        Success response with lyrics content
    """
    try:
        logger.info(f"Lyrics generation request: {request.prompt[:50]}...")
        
        lyrics_service = get_lyrics_service()
        
        # Generate lyrics
        lyrics_text, filename = lyrics_service.generate(
            prompt=request.prompt,
            genre=request.genre,
            mood=request.mood
        )
        
        # Save to outputs directory
        output_dir = ensure_output_dir()
        file_path = os.path.join(output_dir, filename)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(lyrics_text)
        
        logger.info(f"Lyrics saved to: {file_path}")
        background_tasks.add_task(cleanup_old_files, max_files=50)
        
        # Return as inline content (base64 encoded for safety)
        import base64
        encoded_lyrics = base64.b64encode(lyrics_text.encode('utf-8')).decode('utf-8')
        
        return SuccessResponse(
            status="success",
            file=encoded_lyrics,
            message="Lyrics generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error generating lyrics: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Lyrics generation failed: {str(e)}"
        )


@router.post("/generate/cover", response_model=SuccessResponse)
@router.post("/generate-cover", response_model=SuccessResponse)
async def generate_cover(
    request: CoverArtRequest,
    background_tasks: BackgroundTasks
) -> SuccessResponse:
    """
    Generate cover art from a text prompt
    
    Args:
        request: Cover art generation request with prompt and genre
        background_tasks: FastAPI background tasks for cleanup
        
    Returns:
        Success response with image file path or base64
    """
    try:
        logger.info(f"Cover art generation request: {request.prompt[:50]}...")
        
        cover_service = get_cover_service()
        
        # Generate cover art
        image_bytes, filename = cover_service.generate(
            prompt=request.prompt,
            genre=request.genre
        )
        
        # Save to outputs directory
        output_dir = ensure_output_dir()
        file_path = os.path.join(output_dir, filename)
        
        with open(file_path, 'wb') as f:
            f.write(image_bytes)
        
        logger.info(f"Cover art saved to: {file_path}")
        background_tasks.add_task(cleanup_old_files, max_files=50)
        
        # Return file path
        relative_path = os.path.join("outputs", filename).replace("\\\\", "/")
        
        return SuccessResponse(
            status="success",
            file=relative_path,
            message="Cover art generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error generating cover art: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Cover art generation failed: {str(e)}"
        )
