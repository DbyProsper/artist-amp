"""
Utility functions for the backend
"""

import os
import base64
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Output directory for generated files
OUTPUT_DIR = Path(__file__).parent.parent / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)


def ensure_output_dir() -> Path:
    """Ensure output directory exists"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return OUTPUT_DIR


def encode_to_base64(file_path: str) -> str:
    """
    Encode a file to base64 string
    
    Args:
        file_path: Path to the file to encode
        
    Returns:
        Base64 encoded string
    """
    try:
        with open(file_path, 'rb') as f:
            file_data = f.read()
        return base64.b64encode(file_data).decode('utf-8')
    except Exception as e:
        logger.error(f"Error encoding file to base64: {e}")
        raise


def get_relative_path(file_path: str) -> str:
    """
    Get relative path from outputs directory
    
    Args:
        file_path: Absolute path to the file
        
    Returns:
        Relative path suitable for URL construction
    """
    try:
        return os.path.relpath(file_path, OUTPUT_DIR)
    except Exception as e:
        logger.error(f"Error getting relative path: {e}")
        raise


def cleanup_old_files(max_files: int = 50) -> None:
    """
    Cleanup old files to manage disk space
    
    Args:
        max_files: Maximum number of files to keep
    """
    try:
        files = sorted(OUTPUT_DIR.glob('*'), key=os.path.getctime)
        if len(files) > max_files:
            for old_file in files[:-max_files]:
                try:
                    old_file.unlink()
                    logger.info(f"Cleaned up old file: {old_file}")
                except Exception as e:
                    logger.error(f"Error cleaning up file {old_file}: {e}")
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
