const { ANIME } = require('@consumet/extensions');

async function testAnimePahe() {
    try {
        const provider = new ANIME.AnimePahe();
        console.log('Testing AnimePahe search for "Naruto"...');
        const searchRes = await provider.search('Naruto');
        console.log('Search Result Count:', searchRes.results.length);
        if (searchRes.results.length > 0) {
            console.log('First Result:', searchRes.results[0]);
            const animeId = searchRes.results[0].id;
            console.log('Fetching Anime Info for ID:', animeId);
            const info = await provider.fetchAnimeInfo(animeId);
            console.log('Title:', info.title);
            console.log('Episodes Count:', info.episodes.length);
        }
    } catch (err) {
        console.error('AnimePahe test failed:', err.message);
    }
}

testAnimePahe();
