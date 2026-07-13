import type { Request, Response } from 'express';

const FALLBACK_STATUS = 404;
const CACHE_CONTROL = 'public, max-age=86400';

function sanitizeFallbackLabel(value: unknown): string {
  if (typeof value !== 'string') {
    return '•';
  }

  const trimmed = value.trim().toUpperCase();
  const condensed = trimmed.replace(/[^A-Z0-9]/g, '');
  if (!condensed) {
    return '•';
  }

  return condensed.slice(0, 2);
}

function sendPlaceholderFavicon(res: Response, label: string): void {
  const sanitized = sanitizeFallbackLabel(label);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#1e293b" />
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="'Inter', system-ui, sans-serif" font-weight="600" font-size="26" fill="#e2e8f0">${sanitized}</text>
</svg>`;

  res.set('Content-Type', 'image/svg+xml');
  res.set('Cache-Control', CACHE_CONTROL);
  res.send(svg);
}

function buildGoogleFaviconUrl(targetUrl: string): string | null {
  try {
    const parsed = new URL(targetUrl);
    const domain = parsed.hostname;
    return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(
      `${parsed.protocol}//${parsed.host}`,
    )}&size=64&domain=${encodeURIComponent(domain)}`;
  } catch {
    return null;
  }
}

export async function fetchFavicon(req: Request, res: Response): Promise<void> {
  const { url } = req.query;
  const fallbackRaw = Array.isArray(req.query.fallback) ? req.query.fallback[0] : req.query.fallback;
  const fallbackParam = typeof fallbackRaw === 'string' ? fallbackRaw : undefined;

  if (typeof url !== 'string' || !url.trim()) {
    res.status(400).json({ error: 'Query parameter "url" is required.' });
    return;
  }

  const upstreamUrl = buildGoogleFaviconUrl(url);

  if (!upstreamUrl) {
    res.status(400).json({ error: 'Invalid url parameter.' });
    return;
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      redirect: 'follow',
    });

    if (!upstreamResponse.ok) {
      if (upstreamResponse.status !== FALLBACK_STATUS) {
        console.warn(
          `Upstream favicon request failed with status ${upstreamResponse.status} for ${upstreamUrl}`,
        );
      }
      sendPlaceholderFavicon(res, fallbackParam ?? '');
      return;
    }

    const contentType = upstreamResponse.headers.get('content-type') ?? 'image/x-icon';
    const arrayBuffer = await upstreamResponse.arrayBuffer();

    res.set('Content-Type', contentType);
    res.set('Cache-Control', CACHE_CONTROL);
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Failed to proxy favicon', error);
    sendPlaceholderFavicon(res, fallbackParam ?? '');
  }
}
