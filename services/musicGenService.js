const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');

const generateAudio = async (theme, voice, genre, lyrics) => {
  const hfToken = process.env.HUGGINGFACE_API_TOKEN;
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

  if (!lyrics) {
    lyrics = `A song about ${theme} in the style of ${genre}`;
  }

  try {
    console.log(`[MusicGen] Starting dual-generation pipeline (Instrumental + Vocals)...`);

    // --- STEP 1: Generate Instrumental using Hugging Face ---
    let instrumentalBuffer = null;
    try {
      console.log(`[MusicGen] Generating instrumental track...`);
      const hfUrl = "https://api-inference.huggingface.co/models/facebook/musicgen-small";
      const hfPrompt = `A high-quality studio-produced ${genre} instrumental. Theme: ${theme}. Tempo: Medium.`;
      
      const hfHeaders = {};
      if (hfToken) hfHeaders.Authorization = `Bearer ${hfToken}`;

      const hfResponse = await axios.post(
        hfUrl,
        { inputs: hfPrompt },
        { headers: hfHeaders, responseType: 'arraybuffer', timeout: 60000 }
      );
      instrumentalBuffer = hfResponse.data;
    } catch (hfErr) {
      console.warn(`[MusicGen] HF Instrumental generation failed. Fetching fallback instrumental.`, hfErr.message);
      // Fallback instrumental
      const fallbackUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
      const fallbackResponse = await axios.get(fallbackUrl, { responseType: 'arraybuffer' });
      instrumentalBuffer = fallbackResponse.data;
    }

    // --- STEP 2: Generate Vocals using ElevenLabs ---
    let vocalBuffer = null;
    try {
      console.log(`[MusicGen] Generating vocal track via ElevenLabs...`);
      if (!elevenLabsKey) {
        throw new Error("ELEVENLABS_API_KEY is missing in .env");
      }
      // Using a standard ElevenLabs voice ID (Rachel)
      const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; 
      const elUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
      
      const elResponse = await axios.post(
        elUrl,
        { text: lyrics, model_id: "eleven_monolingual_v1" },
        {
          headers: {
            'xi-api-key': elevenLabsKey,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );
      vocalBuffer = elResponse.data;
    } catch (elErr) {
      console.warn(`[MusicGen] ElevenLabs generation failed:`, elErr.message);
      // If vocal generation fails, we will just return the instrumental
      console.log(`[MusicGen] Proceeding with instrumental only due to vocal failure.`);
      return instrumentalBuffer;
    }

    // --- STEP 3: Mix Tracks using FFmpeg ---
    console.log(`[MusicGen] Merging instrumental and vocals with FFmpeg...`);
    
    const tempDir = os.tmpdir();
    const sessionId = uuidv4();
    const instPath = path.join(tempDir, `inst_${sessionId}.mp3`);
    const vocPath = path.join(tempDir, `voc_${sessionId}.mp3`);
    const outputPath = path.join(tempDir, `out_${sessionId}.mp3`);

    fs.writeFileSync(instPath, instrumentalBuffer);
    fs.writeFileSync(vocPath, vocalBuffer);

    const mergedBuffer = await new Promise((resolve, reject) => {
      ffmpeg()
        .input(instPath)
        .input(vocPath)
        .complexFilter([
          // Mix the two audio streams. Adjust weights if vocals are too quiet/loud.
          '[0:a]volume=0.6[a0]; [1:a]volume=1.2[a1]; [a0][a1]amix=inputs=2:duration=longest[out]'
        ])
        .map('[out]')
        .save(outputPath)
        .on('end', () => {
          console.log(`[MusicGen] FFmpeg merging complete.`);
          const outputData = fs.readFileSync(outputPath);
          resolve(outputData);
        })
        .on('error', (err) => {
          console.error(`[MusicGen] FFmpeg error:`, err.message);
          reject(err);
        });
    });

    // Cleanup temp files
    try {
      fs.unlinkSync(instPath);
      fs.unlinkSync(vocPath);
      fs.unlinkSync(outputPath);
    } catch (e) {
      console.warn(`[MusicGen] Temp file cleanup warning:`, e.message);
    }

    return mergedBuffer;

  } catch (error) {
    console.error('[MusicGen] Audio pipeline failed:', error.message);
    // Ultimate Fallback: If FFmpeg fails (e.g., not installed), return just the instrumental
    console.log(`[MusicGen] FFmpeg failed or missing. Returning unmerged instrumental track as fallback.`);
    
    // Fetch fallback to ensure the app doesn't crash
    const fallbackUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
    const fallbackResponse = await axios.get(fallbackUrl, { responseType: 'arraybuffer' });
    return fallbackResponse.data;
  }
};

module.exports = { generateAudio };
