const { ANIME } = require('@consumet/extensions');

async function testGogoanime() {
    try {
        const gogo = new ANIME.Gogoanime();
        console.log('Testing Gogoanime search for "Naruto Shippuden"...');
        const searchRes = await gogo.search('Naruto Shippuden');
        console.log('Search Result Count:', searchRes.results.length);
        if (searchRes.results.length > 0) {
            const animeId = searchRes.results[0].id;
            console.log('Anime ID:', animeId);
            console.log('Fetching Anime Info...');
            const info = await gogo.fetchAnimeInfo(animeId);
            console.log('Title:', info.title);
            console.log('Episodes Count:', info.episodes.length);
            if (info.episodes.length > 0) {
                console.log('First Episode:', info.episodes[0]);
                console.log('Last Episode:', info.episodes[info.episodes.length - 1]);
                
                const epId = info.episodes[0].id;
                console.log('Fetching Episode Sources for:', epId);
                const sources = await gogo.fetchEpisodeSources(epId);
                console.log('Sources found:', sources.sources.length);
                console.log('First Source URL:', sources.sources[0]?.url);
            }
        } else {
            console.log('No results found for Naruto Shippuden on Gogoanime');
        }
    } catch (err) {
        console.error('Gogoanime test failed:', err.message);
    }
}

testGogoanime();
