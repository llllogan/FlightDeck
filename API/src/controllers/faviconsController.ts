import type { Request, Response } from 'express';

const FALLBACK_STATUS = 404;
const CACHE_CONTROL = 'public, max-age=86400';

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
      res.status(upstreamResponse.status === FALLBACK_STATUS ? 404 : 502).end();
      return;
    }

    const contentType = upstreamResponse.headers.get('content-type') ?? 'image/x-icon';
    const arrayBuffer = await upstreamResponse.arrayBuffer();

    res.set('Content-Type', contentType);
    res.set('Cache-Control', CACHE_CONTROL);
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Failed to proxy favicon', error);
    res.status(502).json({ error: 'Failed to retrieve favicon.' });
  }
}
