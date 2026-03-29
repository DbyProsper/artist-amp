"""
Routes package initialization
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from routes.health import router as health_router
from routes.generation import router as generation_router
from routes.content_generation import router as content_router

__all__ = ["health_router", "generation_router", "content_router"]
