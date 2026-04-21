const axios = require('axios');
const mongoose = require('mongoose');
const ytDlp = require('yt-dlp-exec');
const StreamCache = require('../models/StreamCache');


const searchMusic = async (req, res) => {
  const { q } = req.query; 
  try {
    const response = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&limit=20&media=music`);
    
    const normalizedData = response.data.results.map(item => ({
      id: item.trackId,
      title: item.trackName,
      preview: item.previewUrl,
      artist: { name: item.artistName },
      album: { 
        cover_medium: item.artworkUrl100.replace('100x100bb', '600x600bb'), 
        title: item.collectionName 
      }
    }));

    res.json({ data: normalizedData });
  } catch (error) {
    console.error('Error fetching from iTunes:', error.message);
    res.status(500).json({ message: 'Error searching music' });
  }
};

const getGenreMusic = async (req, res) => {
  const { genre } = req.params; 
  let query = '';
  let country = 'US';

  switch (genre.toLowerCase()) {
    case 'bollywood': 
      query = 'latest bollywood 2024'; 
      country = 'IN'; 
      break;
    case 'korean': 
      query = 'k-pop top beats'; 
      country = 'KR'; 
      break;
    case 'japanese': 
      query = 'j-pop top beats'; 
      country = 'JP'; 
      break;
    case 'hollywood': 
      query = 'US Top Hits 2024'; 
      country = 'US'; 
      break;
    default: 
      query = genre;
      country = 'US';
  }

  try {
    const response = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=20&media=music&country=${country}`);
    
    const normalizedData = response.data.results.map(item => ({
      id: item.trackId,
      title: item.trackName,
      preview: item.previewUrl,
      artist: { name: item.artistName },
      album: { 
        cover_medium: item.artworkUrl100.replace('100x100bb', '600x600bb'), 
        title: item.collectionName 
      }
    }));

    console.log(`Fetched ${normalizedData.length} latest ${genre} tracks from iTunes`);
    res.json({ data: normalizedData });
  } catch (error) {
    console.error('Error fetching genre:', error.message);
    res.status(500).json({ message: 'Error fetching genre data' });
  }
};

const resolveStreamUrl = async (req, res) => {
  const { artist, title } = req.query;
  
  if (!artist || !title) {
    return res.status(400).json({ message: 'Artist and title are required' });
  }

  const query = `${artist} - ${title}`.toLowerCase();
  const isDbConnected = mongoose.connection.readyState === 1;

  try {
    // 1. Check Cache (only if DB is connected)
    if (isDbConnected) {
      try {
        const cachedStream = await StreamCache.findOne({ query });
        if (cachedStream) {
          console.log(`Cache Hit for: ${query}`);
          return res.json({ 
            url: cachedStream.url,
            title: cachedStream.title,
            thumbnail: cachedStream.thumbnail,
            duration: cachedStream.duration,
            cached: true
          });
        }
      } catch (cacheError) {
        console.error('Cache Lookup Error:', cacheError.message);
      }
    }

    // 2. Resolve via yt-dlp
    console.log(`Cache Miss. Resolving stream for: ${query}`);
    const searchQueries = [
      `${artist} - ${title} (Official Audio)`,
      `${artist} ${title} lyrics`,
      `${artist} ${title}`
    ];

    const result = await ytDlp(`ytsearch1:${searchQueries[0]}`, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ],
      format: 'bestaudio/best',
      extractAudio: true,
    });

    if (result && result.entries && result.entries.length > 0) {
      const bestAudio = result.entries[0];
      const streamUrl = bestAudio.url;

      if (streamUrl) {
        // 3. Save to Cache (only if DB is connected)
        if (isDbConnected) {
          try {
            await StreamCache.create({
              query,
              url: streamUrl,
              title: bestAudio.title,
              thumbnail: bestAudio.thumbnail,
              duration: bestAudio.duration
            });
          } catch (cacheSaveError) {
            console.error('Cache Save Error:', cacheSaveError.message);
          }
        }

        return res.json({ 
          url: streamUrl,
          title: bestAudio.title,
          thumbnail: bestAudio.thumbnail,
          duration: bestAudio.duration,
          cached: false
        });
      }
    }

    res.status(404).json({ message: 'Could not resolve audio stream' });
  } catch (error) {
    console.error('Error resolving stream:', error.message);
    res.status(500).json({ message: 'Internal server error while resolving stream' });
  }
};

const getCartoonEpisodes = async (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ message: 'Query is required' });
  }

  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    
    // 1. Check Cache
    if (isDbConnected) {
      const cached = await StreamCache.findOne({ query: `cartoon:${query}`.toLowerCase() });
      if (cached && cached.episodesData) {
        console.log(`[CartoonAPI] Cache Hit for: ${query}`);
        return res.json({ data: JSON.parse(cached.episodesData) });
      }
    }

    console.log(`[CartoonAPI] Cache Miss. Fetching 100 episodes for: ${query}`);
    
    const result = await ytDlp(`ytsearch100:${query} official episodes`, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      flatPlaylist: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ],
    });

    if (result && result.entries) {
      const episodes = result.entries.map(e => ({
        id: e.id,
        title: e.title,
        thumbnail: e.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`,
        duration: e.duration,
        viewCount: e.view_count
      }));
      
      // 2. Save to Cache
      if (isDbConnected && episodes.length > 0) {
        try {
          await StreamCache.findOneAndUpdate(
            { query: `cartoon:${query}`.toLowerCase() },
            { 
              query: `cartoon:${query}`.toLowerCase(),
              episodesData: JSON.stringify(episodes),
              updatedAt: new Date()
            },
            { upsert: true }
          );
        } catch (cacheError) {
          console.error('Cache Save Error:', cacheError.message);
        }
      }
      
      return res.json({ data: episodes });
    }

    res.json({ data: [] });
  } catch (error) {
    console.error('Error fetching cartoon episodes:', error.message);
    res.status(500).json({ message: 'Error fetching episodes' });
  }
};

const getAnimeEpisodes = async (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ message: 'Query is required' });
  }

  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    const cacheKey = `anime-v3:${query}`.toLowerCase();
    
    if (isDbConnected) {
      const cached = await StreamCache.findOne({ query: cacheKey });
      if (cached && cached.episodesData) {
        const parsedData = JSON.parse(cached.episodesData);
        if (Array.isArray(parsedData) && parsedData.length > 9) {
          console.log(`[AnimeAPI] Cache Hit for: ${query}`);
          return res.json({ data: parsedData });
        }
      }
    }

    console.log(`[AnimeAPI] Fetching fresh metadata from AniList for: ${query}`);
    const anilistService = require('../services/anilistService');
    const anilistResults = await anilistService.searchAnime(query);
    
    if (!anilistResults || anilistResults.length === 0) {
      return res.status(404).json({ message: 'Anime not found on AniList' });
    }

    const anime = anilistResults[0]; 
    const { ANIME } = require('@consumet/extensions');
    const providers = [
      { name: 'AnimeKai', instance: new ANIME.AnimeKai() },
      { name: 'AnimeSaturn', instance: new ANIME.AnimeSaturn() }
    ];

    let searchRes = null;
    let successfulProvider = null;

    for (const p of providers) {
      try {
        const results = await p.instance.search(anime.title.romaji || anime.title.userPreferred);
        if (results.results && results.results.length > 0) {
          const bestMatch = results.results.find(r => 
            r.title.toLowerCase().includes('tv') || 
            !r.title.toLowerCase().includes('ova')
          ) || results.results[0];
          
          searchRes = { results: [bestMatch] };
          successfulProvider = p;
          break;
        }
      } catch (err) {
        console.warn(`[AnimeAPI] ${p.name} search failed:`, err.message);
      }
    }

    if (!searchRes || !successfulProvider) {
      return res.status(404).json({ message: 'No streaming mirrors found.' });
    }

    const animeId = searchRes.results[0].id;
    const info = await successfulProvider.instance.fetchAnimeInfo(animeId);
    
    if (!info.episodes || info.episodes.length === 0) {
        return res.json({ data: [] });
    }

    const eps = info.episodes.map(e => ({
      id: e.number,
      consumetId: e.id,
      title: e.title || `Episode ${e.number}`,
      number: e.number,
      isFiller: e.isFiller || false,
      provider: successfulProvider.name
    }));

    // Cache the verified episode list from a stable provider
    if (isDbConnected && eps.length > 0) {
      try {
        await StreamCache.findOneAndUpdate(
          { query: cacheKey },
          { 
            query: cacheKey,
            episodesData: JSON.stringify(eps),
            updatedAt: new Date(),
            metaData: JSON.stringify({
                id: anime.id,
                title: anime.title.userPreferred,
                description: anime.description,
                banner: anime.bannerImage,
                cover: anime.coverImage.extraLarge || anime.coverImage.large,
                rating: (anime.averageScore / 10).toFixed(1),
                year: anime.seasonYear
            })
          },
          { upsert: true }
        );
      } catch (cacheError) {
        console.error('Cache Save Error:', cacheError.message);
      }
    }
    
    return res.json({ data: eps, meta: {
        id: anime.id,
        title: anime.title.userPreferred,
        description: anime.description,
        banner: anime.bannerImage,
        cover: anime.coverImage.extraLarge || anime.coverImage.large,
        rating: (anime.averageScore / 10).toFixed(1),
        year: anime.seasonYear
    }});
  } catch (error) {
    console.error('Error in getAnimeEpisodes:', error.message);
    res.status(500).json({ message: 'Error fetching anime episodes' });
  }
};

const resolveAnimeStream = async (req, res) => {
  const { animeTitle, episodeNumber } = req.query;

  if (!animeTitle || !episodeNumber) {
    return res.status(400).json({ message: 'Anime title and episode number are required' });
  }

  const cacheKey = `anime-stream-v2:${animeTitle}:${episodeNumber}`.toLowerCase();
  const isDbConnected = mongoose.connection.readyState === 1;

  try {
    // 1. Check Cache
    if (isDbConnected) {
      const cached = await StreamCache.findOne({ query: cacheKey });
      if (cached && cached.url) {
        console.log(`[AnimeStream-v2] Cache Hit for: ${animeTitle} EP ${episodeNumber}`);
        return res.json({ 
          url: cached.url, 
          headers: cached.episodesData ? JSON.parse(cached.episodesData) : {},
          isM3U8: true 
        });
      }
    }

    console.log(`[AnimeStream-v2] Cache Miss. Resolving ${animeTitle} EP ${episodeNumber} via AnimeKai...`);

    const { ANIME } = require('@consumet/extensions');
    const animekai = new ANIME.AnimeKai();

    // 2. Search for the anime ID (again, to get the specific provider ID)
    const searchRes = await animekai.search(animeTitle);
    if (!searchRes.results || searchRes.results.length === 0) {
      throw new Error('Anime not found on provider during resolution');
    }

    const animeId = searchRes.results[0].id;

    // 3. Get episode list to find the specific episode ID
    const info = await animekai.fetchAnimeInfo(animeId);
    const episode = info.episodes.find(ep => ep.number === parseInt(episodeNumber));

    if (!episode) {
      throw new Error(`Episode ${episodeNumber} not found on provider`);
    }

    const episodeId = episode.id;

    // 4. Get Streaming Sources
    const streamRes = await animekai.fetchEpisodeSources(episodeId);
    
    // Pick the best source (priority: 'default' > '1080p' > '720p' > first)
    const source = streamRes.sources.find(s => s.quality === 'default' || s.quality === '1080p') || streamRes.sources[0];

    if (!source) {
      throw new Error('No streaming sources found on provider');
    }

    const streamData = {
      url: source.url,
      headers: streamRes.headers || {},
      isM3U8: source.isM3U8 || source.url.includes('.m3u8')
    };

    // 5. Save to Cache
    if (isDbConnected) {
      await StreamCache.findOneAndUpdate(
        { query: cacheKey },
        { 
          query: cacheKey,
          url: streamData.url,
          episodesData: JSON.stringify(streamData.headers),
          updatedAt: new Date()
        },
        { upsert: true }
      );
    }
    res.json(streamData);
  } catch (error) {
    console.error('Error resolving anime stream:', error.message);
    res.status(500).json({ message: 'Error resolving stream. Provider might be down.' });
  }
};

const proxyAnimeStream = async (req, res) => {
  const { url, referer } = req.query;

  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }

  try {
    const isM3U8 = url.includes('.m3u8');
    const https = require('https');
    const agent = new https.Agent({ rejectUnauthorized: false });

    // Forward common video headers from the browser to the provider
    const headers = {
      'Referer': referer || '',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
    if (req.headers.range) headers['Range'] = req.headers.range;

    // For HLS manifests, keep the recursive rewriting logic
    if (isM3U8) {
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'text',
        httpsAgent: agent,
        timeout: 30000,
        headers: headers
      });

      const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
      const lines = response.data.split('\n');
      const rewrittenLines = lines.map(line => {
        if (line.trim() === '' || line.startsWith('#')) return line;
        const absoluteUrl = line.startsWith('http') ? line : baseUrl + line;
        return `http://localhost:5000/api/music/proxy-anime?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer || '')}`;
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(rewrittenLines.join('\n'));
    }

    // For binary segments (.ts, .m4s), use streaming with range support
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      httpsAgent: agent,
      timeout: 30000,
      maxRedirects: 5,
      headers: headers,
      validateStatus: (status) => status < 400 // Allow 206 Partial Content
    });

    // Forward metadata headers back to the browser
    if (response.headers['content-type']) res.setHeader('Content-Type', response.headers['content-type']);
    if (response.headers['content-length']) res.setHeader('Content-Length', response.headers['content-length']);
    if (response.headers['content-range']) res.setHeader('Content-Range', response.headers['content-range']);
    if (response.headers['accept-ranges']) res.setHeader('Accept-Ranges', response.headers['accept-ranges']);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status);
    
    response.data.pipe(res);
  } catch (error) {
    if (error.code === 'ECONNRESET') return; // Ignore silent disconnects
    console.error(`[ProxyError] Failed to fetch ${url}:`, error.message);
    if (!res.headersSent) {
      res.status(error.response?.status || 500).json({ message: 'Error proxying stream', details: error.message });
    }
  }
};

module.exports = { searchMusic, getGenreMusic, resolveStreamUrl, getCartoonEpisodes, getAnimeEpisodes, resolveAnimeStream, proxyAnimeStream };


