import type { FanCardConfig } from '../types';

const GREEN = '#39E477';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // required so the canvas is not tainted; host must send CORS headers
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image failed to load'));
    img.src = src;
  });
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, startPx: number, weight: string, family: string): number {
  let px = startPx;
  while (px > 24) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    px -= 2;
  }
  return px;
}

export class CanvasFanCardGenerator {
  /** Renders a PNG data URL. Wording is truthful: "I'VE VOTED" only when hasVerifiedVote is true. */
  static async generateCard(c: FanCardConfig): Promise<string> {
    const vertical = c.format === 'vertical';
    const W = 1080;
    const H = vertical ? 1920 : 1080;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported in this browser.');

    // Wait for webfonts so text metrics are right (falls back silently).
    try {
      await document.fonts?.load('800 40px "Space Grotesk"');
      await document.fonts?.load('500 20px "Inter"');
    } catch { /* ignore */ }
    const DISPLAY = '"Space Grotesk", system-ui, sans-serif';
    const BODY = '"Inter", system-ui, sans-serif';

    // Background
    ctx.fillStyle = '#080A09';
    ctx.fillRect(0, 0, W, H);
    const bg = ctx.createRadialGradient(W / 2, H * 0.3, 80, W / 2, H / 2, H * 0.8);
    bg.addColorStop(0, '#16201a');
    bg.addColorStop(1, '#050706');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Frame (kept inside safe margins for platform cropping)
    const m = 56;
    ctx.strokeStyle = '#29312B';
    ctx.lineWidth = 3;
    ctx.strokeRect(m, m, W - 2 * m, H - 2 * m);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Brand
    const topY = vertical ? 150 : 120;
    ctx.font = `800 34px ${DISPLAY}`;
    ctx.fillStyle = '#F6F8F6';
    ctx.fillText('GOAT', W / 2 - 52, topY);
    ctx.fillStyle = GREEN;
    ctx.fillText('WARS', W / 2 + 62, topY);
    ctx.font = `600 22px ${BODY}`;
    ctx.fillStyle = '#A4AEA7';
    ctx.fillText(c.debateTitle.toUpperCase().slice(0, 48), W / 2, topY + 46);

    // Portrait (circle)
    const size = vertical ? 600 : 400;
    const cy = topY + 110 + size / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, cy, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#111512';
    ctx.fillRect(W / 2 - size / 2, cy - size / 2, size, size);
    let drewPhoto = false;
    if (c.candidateImageUrl) {
      try {
        const img = await loadImage(c.candidateImageUrl);
        const s = Math.min(img.width, img.height);
        // bias the crop toward the top so faces are kept
        const sx = (img.width - s) / 2;
        const sy = Math.max(0, (img.height - s) * 0.15);
        ctx.drawImage(img, sx, sy, s, s, W / 2 - size / 2, cy - size / 2, size, size);
        drewPhoto = true;
      } catch {
        /* blocked by CORS or missing: monogram below */
      }
    }
    if (!drewPhoto) {
      ctx.fillStyle = '#1A231C';
      ctx.fillRect(W / 2 - size / 2, cy - size / 2, size, size);
      ctx.fillStyle = GREEN;
      ctx.font = `800 ${Math.round(size / 3)}px ${DISPLAY}`;
      const ini = c.candidateName.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
      ctx.fillText(ini, W / 2, cy);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(W / 2, cy, size / 2, 0, Math.PI * 2);
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 8;
    ctx.stroke();

    // Truthful wording
    const textY = cy + size / 2 + (vertical ? 100 : 62);
    ctx.font = `700 26px ${DISPLAY}`;
    ctx.fillStyle = c.hasVerifiedVote ? GREEN : '#A4AEA7';
    ctx.fillText(c.hasVerifiedVote ? '✓ VERIFIED VOTE' : 'MY PICK IS', W / 2, textY);

    const namePx = fitText(ctx, c.candidateName.toUpperCase(), W - 2 * m - 80, vertical ? 76 : 58, '800', DISPLAY);
    ctx.fillStyle = '#F6F8F6';
    ctx.fillText(c.candidateName.toUpperCase(), W / 2, textY + 62);

    ctx.font = `500 26px ${BODY}`;
    ctx.fillStyle = '#A4AEA7';
    ctx.fillText(c.candidateSubtitle.slice(0, 60), W / 2, textY + 62 + namePx / 2 + 34);

    // Slogan box
    const boxY = textY + 62 + namePx / 2 + 74;
    const boxH = vertical ? 190 : 130;
    ctx.fillStyle = '#111512';
    ctx.fillRect(110, boxY, W - 220, boxH);
    ctx.strokeStyle = '#29312B';
    ctx.lineWidth = 2;
    ctx.strokeRect(110, boxY, W - 220, boxH);
    ctx.fillStyle = GREEN;
    const line1 = c.hasVerifiedVote ? "I'VE VOTED FOR MY GOAT." : "I'M BACKING MY GOAT.";
    const line2 = c.hasVerifiedVote ? 'VOTE FOR YOURS!' : 'YOUR GOAT. YOUR VOTE.';
    ctx.font = `800 ${vertical ? 44 : 34}px ${DISPLAY}`;
    ctx.fillText(line1, W / 2, boxY + boxH * 0.36);
    ctx.fillStyle = '#F6F8F6';
    ctx.fillText(line2, W / 2, boxY + boxH * 0.68);

    // Footer (configured public host only; never an invented domain)
    ctx.font = `700 26px ${DISPLAY}`;
    ctx.fillStyle = '#F6F8F6';
    ctx.fillText(c.siteHost.toUpperCase(), W / 2, H - m - 60);
    ctx.font = `400 17px ${BODY}`;
    ctx.fillStyle = '#6f7a72';
    ctx.fillText('Independent fan poll · not affiliated with players, clubs or leagues', W / 2, H - m - 24);

    return canvas.toDataURL('image/png');
  }

  static downloadImage(dataUrl: string, filename: string): void {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
