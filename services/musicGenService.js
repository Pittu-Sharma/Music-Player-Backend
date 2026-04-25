const axios = require('axios');

const generateAudio = async (theme, voice, genre, lyrics) => {
  const HfToken = process.env.HUGGINGFACE_API_TOKEN;
  
  if (!HfToken) {
    throw new Error('HUGGINGFACE_API_TOKEN is missing in .env file. Real music generation requires an API token.');
  }

  try {
    // Switching to Meta MusicGen for real orchestral/composed music as requested
    const modelUrl = "https://api-inference.huggingface.co/models/facebook/musicgen-medium";
    
    // Constructing the specific prompt template requested by the user
    const musicPrompt = `
      Bollywood ${genre} song,
      ${voice},
      emotional and expressive singing,
      Theme: ${theme},
      piano and strings,
      slow to medium tempo,
      cinematic Indian style,
      melodic composition with chorus and verses
    `.trim();
    
    console.log(`[MusicGen] Requesting real audio generation for: "${theme}" using Meta MusicGen...`);

    const response = await axios.post(
      modelUrl,
      { inputs: musicPrompt },
      {
        headers: { Authorization: `Bearer ${HfToken}` },
        responseType: 'arraybuffer'
      }
    );

    return response.data; // Binary audio (WAV)
  } catch (error) {
    console.error('[MusicGen] Error generating music:', error.response?.data || error.message);
    throw new Error('Real AI Music generation failed. Check your Hugging Face token or API limits.');
  }
};

module.exports = { generateAudio };
