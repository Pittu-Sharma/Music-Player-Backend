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

const getMoodRecommendations = async (mood, lang = 'Hindi') => {
  const normalizedMood = mood.toLowerCase();
  console.log('[AI Mood] Finding vibes for:', normalizedMood);

  try {
    const prompt = `Translate the mood "${mood}" into a single powerful musical search query for iTunes. 
    The results MUST be in the ${lang} language.
    Focus on finding a mix of high-quality ${lang} hits and relevant ${lang} lo-fi/indie.
    Example: "happy ${lang} party hits", "sad emotional ${lang} songs", "motivational workout ${lang}".
    
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
      let fallbackQuery = `${lang} Hits`;
      
      if (normalizedMood.includes('happy') || normalizedMood.includes('party')) {
        fallbackQuery = `happy ${lang} party hits`;
      } else if (normalizedMood.includes('sad') || normalizedMood.includes('low') || normalizedMood.includes('soulful')) {
        fallbackQuery = `sad ${lang} emotional songs`;
      } else if (normalizedMood.includes('heartbreak') || normalizedMood.includes('emotional') || normalizedMood.includes('broken')) {
        fallbackQuery = `heartbreak ${lang} sad songs`;
      } else if (normalizedMood.includes('motivated') || normalizedMood.includes('energy') || normalizedMood.includes('workout')) {
        fallbackQuery = `motivational ${lang} workout`;
      } else if (normalizedMood.includes('chill') || normalizedMood.includes('night')) {
        fallbackQuery = `chill ${lang} lofi`;
      } else if (normalizedMood.includes('focus') || normalizedMood.includes('instrumental')) {
        fallbackQuery = `${lang} instrumental for focus`;
      }

      data = { 
        query: fallbackQuery,
        emoji: '🎵', 
        genre: `${lang} Mix`, 
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
      language: lang,
      album: { 
        cover_medium: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : '', 
        title: item.collectionName || ''
      }
    }));

    
    if (lang && lang !== 'English' && songs.length > 0) {
      songs = await verifyLanguage(songs, lang);
    }

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
        language: lang,
        album: { cover_medium: item.artworkUrl100?.replace('100x100bb', '600x600bb'), title: item.collectionName }
      }));
      if (lang && lang !== 'English' && songs.length > 0) {
        songs = await verifyLanguage(songs, lang);
      }
    }

    return {
      query: data.query,
      emoji: data.emoji || '✨',
      genre: data.genre || `${lang} Mix`,
      energy: data.energy || 'Medium',
      songs: songs
    };
  } catch (error) {
    console.error('Error in getMoodRecommendations:', error);
    const fbRes = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(mood)}&limit=40&media=music`);
    return {
      query: mood,
      emoji: '🎵',
      genre: `${lang} Mix`,
      energy: 'Medium',
      songs: await (async () => {
        const rawSongs = fbRes.data.results.map(item => ({
          id: item.trackId,
          title: item.trackName,
          preview: item.previewUrl,
          artist: { name: item.artistName },
          language: lang,
          album: { cover_medium: item.artworkUrl100?.replace('100x100bb', '600x600bb'), title: item.collectionName }
        }));
        return (lang && lang !== 'English') ? await verifyLanguage(rawSongs, lang) : rawSongs;
      })()
    };
  }
};

const generateSong = async (theme, voice, genre, lang = 'Hindi', userLyrics = null) => {
  console.log('[AI Service] generateSong called with:', { theme, voice, genre, lang, hasLyrics: !!userLyrics });
  try {
    let prompt = "";
    
    if (userLyrics) {
      prompt = `Act as a world-class ${lang} Music Producer.
      
      Theme/Topic: ${theme}
      Voice/Singer Style: ${voice}
      Genre/Vibe: ${genre}
      
      Generate metadata for this song.
      
      Format the response as a JSON object:
      {
        "title": "A beautiful ${lang} title based on the theme",
        "artist": "Fictional ${lang} playback singer name",
        "description": "Professional orchestration details matching the ${genre} vibe"
      }
      Return ONLY valid JSON.`;
    } else {
      prompt = `Act as a world-class ${lang} Music Producer and Lyricist. Generate a professional, emotional song structure based on:
      - Theme/Topic: ${theme}
      - Voice/Singer Style: ${voice}
      - Genre/Vibe: ${genre}
      - Language: ${lang}
      
      Structure the song exactly like a modern ${lang} hit:
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
        "title": "A beautiful ${lang} title",
        "artist": "Fictional ${lang} playback singer name",
        "description": "Professional orchestration details (e.g. Grand piano, cinematic strings, traditional instruments)",
        "lyrics": "[Intro]\\n(Detailed atmosphere...)\\n\\n[Verse 1]\\n(Deep ${lang} lyrics...)\\n\\n[Pre-Chorus]\\n(Tension building...)\\n\\n[Chorus]\\n(Powerful emotional hook in ${lang}...)\\n..."
      }
      
      Return ONLY valid JSON. Avoid any preamble.`;
    }

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

    const parsedData = JSON.parse(text);
    if (userLyrics) {
      parsedData.lyrics = userLyrics;
    }
    return { ...parsedData, language: lang };
  } catch (error) {
    console.warn(`[AI Creator] Gemini API failed: ${error.message}. Returning fallback song.`);
    
    // If user provided lyrics, we must use them even in fallback
    if (userLyrics) {
      return {
        title: theme || "My Custom Song",
        artist: `AI Producer (${voice})`,
        language: lang,
        description: `A professionally structured ${genre} track based on your custom lyrics. Optimized for a ${voice} style.`,
        lyrics: userLyrics
      };
    }

    const isHindi = [theme, voice, genre].some(s => s.toLowerCase().includes('hindi'));
    
    if (isHindi) {
      return {
        title: `${theme} Ki Yaadein`,
        artist: `The ${genre} AI (Hindi Edition)`,
        language: 'Hindi',
        description: `A soulful ${genre} Hindi track exploring the theme of ${theme}. It features a beautiful ${voice} that touches the heart.`,
        lyrics: `[Verse 1]\nDil ki yeh baatein\nYaad aati hain raatein\n${theme} ka hai yeh samaa\nKho gaya hai mera jahan\n\n[Chorus]\nO mere humdum, sun lo zara\n${genre} ki dhun mein, hai kya maza\n${voice} ki awaaz mein, dil kho gaya\nHumein tumse pyar ho gaya\n\n[Verse 2]\nSitarein chamak rahe hain\nHum tum mil rahe hain\nZindagi hai ek khwaab\nTum ho mera mehtab\n\n[Outro]\n${theme} ki yaadein...\nBas tumhare liye...`
      };
    }

    return {
      title: `${theme} Whispers`,
      artist: `The ${genre} AI featuring ${voice}`,
      language: lang,
      description: `A beautiful ${genre} track exploring the theme of ${theme}. The ${voice} style adds a deep emotional resonance to the melody.`,
      lyrics: `[Verse 1]\nWalking down this lonely road\nThinking about the ${theme}\nCarrying this heavy load\nNothing is what it seems\n\n[Chorus]\nOh, let the ${genre} rhythm flow\nWith a ${voice} soft and low\nWe'll find our way through the dark\nLighting up a brand new spark\n\n[Verse 2]\nStars are shining in the night\nGuiding us towards the dawn\nEverything will be alright\nAs we keep on moving on\n\n[Outro]\nYeah, the ${theme} whispers...\nFading into the night...`
    };
  }
};

const verifyLanguage = async (songs, targetLanguage) => {
  if (!songs || songs.length === 0) return [];
  // English is considered a global language, but we still tag it
  if (targetLanguage.toLowerCase() === 'english') {
    return songs.map(s => ({ ...s, language: 'English' }));
  }

  const lowerTarget = targetLanguage.toLowerCase();
  
  // Manual blocklist for known Hindi hits and artists that often pollute other language searches
  const hindiBlocklist = [
    'channa mereya', 'tum hi ho', 'kesariya', 'nashe si chadh gayi', 
    'ghungroo', 'jai jai shivshankar', 'nacho nacho', 'shree hanuman chalisa',
    'apna bana le', 'tujhe kitna chahne lage', 'tera hone laga hoon', 'sajni', 'o maahi',
    'arijit singh', 'neha kakkar', 'badshah', 'tony kakkar', 'jubin nautiyal',
    'atif aslam', 'shreya ghoshal', 'kumar sanu', 'udit narayan', 'alka yagnik',
    'sonu nigam', 'kk', 'mohit chauhan', 'armaan malik', 'amaal mallik',
    'vishal dadlani', 'shekhar ravjiani', 'mika singh', 'himesh reshammiya',
    'kailash kher', 'anuv jain', 'prateek kuhad', 'darshan raval', 'yo yo honey singh'
  ];

  if (lowerTarget !== 'hindi' && lowerTarget !== 'english') {
    songs = songs.filter(s => {
      const title = s.title.toLowerCase();
      const artist = s.artist.name.toLowerCase();
      const isBlocked = hindiBlocklist.some(blocked => 
        title.includes(blocked) || artist.includes(blocked)
      );
      if (isBlocked) {
        console.log(`[Backend Blocklist] Removing "${s.title}" by "${s.artist.name}" from ${targetLanguage} results`);
      }
      return !isBlocked;
    });
  }

  if (songs.length === 0) return [];
  
  const trackList = songs.map(s => `ID:${s.id} | "${s.title}" by "${s.artist.name}"`).join('\n');
  const prompt = `Task: Strict Music Language Filtering.
  Target Language: ${targetLanguage}
  
  Instructions:
  1. Carefully check each song. If the song is NOT in ${targetLanguage}, it MUST be excluded.
  2. DANGER: Hindi songs (Bollywood) often appear in these lists incorrectly.
  3. If the target language is NOT Hindi, and the song is actually a Hindi song, you MUST EXCLUDE IT.
  4. Only include IDs that you are 100% CERTAIN are sung in ${targetLanguage}.
  5. If the title or artist name sounds like it belongs to another region, exclude it.
  
  List to analyze:
  ${trackList}
  
  Response Format: Return ONLY a JSON array of IDs.
  Example: [123, 456]
  Return [] if no matches found.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    
    const startBracket = text.indexOf('[');
    const endBracket = text.lastIndexOf(']');
    
    if (startBracket !== -1 && endBracket !== -1) {
      text = text.substring(startBracket, endBracket + 1);
    } else {
      throw new Error('No JSON array in AI response');
    }
    
    const matchingIds = JSON.parse(text).map(id => String(id));
    console.log(`[AI Language Verify] Found ${matchingIds.length} verified ${targetLanguage} songs.`);
    
    return songs
      .filter(s => matchingIds.includes(String(s.id)))
      .map(s => ({ ...s, language: targetLanguage })); 
  } catch (error) {
    console.warn(`[AI Language Verify] AI failed (${error.message}). Using strict heuristic fallback.`);
    
    // STRICT FALLBACK: If AI fails, we allow songs that passed the blocklist, 
    // but only if they don't look like generic Bollywood hits.
    return songs.map(s => {
      const isAmbiguous = s.title.toLowerCase().includes('bollywood') || 
                         s.title.toLowerCase().includes('hindi');
      
      return { 
        ...s, 
        language: isAmbiguous ? 'Unknown' : targetLanguage 
      };
    });
  }
};

module.exports = {
  getMoodRecommendations,
  generateSong,
  verifyLanguage
};
