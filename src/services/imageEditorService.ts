import { EditorOverlay, SaveEditedImageRequest, SaveEditedImageResponse } from '@/types/imageEditor';

const API_BASE_URL = 'https://musicinsta-ai-973497466485.us-central1.run.app';

/**
 * Save edited image with overlays to backend
 * @param baseImageUrl - URL of the base image
 * @param overlays - Array of overlays applied to the image
 * @returns URL of the edited image or null if failed
 */
export async function saveEditedImage(
  baseImageUrl: string,
  overlays: EditorOverlay[]
): Promise<string | null> {
  try {
    const payload: SaveEditedImageRequest = {
      baseImageUrl,
      overlays,
    };

    const response = await fetch(`${API_BASE_URL}/media/save-edited`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Backend error:', error);
      throw new Error(`Failed to save edited image: ${response.statusText}`);
    }

    const data: SaveEditedImageResponse = await response.json();

    if (!data.success || !data.imageUrl) {
      throw new Error(data.error || 'No image URL returned');
    }

    return data.imageUrl;
  } catch (error) {
    console.error('Error saving edited image:', error);
    return null;
  }
}

/**
 * Generate a canvas image from overlays (client-side rendering)
 * Useful for preview or as fallback
 */
export async function renderEditedImage(
  baseImageUrl: string,
  overlays: EditorOverlay[],
  width: number = 800,
  height: number = 600
): Promise<string | null> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Could not get canvas context');

    // Draw base image
    const img = new Image();
    img.crossOrigin = 'anonymous';

    return new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);

        // Draw overlays
        overlays.forEach((overlay) => {
          ctx.save();
          ctx.translate(overlay.x, overlay.y);
          ctx.rotate((overlay.rotation * Math.PI) / 180);

          switch (overlay.type) {
            case 'text': {
              const textOverlay = overlay as any;
              ctx.font = `${textOverlay.style.fontWeight} ${textOverlay.style.fontSize}px ${textOverlay.style.fontFamily || 'Arial'}`;
              ctx.fillStyle = textOverlay.style.color;
              ctx.globalAlpha = textOverlay.style.opacity;
              ctx.scale(textOverlay.scale, textOverlay.scale);
              ctx.fillText(textOverlay.content, 0, 0);
              break;
            }

            case 'emoji': {
              const emojiOverlay = overlay as any;
              ctx.font = `${emojiOverlay.fontSize}px Arial`;
              ctx.globalAlpha = 1;
              ctx.scale(emojiOverlay.scale, emojiOverlay.scale);
              ctx.fillText(emojiOverlay.content, 0, 0);
              break;
            }

            case 'image': {
              const imageOverlay = overlay as any;
              const overlayImg = new Image();
              overlayImg.crossOrigin = 'anonymous';
              overlayImg.src = imageOverlay.content;
              ctx.scale(imageOverlay.scale, imageOverlay.scale);
              ctx.globalAlpha = 1;
              ctx.drawImage(
                overlayImg,
                -imageOverlay.width / 2,
                -imageOverlay.height / 2,
                imageOverlay.width,
                imageOverlay.height
              );
              break;
            }
          }

          ctx.restore();
        });

        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      };

      img.onerror = () => {
        reject(new Error('Failed to load base image'));
      };

      img.src = baseImageUrl;
    });
  } catch (error) {
    console.error('Error rendering edited image:', error);
    return null;
  }
}

/**
 * Export edited image as File
 */
export async function exportEditedImage(
  baseImageUrl: string,
  overlays: EditorOverlay[],
  filename: string = 'edited-image.png',
  width: number = 800,
  height: number = 600
): Promise<File | null> {
  try {
    const dataUrl = await renderEditedImage(baseImageUrl, overlays, width, height);
    if (!dataUrl) return null;

    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], filename, { type: 'image/png' });
  } catch (error) {
    console.error('Error exporting image:', error);
    return null;
  }
}
