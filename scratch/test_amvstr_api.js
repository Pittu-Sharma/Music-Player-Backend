const axios = require('axios');

async function testAmvstr() {
  try {
    console.log('Testing Amvstr API search...');
    const res = await axios.get('https://api.amvstr.me/api/v2/search?q=naruto');
    console.log('Search success:', res.data.results?.[0]?.title);
    
    if (res.data.results?.[0]?.id) {
        const id = res.data.results[0].id;
        console.log('Testing info for ID:', id);
        const info = await axios.get(`https://api.amvstr.me/api/v2/info/${id}`);
        console.log('Info success. Episodes found:', info.data.episodes?.length);
        
        if (info.data.episodes?.[0]?.id) {
            const epId = info.data.episodes[0].id;
            console.log('Testing stream for epId:', epId);
            const stream = await axios.get(`https://api.amvstr.me/api/v2/stream/${epId}`);
            console.log('Stream success. Sources found:', stream.data.nsfw); // Check response structure
            console.log('Stream URL:', stream.data.stream?.multi?.main?.url);
        }
    }
  } catch (err) {
    console.error('Amvstr API failed:', err.message);
    if (err.response) {
        console.log('Response status:', err.response.status);
        console.log('Response data:', err.response.data);
    }
  }
}

testAmvstr();
