const axios = require('axios');

async function checkAnilist() {
  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 5) {
        media(search: $search, type: ANIME) {
          id
          title { userPreferred }
          episodes
          nextAiringEpisode { episode }
          description
          bannerImage
          coverImage { large }
        }
      }
    }
  `;

  try {
    const res = await axios.post('https://graphql.anilist.co', {
      query,
      variables: { search: 'Naruto Shippuden' }
    });
    
    console.log('--- ANILIST VERIFICATION ---');
    res.data.data.Page.media.forEach(m => {
      const epCount = m.episodes || (m.nextAiringEpisode?.episode - 1) || 'Unknown';
      console.log(`${m.title.userPreferred} (ID: ${m.id}) | Episodes: ${epCount}`);
    });
  } catch (err) {
    console.error('AniList Failed:', err.message);
  }
}

checkAnilist();
