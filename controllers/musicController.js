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


module.exports = { searchMusic, getGenreMusic, resolveStreamUrl };


