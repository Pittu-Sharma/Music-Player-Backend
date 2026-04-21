const axios = require('axios');

async function testVercelConsumet() {
  try {
    console.log('Testing Vercel Consumet API...');
    const res = await axios.get('https://consumet-api.vercel.app/anime/gogoanime/naruto');
    console.log('Search response:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Vercel Consumet failed:', err.message);
  }
}

testVercelConsumet();
