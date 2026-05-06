const axios = require('axios');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const ytDlp = require('yt-dlp-exec');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const StreamCache = require('../models/StreamCache');
const aiService = require('../services/aiService');
const User = require('../models/User');

const getLocalMusicUrl = (title) => {
  const musicDir = path.join(__dirname, '../music');
  const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`;
  const filePath = path.join(musicDir, filename);
  if (fs.existsSync(filePath)) {
    return `http://localhost:5000/music/${filename}`;
  }
  return null;
};

const getFallbackUrl = () => {
  return `http://localhost:5000/music/default.mp3`;
};

const searchMusic = async (req, res) => {
  const { q, lang } = req.query; 
  const country = getCountryCode(lang);
  const isDbConnected = mongoose.connection.readyState === 1;

  try {
    const searchTerm = lang ? `${lang} ${q}` : q;
    const response = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&limit=30&media=music&country=${country}`);
    
    const normalizedData = response.data.results.map(item => ({
      id: item.trackId,
      title: item.trackName,
      preview: item.previewUrl,
      artist: { name: item.artistName },
      language: lang || 'English',
      album: { 
        cover_medium: item.artworkUrl100.replace('100x100bb', '600x600bb'), 
        title: item.collectionName 
      }
    }));

    let verifiedData = normalizedData;
    if (lang && normalizedData.length > 0) {
      verifiedData = await aiService.verifyLanguage(normalizedData, lang);
    }

    const finalData = await Promise.all(verifiedData.map(async (s, index) => {
      let audio_url = getLocalMusicUrl(s.title);
      if (!audio_url && isDbConnected) {
        const cached = await StreamCache.findOne({ query: `${s.artist.name} - ${s.title}`.toLowerCase() });
        if (cached) audio_url = cached.url;
      }
      return {
        ...s,
        preview: s.preview || getFallbackUrl(),
        audio_url,
        language: s.language || lang || 'English',
        isPremium: (index % 5 === 0) // Index-based: Every 5th item in search results
      };
    }));

    res.json({ data: finalData });
  } catch (error) {
    console.error('Error fetching from iTunes:', error.message);
    res.status(500).json({ message: 'Error searching music' });
  }
};

const getCountryCode = (lang) => {
  if (!lang) return 'US';
  const lowerLang = lang.toLowerCase();
  const map = {
    'hindi': 'IN', 'tamil': 'IN', 'telugu': 'IN', 'punjabi': 'IN', 'malayalam': 'IN', 'kannada': 'IN',
    'korean': 'KR', 'japanese': 'JP', 'spanish': 'US', 'english': 'US', 'french': 'FR', 'german': 'DE'
  };
  return map[lowerLang] || 'US';
};

const getGenreMusic = async (req, res) => {
  const { genre } = req.params; 
  const { lang } = req.query;
  const normalizedLang = lang ? lang.toLowerCase() : 'english';
  let country = getCountryCode(normalizedLang);
  let query = '';

  switch (genre.toLowerCase()) {
    case 'bollywood': 
      if (normalizedLang === 'hindi') query = 'latest bollywood hits 2024';
      else if (normalizedLang === 'tamil') query = 'latest tamil hits kollywood';
      else if (normalizedLang === 'telugu') query = 'latest telugu hits tollywood';
      else if (normalizedLang === 'punjabi') query = 'latest punjabi bhangra hits';
      else if (normalizedLang === 'english') query = 'latest international pop hits';
      else if (normalizedLang === 'spanish') query = 'latest latin hits 2024';
      else if (normalizedLang === 'korean') query = 'k-pop top beats';
      else query = `${lang} top hits`;
      break;
    case 'korean': query = 'k-pop top beats'; country = 'KR'; break;
    case 'japanese': query = 'j-pop top beats'; country = 'JP'; break;
    case 'hollywood': query = 'US Top Hits 2024'; country = 'US'; break;
    default: query = `${lang || ''} ${genre}`;
  }

  try {
    const finalQuery = lang ? `${lang} ${query}` : query;
    const response = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(finalQuery)}&limit=30&media=music&country=${country}`);
    const isDbConnected = mongoose.connection.readyState === 1;

    const normalizedData = response.data.results.map(item => ({
      id: item.trackId,
      title: item.trackName,
      preview: item.previewUrl,
      artist: { name: item.artistName },
      language: lang || 'English',
      album: { 
        cover_medium: item.artworkUrl100.replace('100x100bb', '600x600bb'), 
        title: item.collectionName 
      }
    }));

    let verifiedData = normalizedData;
    if (lang && normalizedData.length > 0) {
      verifiedData = await aiService.verifyLanguage(normalizedData, lang);
    }

    const finalData = await Promise.all(verifiedData.map(async (s, index) => {
      let audio_url = getLocalMusicUrl(s.title);
      if (!audio_url && isDbConnected) {
        const cached = await StreamCache.findOne({ query: `${s.artist.name} - ${s.title}`.toLowerCase() });
        if (cached) audio_url = cached.url;
      }
      return {
        ...s,
        preview: s.preview || getFallbackUrl(),
        audio_url,
        language: s.language || lang || 'English',
        isPremium: (index % 6 === 0) // Index-based: Every 6th item in genre results
      };
    }));
    
    res.json({ data: finalData });
  } catch (error) {
    console.error('Error fetching genre:', error.message);
    res.status(500).json({ message: 'Error fetching genre data' });
  }
};

const resolveStreamUrl = async (req, res) => {
  const { artist, title } = req.query;
  if (!artist || !title) return res.status(400).json({ message: 'Artist and title are required' });

  const query = `${artist} - ${title}`.toLowerCase();
  const isDbConnected = mongoose.connection.readyState === 1;

  try {
    if (isDbConnected) {
      const cachedStream = await StreamCache.findOne({ query });
      if (cachedStream) return res.json({ url: cachedStream.url, title: cachedStream.title, duration: cachedStream.duration });
    }

    console.log(`[Resolve] Attempting to resolve: ${artist} - ${title}`);
    
    // Fallback: If yt-dlp is not available or fails, return 404 gracefully so frontend can use preview
    try {
      const result = await ytDlp(`ytsearch1:${artist} ${title} official audio`, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        format: 'ba/best',
      });

      if (result && result.entries?.[0]) {
        const entry = result.entries[0];
        if (isDbConnected) {
          await StreamCache.create({ query, url: entry.url, title: entry.title, duration: entry.duration });
        }
        return res.json({ url: entry.url, title: entry.title, duration: entry.duration });
      }
    } catch (e) {
      console.warn(`[Resolve] yt-dlp failed or missing: ${e.message}`);
    }

    res.status(404).json({ message: 'Audio stream not available' });
  } catch (error) {
    res.status(500).json({ message: 'Error resolving stream' });
  }
};

const getCartoonEpisodes = async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ message: 'Query is required' });

  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    if (isDbConnected) {
      const cached = await StreamCache.findOne({ query: `cartoon:${query}`.toLowerCase() });
      if (cached?.episodesData) return res.json({ data: JSON.parse(cached.episodesData) });
    }

    const result = await ytDlp(`ytsearch100:${query} official episodes`, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      flatPlaylist: true,
    });

    if (result?.entries) {
      const episodes = result.entries.map(e => ({
        id: e.id, title: e.title,
        thumbnail: e.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`,
        duration: e.duration
      }));
      if (isDbConnected && episodes.length > 0) {
        await StreamCache.findOneAndUpdate(
          { query: `cartoon:${query}`.toLowerCase() },
          { episodesData: JSON.stringify(episodes), updatedAt: new Date() },
          { upsert: true }
        );
      }
      return res.json({ data: episodes });
    }
    res.json({ data: [] });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching episodes' });
  }
};

const getTrending = async (req, res) => {
  const { lang } = req.query;
  const country = getCountryCode(lang);
  const isDbConnected = mongoose.connection.readyState === 1;

  try {
    const searchTerm = lang ? `${lang} top hits 2024` : 'global top hits 2024';
    const response = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&limit=20&media=music&country=${country}`);
    
    const normalizedData = response.data.results.map(item => ({
      id: item.trackId, title: item.trackName, preview: item.previewUrl, artist: { name: item.artistName },
      language: lang || 'English', album: { cover_medium: item.artworkUrl100.replace('100x100bb', '600x600bb'), title: item.collectionName },
    }));

    const finalData = await Promise.all(normalizedData.map(async (s, index) => {
      let audio_url = getLocalMusicUrl(s.title);
      if (!audio_url && isDbConnected) {
        const cached = await StreamCache.findOne({ query: `${s.artist.name} - ${s.title}`.toLowerCase() });
        if (cached) audio_url = cached.url;
      }
      return { ...s, audio_url, isPremium: (index % 4 === 0) }; // Every 4th item in trending
    }));

    res.json({ data: finalData });
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

const getFreshArrivals = async (req, res) => {
  const { lang } = req.query;
  const country = getCountryCode(lang);
  const isDbConnected = mongoose.connection.readyState === 1;

  try {
    const searchTerm = lang ? `latest ${lang} releases 2024` : 'new music 2024';
    const response = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&limit=20&media=music&country=${country}&sort=recent`);
    
    const normalizedData = response.data.results.map(item => ({
      id: item.trackId, title: item.trackName, preview: item.previewUrl, artist: { name: item.artistName },
      language: lang || 'English', album: { cover_medium: item.artworkUrl100.replace('100x100bb', '600x600bb'), title: item.collectionName },
    }));

    const finalData = await Promise.all(normalizedData.map(async (s, index) => {
      let audio_url = getLocalMusicUrl(s.title);
      if (!audio_url && isDbConnected) {
        const cached = await StreamCache.findOne({ query: `${s.artist.name} - ${s.title}`.toLowerCase() });
        if (cached) audio_url = cached.url;
      }
      return { ...s, audio_url, isPremium: (index % 4 === 0) }; // Every 4th item in fresh arrivals
    }));

    res.json({ data: finalData });
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

const addToRecentlyPlayed = async (req, res) => {
  const { track } = req.body;
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.recentlyPlayed = [track, ...user.recentlyPlayed.filter(t => t.id !== track.id)].slice(0, 20);
    await user.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

const getRecentlyPlayed = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({ data: user?.recentlyPlayed || [] });
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

const proxyAudio = async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('URL is required');

  console.log(`[Proxy] Routing stream: ${url.substring(0, 60)}...`);

  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Range': req.headers.range || 'bytes=0-'
      }
    });

    res.writeHead(response.status, {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': response.headers['content-type'] || 'audio/mpeg',
      'Content-Length': response.headers['content-length'],
      'Content-Range': response.headers['content-range'],
      'Accept-Ranges': 'bytes',
    });

    response.data.pipe(res);
  } catch (error) {
    console.error('[Proxy Error]', error.message);
    if (!res.headersSent) {
      res.status(error.response?.status || 500).send('Proxy error');
    }
  }
};

module.exports = { 
  searchMusic, getGenreMusic, resolveStreamUrl, getCartoonEpisodes,
  getTrending, getFreshArrivals, addToRecentlyPlayed, getRecentlyPlayed,
  proxyAudio
};
