const { ANIME } = require('@consumet/extensions');
const provider = new ANIME.AnimeKai();

async function testControllerLogic() {
    try {
        const query = "Naruto Shippuden";
        console.log(`Searching for: ${query}`);
        const res = await provider.search(query);
        console.log(`Results found: ${res.results?.length || 0}`);
        if (res.results && res.results.length > 0) {
            const animeId = res.results[0].id;
            console.log(`Fetching info for: ${animeId}`);
            const info = await provider.fetchAnimeInfo(animeId);
            console.log(`Episodes found: ${info.episodes?.length || 0}`);
        }
    } catch (err) {
        console.error('Test failed:', err.message);
    }
}

testControllerLogic();
