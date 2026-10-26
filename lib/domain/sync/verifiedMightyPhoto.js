/** Verify a changed Mighty CDN photo before replacing a working map image. */
async function verifiedMightyPhoto(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !/^media\d+-production-mightynetworks\.imgix\.net$/.test(parsed.hostname)) return false;
    const response = await fetch(url, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(5000) });
    return response.ok && (response.headers.get('content-type') || '').startsWith('image/');
  } catch { return false; }
}
module.exports = { verifiedMightyPhoto };
