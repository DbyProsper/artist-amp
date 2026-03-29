"""
Lyrics generation service
Uses a template-based approach with prompt analysis for reliable lyrics generation
"""

import logging
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import traceback

logger = logging.getLogger(__name__)


class LyricsService:
    """Service for generating lyrics"""
    
    # Lyric structures and templates
    VERSE_TEMPLATES = {
        "love": [
            "Every moment with you feels like a dream,\nYour love shines brighter than it might seem,\nWe're dancing through the night under stars so bright,\nYou make everything feel right.",
            "Lost in your eyes, I see forever,\nOur hearts beat together, now and never,\nWith every kiss, the world fades away,\nI fall for you more every day.",
        ],
        "heartbreak": [
            "The silence echoes where you used to be,\nBroken promises haunt my memory,\nI'm walking through the rain alone,\nTrying to find my way back home.",
            "Your love was a fire burning too bright,\nNow all I have is the cold of night,\nI'm searching for reasons to believe,\nBut all I can do is grieve.",
        ],
        "motivation": [
            "I'm climbing higher, reaching for the sky,\nWith every dream, I'll never say goodbye,\nThe struggle makes me strong, I'm standing tall,\nI'm giving my all, I'm giving my all.",
            "Every defeat just teaches me how to rise,\nI'm breaking free from these chains and ties,\nThe future's mine, I'm taking control,\nWith fire burning deep in my soul.",
        ],
        "party": [
            "Lights flashing, bass is crashing, feel the energy,\nEverybody dancing wild and free,\nThe beat goes on and on tonight,\nWe're living for the moment, feeling right.",
            "Let the music take you higher than the sky,\nWe're alive and we don't know why,\nJust keep dancing till the break of dawn,\nThe night is young and we carry on.",
        ],
    }
    
    HOOK_TEMPLATES = {
        "love": [
            "You're my forever, my every dream,\nYou're all that I need, you're my everything,\nTake my hand, don't let go,\nThis love's all I need to know.",
        ],
        "heartbreak": [
            "Now you're gone and I'm left alone,\nIn this house that don't feel like home,\nI'm searching for you, but you're not there,\nAll I'm left with is the pain we share.",
        ],
        "motivation": [
            "I'm reaching for the stars above,\nDoing what I love, with all my love,\nNo looking back, I'm moving on,\nI'm stronger now, my will is strong.",
        ],
        "party": [
            "Come and dance with me, all night long,\nFeel the rhythm, feel the song,\nRaise your hands up to the sky,\nWe're alive and we'll never die.",
        ],
    }
    
    BRIDGE_TEMPLATES = {
        "love": "In your arms I find my peace, my sanctuary, my reason, hold me close forever...",
        "heartbreak": "I'm picking up the pieces of my broken heart, learning how to start again, someday...",
        "motivation": "This is my moment, this is my time, I'm ready for the climb, nothing can stop me...",
        "party": "Keep the energy going, feel the vibe now, we're just getting started, let's go...",
    }
    
    def __init__(self):
        """Initialize the lyrics service"""
        logger.info("Lyrics service initialized")
    
    def _detect_genre(self, prompt: str) -> str:
        """
        Detect the genre from the prompt
        
        Args:
            prompt: User prompt
            
        Returns:
            Detected genre
        """
        prompt_lower = prompt.lower()
        
        if any(word in prompt_lower for word in ['love', 'heart', 'feel', 'emotions']):
            return 'love'
        elif any(word in prompt_lower for word in ['break', 'sad', 'pain', 'cry', 'heal']):
            return 'heartbreak'
        elif any(word in prompt_lower for word in ['rise', 'strong', 'success', 'win', 'achieve', 'dream']):
            return 'motivation'
        elif any(word in prompt_lower for word in ['dance', 'party', 'celebrate', 'fun', 'joy']):
            return 'party'
        else:
            return 'love'  # Default
    
    def _format_lyrics_section(self, title: str, content: str) -> str:
        """Format a lyrics section with title"""
        return f"\n[{title.upper()}]\n{content}\n"
    
    def generate(
        self,
        prompt: str,
        genre: Optional[str] = None,
        mood: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Generate lyrics from a text prompt
        
        Args:
            prompt: Text description of lyrics to generate
            genre: Optional genre specification
            mood: Optional mood specification
            
        Returns:
            Tuple of (lyrics_text, file_path)
        """
        try:
            logger.info(f"Generating lyrics with prompt: {prompt}")
            
            # Detect genre if not provided
            detected_genre = self._detect_genre(prompt) if genre is None else genre.lower()
            
            # Validate genre
            if detected_genre not in self.VERSE_TEMPLATES:
                detected_genre = 'love'
            
            logger.info(f"Using genre: {detected_genre}")
            
            # Build lyrics structure
            lyrics = ""
            
            # Add intro
            lyrics += self._format_lyrics_section(
                "Intro",
                f"Yeah, {prompt[:30]}..."
            )
            
            # Add verses
            verses = self.VERSE_TEMPLATES.get(detected_genre, self.VERSE_TEMPLATES['love'])
            lyrics += self._format_lyrics_section("Verse 1", verses[0])
            
            # Add hook
            hooks = self.HOOK_TEMPLATES.get(detected_genre, self.HOOK_TEMPLATES['love'])
            lyrics += self._format_lyrics_section("Hook", hooks[0])
            
            # Add second verse
            lyrics += self._format_lyrics_section("Verse 2", verses[1] if len(verses) > 1 else verses[0])
            
            # Add hook again
            lyrics += self._format_lyrics_section("Hook", hooks[0])
            
            # Add bridge
            bridge = self.BRIDGE_TEMPLATES.get(detected_genre, self.BRIDGE_TEMPLATES['love'])
            lyrics += self._format_lyrics_section("Bridge", bridge)
            
            # Add final hook
            lyrics += self._format_lyrics_section("Hook", hooks[0])
            
            # Add bridge
            bridge = self.BRIDGE_TEMPLATES.get(detected_genre, self.BRIDGE_TEMPLATES['love'])
            lyrics += self._format_lyrics_section("Bridge", bridge)
            
            # Add outro
            lyrics += self._format_lyrics_section("Outro", f"Yeah, {prompt[:30]}...")
            
            # Create filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"lyrics_{timestamp}.txt"
            
            logger.info(f"Lyrics generated successfully: {filename}")
            return lyrics, filename
            
        except Exception as e:
            logger.error(f"Error generating lyrics: {e}")
            logger.error(traceback.format_exc())
            raise RuntimeError(f"Lyrics generation failed: {str(e)}")


# Global instance
_lyrics_service: Optional[LyricsService] = None


def get_lyrics_service() -> LyricsService:
    """Get or create the global lyrics service instance"""
    global _lyrics_service
    if _lyrics_service is None:
        _lyrics_service = LyricsService()
    return _lyrics_service
