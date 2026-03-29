"""
Music and beat generation endpoints
"""

import logging
import os
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from models import MusicGenerateRequest, SuccessResponse, ErrorResponse
from services import get_music_service
from utils.file_handler import ensure_output_dir, get_relative_path, cleanup_old_files

logger = logging.getLogger(__name__)

router = APIRouter(tags=["generation"])


# Support both /generate/music and /generate-music formats
@router.post("/generate/music", response_model=SuccessResponse)
@router.post("/generate-music", response_model=SuccessResponse)
async def generate_music(
    request: MusicGenerateRequest,
    background_tasks: BackgroundTasks
) -> SuccessResponse:
    """
    Generate music from a text prompt
    
    Args:
        request: Music generation request with prompt, genre, mood, duration
        background_tasks: FastAPI background tasks for cleanup
        
    Returns:
        Success response with file path
    """
    try:
        logger.info(f"Music generation request: {request.prompt[:50]}...")
        
        # Get the music service
        music_service = get_music_service()
        
        # Check if model is available
        if music_service.model is None:
            raise HTTPException(
                status_code=503,
                detail="Music generation model not available. Please ensure AudioCraft is properly installed."
            )
        
        # Generate music
        audio_bytes, filename = music_service.generate(
            prompt=request.prompt,
            duration=request.duration or 8
        )
        
        # Save to outputs directory
        output_dir = ensure_output_dir()
        file_path = os.path.join(output_dir, filename)
        
        with open(file_path, 'wb') as f:
            f.write(audio_bytes)
        
        logger.info(f"Music saved to: {file_path}")
        
        # Schedule cleanup in background
        background_tasks.add_task(cleanup_old_files, max_files=50)
        
        # Return relative path
        relative_path = os.path.join("outputs", filename).replace("\\\\", "/")
        
        return SuccessResponse(
            status="success",
            file=relative_path,
            message="Music generated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating music: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Music generation failed: {str(e)}"
        )


@router.post("/generate/beat", response_model=SuccessResponse)
@router.post("/generate-beat", response_model=SuccessResponse)
async def generate_beat(
    request: MusicGenerateRequest,
    background_tasks: BackgroundTasks
) -> SuccessResponse:
    """
    Generate a beat (instrumental music) from a text prompt
    
    Args:
        request: Beat generation request
        background_tasks: FastAPI background tasks for cleanup
        
    Returns:
        Success response with file path
    """
    try:
        logger.info(f"Beat generation request: {request.prompt[:50]}...")
        
        # Add "instrumental" and "no vocals" to the prompt
        modified_prompt = f"{request.prompt}, instrumental, no vocals, rhythm-focused"
        
        music_service = get_music_service()
        
        if music_service.model is None:
            raise HTTPException(
                status_code=503,
                detail="Music generation model not available"
            )
        
        # Generate beat with modified prompt
        audio_bytes, filename = music_service.generate(
            prompt=modified_prompt,
            duration=request.duration or 8
        )
        
        # Save to outputs directory
        output_dir = ensure_output_dir()
        file_path = os.path.join(output_dir, filename)
        
        with open(file_path, 'wb') as f:
            f.write(audio_bytes)
        
        logger.info(f"Beat saved to: {file_path}")
        background_tasks.add_task(cleanup_old_files, max_files=50)
        
        relative_path = os.path.join("outputs", filename).replace("\\\\", "/")
        
        return SuccessResponse(
            status="success",
            file=relative_path,
            message="Beat generated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating beat: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Beat generation failed: {str(e)}"
        )
