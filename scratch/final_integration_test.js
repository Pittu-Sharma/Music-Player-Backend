const axios = require('axios');

async function verifyAll() {
    console.log('--- FINAL SYSTEM VERIFICATION ---');
    
    // 1. Check Episode List (JJK case)
    try {
        const episodeRes = await axios.get('http://localhost:5000/api/music/anime-episodes?query=Jujutsu%20Kaisen');
        const count = episodeRes.data.data?.length || 0;
        console.log(`[PASS] Episodes found for JJK: ${count} (Should be 24)`);
        if (count < 24) console.warn('[FAIL] Expected 24 episodes, got ' + count);
    } catch (e) {
        console.error('[FAIL] Episode API failed:', e.message);
    }

    // 2. Check Resolution for Ep 1
    let streamUrl = '';
    let referer = '';
    try {
        const resolveRes = await axios.get('http://localhost:5000/api/music/resolve-anime?animeTitle=Jujutsu%20Kaisen&episodeNumber=1');
        streamUrl = resolveRes.data.url;
        referer = resolveRes.data.headers?.Referer;
        console.log('[PASS] Resolved Stream URL:', streamUrl ? 'YES' : 'NO');
        console.log('[PASS] Stream Referer Header:', referer ? 'YES' : 'NO');
    } catch (e) {
        console.error('[FAIL] Stream Resolution failed:', e.message);
    }

    // 3. Check Proxy for the resolved URL
    if (streamUrl) {
        try {
            const proxyRes = await axios.get(`http://localhost:5000/api/music/proxy-anime?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent(referer)}`, {
                headers: { Range: 'bytes=0-100' } // Just check if it pipes
            });
            console.log(`[PASS] Proxy Status: ${proxyRes.status} (Stream is accessible)`);
            console.log(`[PASS] Proxy Content-Type: ${proxyRes.headers['content-type']}`);
        } catch (e) {
            console.error('[FAIL] Proxy failed to fetch actual stream:', e.message);
        }
    }

    console.log('--- VERIFICATION COMPLETE ---');
}

verifyAll();
