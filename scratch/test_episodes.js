const ytDlp = require('yt-dlp-exec');

const test = async () => {
  try {
    console.log('Searching for episodes...');
    const result = await ytDlp('ytsearch10:Ben 10 full episodes', {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      flatPlaylist: true,
    });

    if (result && result.entries) {
      console.log(`Found ${result.entries.length} episodes.`);
      result.entries.forEach((e, i) => {
        console.log(`${i+1}: ${e.title} (${e.id})`);
      });
    } else {
      console.log('No episodes found.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
};

test();
