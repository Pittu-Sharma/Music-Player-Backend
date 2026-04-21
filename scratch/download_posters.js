const axios = require('axios');
const fs = require('fs');
const path = require('path');

const posters = [
  { name: 'shin_chan.jpg', url: 'https://image.tmdb.org/t/p/w500/zg19Paur3lVVSh8J4LJVO1wgBIg.jpg' },
  { name: 'motu_patlu.jpg', url: 'https://img.youtube.com/vi/6vYV2GndZcE/maxresdefault.jpg' },
  { name: 'ninja_hattori.jpg', url: 'https://image.tmdb.org/t/p/w500/zVSx7lXxRKqXiQMgN6QNGgNyF5R.jpg' },
  { name: 'pakdam_pakadai.jpg', url: 'https://image.tmdb.org/t/p/w500/udZdOVpvqEBX7RppeX0ZtyBqigW.jpg' },
  { name: 'chhota_bheem.jpg', url: 'https://image.tmdb.org/t/p/w500/uIclZ7srQb4bi7WOb4ZKGXWd3VP.jpg' },
  { name: 'roll_no_21.jpg', url: 'https://image.tmdb.org/t/p/w500/tyGd40QPEzDyqW4hkErOzCRBPa7.jpg' },
  { name: 'peppa_pig.jpg', url: 'https://image.tmdb.org/t/p/w500/h5SbKY64iWoeXzxdYYrRiyIfPU0.jpg' },
  { name: 'shaun_the_sheep.jpg', url: 'https://image.tmdb.org/t/p/w500/z2gPfTQd3I0JLWOAEdKYMQRLoun.jpg' },
  { name: 'grizzy.jpg', url: 'https://img.youtube.com/vi/uO2MbeI9VwM/maxresdefault.jpg' }
];

const destDir = path.join(__dirname, '../../Music-Player-Frontend/src/assets/cartoons');

async function download() {
  for (const item of posters) {
    try {
      console.log(`Downloading ${item.name}...`);
      let response;
      try {
        response = await axios({
          url: item.url,
          method: 'GET',
          responseType: 'stream'
        });
      } catch (err) {
        if (item.url.includes('maxresdefault.jpg')) {
          const fallbackUrl = item.url.replace('maxresdefault.jpg', 'hqdefault.jpg');
          console.log(`maxresdefault failed for ${item.name}, trying hqdefault...`);
          response = await axios({
            url: fallbackUrl,
            method: 'GET',
            responseType: 'stream'
          });
        } else {
          throw err;
        }
      }
      
      const writer = fs.createWriteStream(path.join(destDir, item.name));
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      console.log(`Finished ${item.name}`);
    } catch (err) {
      console.error(`Error downloading ${item.name}: ${err.message}`);
    }
  }
}

download();
