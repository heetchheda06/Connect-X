import { env } from '../config/env.js';

// Curated fallback reaction GIFs when GIPHY_API_KEY is not supplied
const CURATED_GIFS = [
  {
    id: 'gif_thumbs_up',
    title: 'Thumbs Up',
    url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/111ebonMs90YLu/200.gif',
    width: 300,
    height: 200,
  },
  {
    id: 'gif_celebrate',
    title: 'Celebrate',
    url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/200.gif',
    width: 300,
    height: 200,
  },
  {
    id: 'gif_laugh',
    title: 'Laughing',
    url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/10JhviFuU2gWD6/200.gif',
    width: 300,
    height: 200,
  },
  {
    id: 'gif_wave',
    title: 'Hello Wave',
    url: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/200.gif',
    width: 300,
    height: 200,
  },
  {
    id: 'gif_heart',
    title: 'Heart Love',
    url: 'https://media.giphy.com/media/26BRv0ThflsDTqUXa/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/26BRv0ThflsDTqUXa/200.gif',
    width: 300,
    height: 200,
  },
  {
    id: 'gif_mindblown',
    title: 'Mind Blown',
    url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/200.gif',
    width: 300,
    height: 200,
  },
  {
    id: 'gif_yes',
    title: 'Yes Absolutely',
    url: 'https://media.giphy.com/media/nXxOjZrbnbRxS/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/nXxOjZrbnbRxS/200.gif',
    width: 300,
    height: 200,
  },
  {
    id: 'gif_applause',
    title: 'Applause',
    url: 'https://media.giphy.com/media/nbvFVPiEiJH6Q/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/nbvFVPiEiJH6Q/200.gif',
    width: 300,
    height: 200,
  },
  {
    id: 'gif_dance',
    title: 'Happy Dance',
    url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/blSTtZehjAZ8I/200.gif',
    width: 300,
    height: 200,
  },
];

/**
 * Fetch trending GIFs from GIPHY API or fallback
 */
export async function getTrendingGifs(limit = 20, offset = 0) {
  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    const start = Math.max(0, parseInt(offset, 10) || 0);
    const end = start + (parseInt(limit, 10) || 20);
    return CURATED_GIFS.slice(start, end);
  }

  try {
    const url = `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=${limit}&offset=${offset}&rating=g`;
    const res = await fetch(url);
    const json = await res.json();
    return (json.data || []).map(formatGiphyItem);
  } catch (err) {
    return CURATED_GIFS.slice(0, limit);
  }
}

/**
 * Search GIFs by query from GIPHY API or fallback
 */
export async function searchGifs(query, limit = 20, offset = 0) {
  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey || !query) {
    const filtered = query
      ? CURATED_GIFS.filter((g) => g.title.toLowerCase().includes(query.toLowerCase()))
      : CURATED_GIFS;
    return filtered.slice(0, limit);
  }

  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(
      query
    )}&limit=${limit}&offset=${offset}&rating=g`;
    const res = await fetch(url);
    const json = await res.json();
    return (json.data || []).map(formatGiphyItem);
  } catch (err) {
    return CURATED_GIFS.slice(0, limit);
  }
}

function formatGiphyItem(item) {
  return {
    id: item.id,
    title: item.title || 'GIF',
    url: item.images?.original?.url || item.images?.downsized?.url,
    previewUrl: item.images?.fixed_height?.url || item.images?.downsized?.url,
    width: parseInt(item.images?.original?.width, 10) || 300,
    height: parseInt(item.images?.original?.height, 10) || 200,
  };
}

export default {
  getTrendingGifs,
  searchGifs,
};

