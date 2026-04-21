const axios = require('axios');

async function finalTest() {
  console.log('--- AniList Integration Test ---');
  
  // Test 1: Episode list with meta
  try {
    const res = await axios.get('http://localhost:5000/api/music/anime-episodes?query=Jujutsu+Kaisen');
    const { data, meta } = res.data;
    console.log(`[EP LIST] ${meta?.title || 'Unknown'}: ${data?.length} episodes`);
    console.log(`[META]    Rating: ${meta?.rating} | Year: ${meta?.year}`);
    console.log(`[META]    Cover: ${meta?.cover ? 'YES' : 'NO'}`);
    if (data?.length > 0) {
      console.log(`[EP IDs]  Ep1 consumetId: ${data[0].consumetId?.substring(0,40)}...`);
    }
  } catch (e) {
    console.error('[FAIL] Episode list:', e.response?.data?.message || e.message);
  }

  // Test 2: Stream resolve  
  try {
    const res = await axios.get('http://localhost:5000/api/music/resolve-anime?animeTitle=Jujutsu+Kaisen&episodeNumber=1');
    console.log(`[STREAM]  URL found: ${res.data.url ? 'YES' : 'NO'}`);
    console.log(`[STREAM]  Referer: ${res.data.headers?.Referer ? 'YES' : 'NO'}`);
  } catch (e) {
    console.error('[FAIL] Stream resolve:', e.response?.data?.message || e.message);
  }
}

finalTest();
