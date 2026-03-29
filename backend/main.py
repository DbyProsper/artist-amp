"""
FastAPI application entry point
Main application with CORS, middleware, and route registration
"""

import logging
import sys
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add backend directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Import routes
from routes import health_router, generation_router, content_router

# Create FastAPI app
app = FastAPI(
    title="Artist Amp Backend",
    description="AI Music Generation Backend for Artist Amp",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS - Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development (restrict in production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex="http://.*",
)


# Custom exception handler for general exceptions
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"status": "error", "message": "Internal server error", "detail": str(exc)},
    )


# Health check middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests"""
    logger.info(f"{request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response


# Mount static files for generated content
try:
    outputs_path = Path(__file__).parent / "outputs"
    outputs_path.mkdir(exist_ok=True)
    app.mount("/outputs", StaticFiles(directory=str(outputs_path)), name="outputs")
    logger.info(f"Mounted outputs directory: {outputs_path}")
except Exception as e:
    logger.error(f"Error mounting outputs directory: {e}")


# Register routes
app.include_router(health_router)
app.include_router(generation_router)
app.include_router(content_router)

logger.info("All routes registered successfully")


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting up Artist Amp Backend...")
    
    try:
        # Initialize services
        from services import get_music_service, get_lyrics_service, get_cover_service
        
        logger.info("Initializing music service...")
        music_service = get_music_service()
        if music_service.model is not None:
            logger.info("✓ Music service initialized successfully")
        else:
            logger.warning("⚠ Music service initialized but model not loaded")
        
        logger.info("Initializing lyrics service...")
        lyrics_service = get_lyrics_service()
        logger.info("✓ Lyrics service initialized successfully")
        
        logger.info("Initializing cover art service...")
        cover_service = get_cover_service()
        logger.info("✓ Cover art service initialized successfully")
        
        logger.info("✓ All services initialized!")
        
    except Exception as e:
        logger.error(f"Error during startup: {e}", exc_info=True)


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Artist Amp Backend...")
    logger.info("✓ Shutdown complete")


def run_server(host: str = "127.0.0.1", port: int = 8000, reload: bool = False):
    """
    Run the FastAPI server
    
    Args:
        host: Host address to bind to
        port: Port number
        reload: Enable auto-reload on file changes
    """
    logger.info(f"Starting server on {host}:{port}")
    logger.info(f"Documentation available at http://{host}:{port}/docs")
    logger.info(f"Frontend should connect to http://{host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info",
    )


if __name__ == "__main__":
    # Run with reload in development
    run_server(reload=False)
