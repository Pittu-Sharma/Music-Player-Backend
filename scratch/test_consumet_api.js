const axios = require('axios');

async function testConsumet() {
  try {
    console.log('Testing Consumet API search...');
    const res = await axios.get('https://consumet.sh/anime/gogoanime/naruto');
    console.log('Search success:', res.data.results?.[0]?.title);
    
    if (res.data.results?.[0]?.id) {
        const id = res.data.results[0].id;
        console.log('Testing info for ID:', id);
        const info = await axios.get(`https://consumet.sh/anime/gogoanime/info/${id}`);
        console.log('Info success. Episodes found:', info.data.episodes?.length);
    }
  } catch (err) {
    console.error('Consumet API failed:', err.message);
    if (err.response) {
        console.log('Response status:', err.response.status);
    }
  }
}

testConsumet();
