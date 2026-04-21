const { ANIME } = require('@consumet/extensions');
const provider = new ANIME.AnimeKai();

async function testAnimeKai() {
    try {
        console.log('Testing AnimeKai search for "Naruto"...');
        const searchRes = await provider.search('Naruto');
        console.log('Search Result Count:', searchRes.results.length);
        if (searchRes.results.length > 0) {
            const animeId = searchRes.results[0].id;
            console.log('Anime ID:', animeId);
            console.log('Fetching Anime Info...');
            const info = await provider.fetchAnimeInfo(animeId);
            console.log('Title:', info.title);
            console.log('Episodes Count:', info.episodes.length);
            if (info.episodes.length > 0) {
                console.log('First Episode:', info.episodes[0]);
                
                const epId = info.episodes[0].id;
                console.log('Fetching Episode Sources for:', epId);
                const sources = await provider.fetchEpisodeSources(epId);
                console.log('Sources found:', sources.sources.length);
                console.log('First Source URL:', sources.sources[0]?.url);
                
                if (sources.sources[0]?.url) {
                    console.log('SUCCESS: AnimeKai is working and providing streams.');
                }
            }
        } else {
            console.log('No results found for Naruto on AnimeKai');
        }
    } catch (err) {
        console.error('AnimeKai test failed:', err.message);
    }
}

testAnimeKai();
