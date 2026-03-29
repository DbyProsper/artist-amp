"""
Music generation service using MusicGen
"""

import torch
import torchaudio
import logging
from pathlib import Path
from typing import Optional, Tuple
from datetime import datetime
import traceback

logger = logging.getLogger(__name__)

# Try to import audiocraft - handle gracefully if not available
try:
    from audiocraft.models import MusicGen
    from audiocraft.data.audio_utils import convert_audio
    AUDIOCRAFT_AVAILABLE = True
except ImportError as e:
    logger.warning(f"AudioCraft not available: {e}")
    AUDIOCRAFT_AVAILABLE = False


class MusicService:
    """Service for generating music using MusicGen"""
    
    def __init__(self):
        """Initialize the music service"""
        self.model = None
        self.device = None
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize the MusicGen model"""
        try:
            if not AUDIOCRAFT_AVAILABLE:
                logger.warning("AudioCraft is not available. Music generation will not work.")
                return
            
            # Detect device
            self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
            logger.info(f"Using device: {self.device}")
            
            # Load model - use a smaller model for better performance
            logger.info("Loading MusicGen model...")
            self.model = MusicGen.get_mps_dict()
            if 'facebook/musicgen-small' in self.model:
                self.model = MusicGen.get_mps_dict()['facebook/musicgen-small']
                logger.info("Loaded facebook/musicgen-small")
            else:
                # Fallback to default
                logger.info("Loading default MusicGen model...")
                self.model = MusicGen.get_mps_dict()
                
        except Exception as e:
            logger.error(f"Error initializing MusicGen model: {e}")
            logger.error(traceback.format_exc())
            self.model = None
    
    def generate(
        self,
        prompt: str,
        duration: int = 8,
        temperature: float = 1.0
    ) -> Tuple[bytes, str]:
        """
        Generate music from a text prompt
        
        Args:
            prompt: Text description of the music to generate
            duration: Duration in seconds (1-30)
            temperature: Sampling temperature (0.0-1.0)
            
        Returns:
            Tuple of (audio_bytes, file_path)
        """
        try:
            if self.model is None:
                raise RuntimeError("MusicGen model not initialized")
            
            # Clamp duration between 1 and 30 seconds
            duration = max(1, min(30, duration))
            
            logger.info(f"Generating music with prompt: {prompt}")
            logger.info(f"Duration: {duration}s, Temperature: {temperature}")
            
            # Generate audio
            with torch.no_grad():
                descriptions = [prompt]
                wav = self.model.generate(descriptions, top_k=250, top_p=0, temperature=temperature)
            
            # Handle the generated waveform
            if wav is None or wav.numel() == 0:
                raise RuntimeError("Failed to generate audio - model returned empty result")
            
            # Convert to mono if necessary and resample to 16kHz
            if wav.shape[0] > 1:
                wav = wav.mean(dim=0, keepdim=True)
            
            # Ensure proper sample rate
            sample_rate = 16000  # MusicGen default output rate
            
            # Convert to WAV format
            audio_bytes = self._waveform_to_wav(wav[0], sample_rate)
            
            # Create output filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"music_{timestamp}.wav"
            
            logger.info(f"Music generated successfully: {filename}")
            return audio_bytes, filename
            
        except Exception as e:
            logger.error(f"Error generating music: {e}")
            logger.error(traceback.format_exc())
            raise RuntimeError(f"Music generation failed: {str(e)}")
    
    @staticmethod
    def _waveform_to_wav(waveform: torch.Tensor, sample_rate: int) -> bytes:
        """
        Convert a PyTorch waveform tensor to WAV bytes
        
        Args:
            waveform: Audio waveform tensor
            sample_rate: Sample rate of the audio
            
        Returns:
            WAV file as bytes
        """
        try:
            # Ensure we have the right shape
            if waveform.dim() == 1:
                waveform = waveform.unsqueeze(0)
            
            # Move to CPU if on GPU
            if waveform.is_cuda:
                waveform = waveform.cpu()
            
            # Normalize to [-1, 1] range
            max_val = waveform.abs().max()
            if max_val > 1.0:
                waveform = waveform / max_val
            
            # Convert to WAV format in memory
            import io
            wav_buffer = io.BytesIO()
            torchaudio.save(wav_buffer, waveform, sample_rate, format="wav")
            wav_buffer.seek(0)
            return wav_buffer.read()
            
        except Exception as e:
            logger.error(f"Error converting waveform to WAV: {e}")
            raise RuntimeError(f"Audio conversion failed: {str(e)}")


# Global instance
_music_service: Optional[MusicService] = None


def get_music_service() -> MusicService:
    """Get or create the global music service instance"""
    global _music_service
    if _music_service is None:
        _music_service = MusicService()
    return _music_service
