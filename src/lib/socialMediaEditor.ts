import type { SocialEditState } from '@/types/socialEditor';
import { socialFilter } from '@/types/socialEditor';

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The image could not be prepared for editing.'));
    image.src = url;
  });
}

const ASPECTS: Record<string, number | undefined> = {
  original: undefined,
  '1:1': 1,
  '4:5': 4 / 5,
  '9:16': 9 / 16,
  '16:9': 16 / 9,
};

export async function renderSocialImage(baseUrl: string, state: SocialEditState): Promise<File> {
  const source = await loadImage(baseUrl);
  const requested = ASPECTS[state.aspectRatio];
  let sourceX = 0; let sourceY = 0; let sourceWidth = source.naturalWidth; let sourceHeight = source.naturalHeight;
  if (requested) {
    const current = sourceWidth / sourceHeight;
    if (current > requested) { sourceWidth = sourceHeight * requested; sourceX = (source.naturalWidth - sourceWidth) / 2; }
    else { sourceHeight = sourceWidth / requested; sourceY = (source.naturalHeight - sourceHeight) / 2; }
  }
  const width = Math.min(1440, Math.max(720, Math.round(sourceWidth)));
  const height = Math.round(width / (sourceWidth / sourceHeight));
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image editing is unavailable in this browser.');
  context.filter = socialFilter(state.adjustments);
  context.drawImage(source, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
  context.filter = 'none';

  if (state.adjustments.tiltShift > 0) {
    const copy = document.createElement('canvas'); copy.width = width; copy.height = height;
    copy.getContext('2d')?.drawImage(canvas, 0, 0);
    const band = Math.max(.12, .34 - state.adjustments.tiltShift / 500);
    context.save();
    context.beginPath(); context.rect(0, 0, width, height * band); context.rect(0, height * (1 - band), width, height * band); context.clip();
    context.filter = `blur(${Math.max(1, state.adjustments.tiltShift / 12)}px)`; context.drawImage(copy, 0, 0); context.restore(); context.filter = 'none';
  }

  if (state.adjustments.vignette > 0) {
    const gradient = context.createRadialGradient(width / 2, height / 2, width * .15, width / 2, height / 2, width * .72);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${Math.min(.75, state.adjustments.vignette / 130)})`);
    context.fillStyle = gradient; context.fillRect(0, 0, width, height);
  }
  if (state.drawingDataUrl) {
    const drawing = await loadImage(state.drawingDataUrl); context.drawImage(drawing, 0, 0, width, height);
  }
  for (const overlay of state.overlays) {
    context.save(); context.translate(width * overlay.x / 100, height * overlay.y / 100);
    context.rotate(overlay.rotation * Math.PI / 180); context.scale(overlay.scale, overlay.scale);
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.font = `${overlay.type === 'sticker' ? 72 : 54}px Inter, Arial, sans-serif`;
    context.fillStyle = overlay.color || '#ffffff'; context.shadowColor = 'rgba(0,0,0,.65)'; context.shadowBlur = 8;
    context.fillText(overlay.content, 0, 0); context.restore();
  }
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', .9));
  if (!blob) throw new Error('The edited image could not be exported.');
  return new File([blob], `musicinsta-edit-${Date.now()}.jpg`, { type: 'image/jpeg' });
}
