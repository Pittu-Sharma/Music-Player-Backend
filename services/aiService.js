const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 
const moodMap = {
  happy: ["Upbeat Pop", "Dance Hits", "Feel Good Party", "Pharrell Williams Happy", "Can't Stop The Feeling"],
  sad: ["Acoustic Soul", "Lo-fi Chill", "Emotional Ballads", "Piano Melodies", "Slow Echoes"],
  heartbreak: ["Sad Songs", "Soft Romantic", "Ghazals", "Deep Loneliness", "Someone Like You"],
  motivated: ["Workout Mix", "High Energy Hip Hop", "Epic Cinematic", "Eye of the Tiger", "Believer"],
  romantic: ["Love Songs", "Acoustic Guitar", "Duets", "Perfect Ed Sheeran", "Romantic Hits"],
  chill: ["Ambient Lo-fi", "Nature Sounds", "Deep House Chill", "Morning Coffee Jazz", "Midnight Vibe"]
};

const getMoodRecommendations = async (mood) => {
  const normalizedMood = mood.toLowerCase();
  console.log('[AI Mood] Finding vibes for:', normalizedMood);

  try {
    const prompt = `Translate the mood "${mood}" into a single powerful musical search query for iTunes. 
    Focus on finding a mix of high-quality Bollywood hits and relevant Global pop/lo-fi.
    Example: "happy bollywood party hits", "sad emotional hindi songs", "motivational workout bollywood".
    
    Analyze the mood and return ONLY a JSON object:
    {
      "query": "the search query",
      "emoji": "😊",
      "genre": "Global & Bollywood Mix",
      "energy": "High ⚡"
    }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.warn('[AI Mood] JSON Parse failed, using local keyword mapping');
      let fallbackQuery = "Bollywood Hits";
      
      if (normalizedMood.includes('happy') || normalizedMood.includes('party')) {
        fallbackQuery = "happy bollywood party hits";
      } else if (normalizedMood.includes('sad') || normalizedMood.includes('low') || normalizedMood.includes('soulful')) {
        fallbackQuery = "sad hindi emotional songs";
      } else if (normalizedMood.includes('heartbreak') || normalizedMood.includes('emotional') || normalizedMood.includes('broken')) {
        fallbackQuery = "heartbreak bollywood sad songs";
      } else if (normalizedMood.includes('motivated') || normalizedMood.includes('energy') || normalizedMood.includes('workout')) {
        fallbackQuery = "motivational bollywood workout";
      } else if (normalizedMood.includes('chill') || normalizedMood.includes('night')) {
        fallbackQuery = "chill bollywood lofi";
      } else if (normalizedMood.includes('focus') || normalizedMood.includes('instrumental')) {
        fallbackQuery = "bollywood instrumental for focus";
      }

      data = { 
        query: fallbackQuery,
        emoji: '🎵', 
        genre: 'Global & Bollywood Mix', 
        energy: 'Medium' 
      };
    }

    // Stable single fetch
    const itunesResponse = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(data.query)}&limit=50&media=music`);
    
    let songs = itunesResponse.data.results.map(item => ({
      id: item.trackId,
      title: item.trackName,
      preview: item.previewUrl,
      artist: { name: item.artistName },
      album: { 
        cover_medium: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : '', 
        title: item.collectionName || ''
      }
    }));

    // If results are still too low, use the moodMap primary term
    if (songs.length < 5) {
      console.log('[AI Mood] iTunes results low, using moodMap fallback');
      const fallbackKey = Object.keys(moodMap).find(k => normalizedMood.includes(k)) || 'happy';
      const fallbackSearch = moodMap[fallbackKey][0];
      const fbRes = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(fallbackSearch)}&limit=40&media=music`);
      songs = fbRes.data.results.map(item => ({
        id: item.trackId,
        title: item.trackName,
        preview: item.previewUrl,
        artist: { name: item.artistName },
        album: { cover_medium: item.artworkUrl100?.replace('100x100bb', '600x600bb'), title: item.collectionName }
      }));
    }

    return {
      query: data.query,
      emoji: data.emoji || '✨',
      genre: data.genre || 'Global & Bollywood Mix',
      energy: data.energy || 'Medium',
      songs: songs
    };
  } catch (error) {
    console.error('Error in getMoodRecommendations:', error);
    const fbRes = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(mood)}&limit=40&media=music`);
    return {
      query: mood,
      emoji: '🎵',
      genre: 'Global & Bollywood Mix',
      energy: 'Medium',
      songs: fbRes.data.results.map(item => ({
        id: item.trackId,
        title: item.trackName,
        preview: item.previewUrl,
        artist: { name: item.artistName },
        album: { cover_medium: item.artworkUrl100?.replace('100x100bb', '600x600bb'), title: item.collectionName }
      }))
    };
  }
};

const generateSong = async (theme, voice, genre) => {
  try {
    const prompt = `Act as a world-class Bollywood Music Producer and Lyricist. Generate a professional, emotional song structure based on:
    - Theme/Topic: ${theme}
    - Voice/Singer Style: ${voice}
    - Genre/Vibe: ${genre}
    
    Structure the song exactly like a modern Bollywood romantic hit:
    1. Intro (Detailed musical atmosphere)
    2. Verse 1 (Building the story)
    3. Pre-Chorus (Building the tension)
    4. Chorus (THE HOOK - Powerful, catchy, and repeatable)
    5. Verse 2
    6. Chorus
    7. Bridge (The emotional peak/shift)
    8. Final Chorus (Strongest rendition)
    9. Outro (Soft emotional fade out)

    Format the response as a JSON object:
    {
      "title": "A beautiful Hindi/English title",
      "artist": "Fictional Bollywood playback singer name",
      "description": "Professional orchestration details (e.g. Grand piano, cinematic strings, tabla/beats)",
      "lyrics": "[Intro]\\n(Cinematic strings swell...)\\n\\n[Verse 1]\\n(Deep Hindi emotional lyrics...)\\n\\n[Pre-Chorus]\\n(Tension building...)\\n\\n[Chorus]\\n(Powerful emotional hook...)\\n..."
    }
    
    Return ONLY valid JSON. Avoid any preamble.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    
    // Clean up if it returned markdown JSON block
    if (text.startsWith('\`\`\`json')) {
      text = text.replace(/^\`\`\`json/, '');
      text = text.replace(/\`\`\`$/, '');
    } else if (text.startsWith('\`\`\`')) {
      text = text.replace(/^\`\`\`/, '');
      text = text.replace(/\`\`\`$/, '');
    }

    return JSON.parse(text);
  } catch (error) {
    console.warn(`[AI Creator] Gemini API failed: ${error.message}. Returning fallback song.`);
    const isHindi = [theme, voice, genre].some(s => s.toLowerCase().includes('hindi'));
    
    if (isHindi) {
      return {
        title: `${theme} Ki Yaadein`,
        artist: `The ${genre} AI (Hindi Edition)`,
        description: `A soulful ${genre} Hindi track exploring the theme of ${theme}. It features a beautiful ${voice} that touches the heart.`,
        lyrics: `[Verse 1]\nDil ki yeh baatein\nYaad aati hain raatein\n${theme} ka hai yeh samaa\nKho gaya hai mera jahan\n\n[Chorus]\nO mere humdum, sun lo zara\n${genre} ki dhun mein, hai kya maza\n${voice} ki awaaz mein, dil kho gaya\nHumein tumse pyar ho gaya\n\n[Verse 2]\nSitarein chamak rahe hain\nHum tum mil rahe hain\nZindagi hai ek khwaab\nTum ho mera mehtab\n\n[Outro]\n${theme} ki yaadein...\nBas tumhare liye...`
      };
    }

    return {
      title: `${theme} Whispers`,
      artist: `The ${genre} AI featuring ${voice}`,
      description: `A beautiful ${genre} track exploring the theme of ${theme}. The ${voice} style adds a deep emotional resonance to the melody.`,
      lyrics: `[Verse 1]\nWalking down this lonely road\nThinking about the ${theme}\nCarrying this heavy load\nNothing is what it seems\n\n[Chorus]\nOh, let the ${genre} rhythm flow\nWith a ${voice} soft and low\nWe'll find our way through the dark\nLighting up a brand new spark\n\n[Verse 2]\nStars are shining in the night\nGuiding us towards the dawn\nEverything will be alright\nAs we keep on moving on\n\n[Outro]\nYeah, the ${theme} whispers...\nFading into the night...`
    };
  }
};

module.exports = {
  getMoodRecommendations,
  generateSong
};
