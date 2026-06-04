export const PHOTO_SCALE = 1.35;
export const FONT_SIZE = { small: 0.030, medium: 0.044, large: 0.062 };

export async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // blob: and data: URLs are same-origin; crossOrigin would break them on some WebKit builds
    if (!src.startsWith('blob:') && !src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function buildFinalCanvas(templateSrc, photoBlobUrl, photoOffset, circle, text, textPosPct, textSizeKey) {
  const [template, photo] = await Promise.all([loadImage(templateSrc), loadImage(photoBlobUrl)]);

  const W = template.naturalWidth;
  const H = template.naturalHeight;
  const cx = W * circle.cx;
  const cy = H * circle.cy;
  const r  = W * circle.r;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Draw user photo clipped to circle
  const drawSize = r * 2 * PHOTO_SCALE;
  const drawCX   = cx + (photoOffset.x / 100) * (r * 2);
  const drawCY   = cy + (photoOffset.y / 100) * (r * 2);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(photo, drawCX - drawSize / 2, drawCY - drawSize / 2, drawSize, drawSize);
  ctx.restore();

  // Template with circle punched out so photo shows through
  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = H;
  const tCtx = tmp.getContext('2d');
  tCtx.drawImage(template, 0, 0);
  tCtx.globalCompositeOperation = 'destination-out';
  tCtx.beginPath();
  tCtx.arc(cx, cy, r, 0, Math.PI * 2);
  tCtx.fill();
  ctx.drawImage(tmp, 0, 0);

  // Text overlay
  if (text.trim()) {
    const fs = Math.round(W * (FONT_SIZE[textSizeKey] ?? FONT_SIZE.medium));
    ctx.font = `bold ${fs}px 'Segoe UI', Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#FFD700';
    ctx.fillText(text, (textPosPct.x / 100) * W, (textPosPct.y / 100) * H);
    ctx.shadowBlur = 0;
  }

  return canvas;
}

// Saves to iOS Photos via the share sheet (iOS 15+), or triggers a download on desktop/Android.
export async function downloadPhoto(canvas, filename = 'bk-awards-2026.jpg') {
  const blob = await new Promise((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/jpeg', 0.95)
  );

  if (navigator.canShare) {
    const file = new File([blob], filename, { type: 'image/jpeg' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // user dismissed share sheet
      }
    }
  }

  // Fallback: <a download> — works on desktop and Android
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
