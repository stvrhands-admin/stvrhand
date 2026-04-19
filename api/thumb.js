export default async function handler(req, res) {
  // Only GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url || !url.includes('instagram.com')) {
    return res.status(400).json({ error: 'Valid Instagram URL required' });
  }

  // Strip tracking params — only need the reel path
  const cleanUrl = url.split('?')[0].replace(/\/$/, '') + '/';

  try {
    const oembedEndpoint = new URL('https://www.instagram.com/oembed/');
    oembedEndpoint.searchParams.set('url', cleanUrl);
    oembedEndpoint.searchParams.set('omitscript', '1');

    const igRes = await fetch(oembedEndpoint.toString(), {
      headers: {
        // Mimic a real browser so Instagram returns the full oEmbed payload
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.stvrhands.com/',
      },
    });

    if (!igRes.ok) {
      return res.status(igRes.status).json({ error: 'Instagram did not return thumbnail' });
    }

    const data = await igRes.json();

    if (!data.thumbnail_url) {
      return res.status(404).json({ error: 'No thumbnail in oEmbed response' });
    }

    // Cache aggressively — thumbnails never change for a given reel
    res.setHeader('Cache-Control', 's-maxage=604800, stale-while-revalidate=86400');
    res.setHeader('Access-Control-Allow-Origin', 'https://www.stvrhands.com');

    return res.status(200).json({
      thumbnail: data.thumbnail_url,
      author: data.author_name,
    });
  } catch (err) {
    console.error('[thumb] error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}
