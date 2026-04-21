const axios = require('axios');

const shows = [
  { name: 'shin_chan', id: 30623 },
  { name: 'motu_patlu', id: 63868 },
  { name: 'ninja_hattori', id: 80885 },
  { name: 'pakdam_pakadai', id: 65673 },
  { name: 'chhota_bheem', id: 45186 },
  { name: 'roll_no_21', id: 60742 },
  { name: 'peppa_pig', id: 26330 },
  { name: 'shaun_the_sheep', id: 3902 },
  { name: 'grizzy', id: 71228 }
];

async function findPosters() {
  for (const show of shows) {
    try {
      const url = `https://www.themoviedb.org/tv/${show.id}`;
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const html = res.data;
      const match = html.match(/https:\/\/image\.tmdb\.org\/t\/p\/w500\/([^"]+\.jpg)/);
      if (match) {
        console.log(`${show.name}: ${match[0]}`);
      } else {
        console.log(`${show.name}: Not found`);
      }
    } catch (err) {
      console.log(`${show.name}: Error ${err.message}`);
    }
  }
}

findPosters();
