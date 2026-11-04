import dns from 'dns/promises';
import ipaddr from 'ipaddr.js';

// Simple in-memory cache with 24-hour TTL
const previewCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Validates whether a hostname resolves to a public, non-private IP
 * Enforces strict SSRF protection against private LAN and cloud metadata services
 */
async function isSafeUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname === '169.254.169.254'
    ) {
      return false;
    }

    // Resolve DNS to verify IP
    const addresses = await dns.lookup(hostname, { all: true });
    for (const record of addresses) {
      const addr = ipaddr.parse(record.address);
      const range = addr.range();

      // Block all non-unicast/private ranges
      if (
        range === 'loopback' ||
        range === 'private' ||
        range === 'linkLocal' ||
        range === 'broadcast' ||
        range === 'carrierGradeNat' ||
        range === 'reserved'
      ) {
        return false;
      }
    }

    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Fetch and extract OpenGraph/Twitter card metadata from a URL
 */
export async function getLinkPreview(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  const trimmed = rawUrl.trim();
  const cached = previewCache.get(trimmed);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const safe = await isSafeUrl(trimmed);
  if (!safe) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(trimmed, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ConnectX/1.0 LinkPreviewBot',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    clearTimeout(timeout);

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return null;
    }

    // Read only up to 512KB to avoid excessive memory consumption
    const reader = response.body.getReader();
    let html = '';
    let totalBytes = 0;
    const MAX_BYTES = 512 * 1024;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.length;
      html += new TextDecoder('utf-8').decode(value, { stream: true });
      if (totalBytes >= MAX_BYTES) {
        controller.abort();
        break;
      }
    }

    const titleMatch =
      html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i);

    const descMatch =
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);

    const imageMatch =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);

    const siteMatch =
      html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);

    const urlObj = new URL(trimmed);

    let imageUrl = imageMatch ? imageMatch[1] : '';
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = new URL(imageUrl, urlObj.origin).toString();
    }

    const preview = {
      url: trimmed,
      title: titleMatch ? titleMatch[1].trim() : urlObj.hostname,
      description: descMatch ? descMatch[1].trim() : '',
      image: imageUrl,
      siteName: siteMatch ? siteMatch[1].trim() : urlObj.hostname,
    };

    previewCache.set(trimmed, { timestamp: Date.now(), data: preview });
    return preview;
  } catch (err) {
    return null;
  }
}

export default {
  getLinkPreview,
};
