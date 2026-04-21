const ytDlp = require('yt-dlp-exec');
const path = require('path');
const fs = require('fs');

const cartoons = [
  { name: 'shin_chan', id: 'O6_U9vT5fRE' },
  { name: 'motu_patlu', id: '6vYV2GndZcE' },
  { name: 'ninja_hattori', id: 't0n097oWX8w' },
  { name: 'pakdam_pakadai', id: 'k6itL_H6v_0' },
  { name: 'chhota_bheem', id: '6V97E7M-j_Y' },
  { name: 'roll_no_21', id: 'H4_v9I_qU_I' },
  { name: 'peppa_pig', id: '9l7Oun66W8s' },
  { name: 'shaun_the_sheep', id: 'oOnLg-X8yYI' },
  { name: 'grizzy', id: 'uO2MbeI9VwM' }
];

const destDir = path.join(__dirname, '../../Music-Player-Frontend/src/assets/cartoons');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

async function download() {
  for (const cartoon of cartoons) {
    const url = `https://www.youtube.com/watch?v=${cartoon.id}`;
    const dest = path.join(destDir, `${cartoon.name}.jpg`);
    
    console.log(`Downloading high-res thumbnail for ${cartoon.name}...`);
    
    try {
      // Use yt-dlp-exec to get the thumbnail URL and then download it
      const result = await ytDlp(url, {
        writeThumbnail: true,
        skipDownload: true,
        convertThumbnails: 'jpg',
        o: dest.replace('.jpg', ''),
        noCheckCertificates: true,
        noWarnings: true
      });
      console.log(`Successfully downloaded ${cartoon.name}`);
    } catch (err) {
      console.error(`Failed to download ${cartoon.name}:`, err.message);
    }
  }
}

download();
