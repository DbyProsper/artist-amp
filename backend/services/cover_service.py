"""
Cover art generation service
Uses PIL/Pillow to generate cover art from prompts
"""

import logging
import io
from datetime import datetime
from typing import Tuple, Optional
import traceback
import hashlib
import random

logger = logging.getLogger(__name__)

# Try to import image libraries
try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    PIL_AVAILABLE = True
except ImportError as e:
    logger.warning(f"PIL/Pillow not available: {e}")
    PIL_AVAILABLE = False


class CoverArtService:
    """Service for generating cover art"""
    
    # Color palettes by genre
    GENRE_COLORS = {
        "electronic": [(25, 0, 51), (255, 0, 127), (0, 255, 255)],  # Purple, pink, cyan
        "hip-hop": [(0, 0, 0), (255, 215, 0), (192, 192, 192)],  # Black, gold, silver
        "pop": [(255, 105, 180), (255, 192, 203), (255, 255, 255)],  # Hot pink, pink, white
        "rock": [(33, 33, 33), (220, 20, 60), (255, 140, 0)],  # Dark gray, crimson, orange
        "jazz": [(70, 130, 180), (210, 180, 140), (34, 34, 34)],  # Steel blue, tan, dark gray
        "ambient": [(176, 196, 222), (135, 206, 250), (240, 248, 255)],  # Light blue tones
        "classical": [(255, 215, 0), (192, 192, 192), (205, 92, 92)],  # Gold, silver, indian red
        "folk": [(139, 90, 43), (210, 105, 30), (173, 255, 47)],  # Brown tones
    }
    
    def __init__(self):
        """Initialize the cover art service"""
        logger.info("Cover art service initialized")
        self.available = PIL_AVAILABLE
        if not PIL_AVAILABLE:
            logger.warning("PIL/Pillow not available. Cover art generation will return placeholder URLs.")
    
    def _get_genre_colors(self, genre: str) -> list:
        """Get color palette for genre"""
        genre_lower = genre.lower() if genre else "electronic"
        return self.GENRE_COLORS.get(genre_lower, self.GENRE_COLORS["electronic"])
    
    def _generate_gradient_image(self, colors: list, width: int = 500, height: int = 500) -> Image.Image:
        """
        Generate a gradient image from colors
        
        Args:
            colors: List of RGB color tuples
            width: Image width
            height: Image height
            
        Returns:
            PIL Image object
        """
        try:
            image = Image.new('RGB', (width, height), colors[0])
            draw = ImageDraw.Draw(image, 'RGBA')
            
            # Create gradient effect
            num_colors = len(colors)
            step_height = height // num_colors
            
            for i, color in enumerate(colors):
                start_y = i * step_height
                end_y = (i + 1) * step_height if i < num_colors - 1 else height
                
                # Add some variation with alpha blending
                for y in range(start_y, end_y):
                    alpha = int(255 * (y - start_y) / (end_y - start_y))
                    next_color = colors[(i + 1) % num_colors]
                    blend = tuple(
                        int(color[j] * (255 - alpha) / 255 + next_color[j] * alpha / 255)
                        for j in range(3)
                    )
                    draw.line([(0, y), (width, y)], fill=blend)
            
            return image
            
        except Exception as e:
            logger.error(f"Error generating gradient: {e}")
            raise
    
    def _add_geometric_elements(self, image: Image.Image, prompt: str) -> Image.Image:
        """
        Add geometric elements to the image
        
        Args:
            image: PIL Image object
            prompt: User prompt (for seed)
            
        Returns:
            Modified PIL Image
        """
        try:
            draw = ImageDraw.Draw(image, 'RGBA')
            width, height = image.size
            
            # Use prompt hash for consistent random elements
            seed = int(hashlib.md5(prompt.encode()).hexdigest()[:8], 16)
            random.seed(seed)
            
            # Draw circles
            for _ in range(3):
                x = random.randint(0, width)
                y = random.randint(0, height)
                r = random.randint(20, 100)
                color = (random.randint(100, 255), random.randint(100, 255), 
                        random.randint(100, 255), 100)
                draw.ellipse([x-r, y-r, x+r, y+r], outline=color, width=3)
            
            # Draw rectangles
            for _ in range(2):
                x1 = random.randint(0, width-100)
                y1 = random.randint(0, height-100)
                x2 = x1 + random.randint(30, 150)
                y2 = y1 + random.randint(30, 150)
                color = (random.randint(100, 255), random.randint(100, 255),
                        random.randint(100, 255), 80)
                draw.rectangle([x1, y1, x2, y2], outline=color, width=2)
            
            # Apply subtle blur for smoothness
            image = image.filter(ImageFilter.GaussianBlur(radius=1))
            
            return image
            
        except Exception as e:
            logger.error(f"Error adding geometric elements: {e}")
            return image
    
    def _add_text(self, image: Image.Image, text: str) -> Image.Image:
        """
        Add text to the image
        
        Args:
            image: PIL Image object
            text: Text to add
            
        Returns:
            Modified PIL Image
        """
        try:
            draw = ImageDraw.Draw(image, 'RGBA')
            width, height = image.size
            
            # Truncate text if too long
            if len(text) > 25:
                text = text[:22] + "..."
            
            # Draw text with shadow effect
            text_y = height // 2 - 20
            
            # Shadow
            draw.text((20, text_y + 2), text, fill=(0, 0, 0, 150))
            # Main text
            draw.text((20, text_y), text, fill=(255, 255, 255, 255))
            
            return image
            
        except Exception as e:
            logger.error(f"Error adding text: {e}")
            return image
    
    def generate(
        self,
        prompt: str,
        genre: Optional[str] = None,
    ) -> Tuple[bytes, str]:
        """
        Generate cover art from a text prompt
        
        Args:
            prompt: Text description of the cover art
            genre: Optional genre specification
            
        Returns:
            Tuple of (image_bytes, file_path)
        """
        try:
            logger.info(f"Generating cover art with prompt: {prompt}")
            
            if not self.available:
                logger.warning("PIL not available, returning placeholder")
                # Return a minimal valid PNG as placeholder
                # This is a 1x1 white pixel PNG
                placeholder_png = b'\\x89PNG\\r\\n\\x1a\\n\\x00\\x00\\x00\\rIHDR\\x00\\x00\\x00\\x01\\x00\\x00\\x00\\x01\\x08\\x02\\x00\\x00\\x00\\x90wS\\xde\\x00\\x00\\x00\\x0cIDATx\\x9cc\\xf8\\xcf\\xc0\\x00\\x00\\x03\\x01\\x01\\x00\\x18\\xdd\\x8d\\xb4\\x00\\x00\\x00\\x00IEND\\xaeB`\\x82'
                filename = f"cover_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
                return placeholder_png, filename
            
            # Get colors for genre
            colors = self._get_genre_colors(genre)
            
            # Generate base gradient image
            image = self._generate_gradient_image(colors, width=500, height=500)
            
            # Add geometric elements
            image = self._add_geometric_elements(image, prompt)
            
            # Add text
            image = self._add_text(image, prompt[:30])
            
            # Convert to PNG bytes
            image_buffer = io.BytesIO()
            image.save(image_buffer, format='PNG')
            image_buffer.seek(0)
            image_bytes = image_buffer.read()
            
            # Create filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"cover_{timestamp}.png"
            
            logger.info(f"Cover art generated successfully: {filename}")
            return image_bytes, filename
            
        except Exception as e:
            logger.error(f"Error generating cover art: {e}")
            logger.error(traceback.format_exc())
            raise RuntimeError(f"Cover art generation failed: {str(e)}")


# Global instance
_cover_service: Optional[CoverArtService] = None


def get_cover_service() -> CoverArtService:
    """Get or create the global cover art service instance"""
    global _cover_service
    if _cover_service is None:
        _cover_service = CoverArtService()
    return _cover_service
