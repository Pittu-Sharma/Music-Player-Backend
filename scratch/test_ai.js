const aiService = require('../services/aiService');
const dotenv = require('dotenv');
dotenv.config();

async function verifyLyricsPreservation() {
  const testLyrics = "This is a custom test lyric line 1.\nThis is custom test line 2.";
  console.log('--- Testing Lyrics Preservation ---');
  
  try {
    const result = await aiService.generateSong(
      'Space Journey', 
      'Deep male raspy', 
      'Synthwave', 
      'English', 
      testLyrics
    );
    
    console.log('Resulting Lyrics:\n', result.lyrics);
    
    const containsOriginal = result.lyrics.includes("This is a custom test lyric line 1");
    if (containsOriginal) {
      console.log('SUCCESS: Original lyrics were preserved!');
    } else {
      console.log('FAILURE: Original lyrics were replaced or lost.');
    }
    
    console.log('Resulting Title:', result.title);
    console.log('Resulting Description:', result.description);
    
  } catch (err) {
    console.error('Test Error:', err);
  }
}

verifyLyricsPreservation();
