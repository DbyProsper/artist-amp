"""
Services package initialization
"""

from .music_service import MusicService, get_music_service
from .lyrics_service import LyricsService, get_lyrics_service
from .cover_service import CoverArtService, get_cover_service

__all__ = [
    "MusicService",
    "LyricsService",
    "CoverArtService",
    "get_music_service",
    "get_lyrics_service",
    "get_cover_service",
]
