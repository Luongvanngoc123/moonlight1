import fetch from 'node-fetch';

async function run() {
    const api = 'http://localhost:3000/api/v1';
    
    // 1. Search
    console.log("Searching 'Mật Mã Sơn Hải Kinh'...");
    const searchRes = await fetch(`${api}/search?q=Mật Mã Sơn Hải Kinh`);
    const searchData: any = await searchRes.json();
    
    if (searchData.results.length === 0) {
        console.log("No results found.");
        return;
    }
    
    const firstMovie = searchData.results[0];
    console.log(`Found: ${firstMovie.title} (${firstMovie.url})`);
    
    // 2. Detail
    // Extract slug or use full url
    // searchData.url might be full or relative. API usually returns what parse found.
    // My parsing logic returns 'href'. If relative, handled in detail?
    // Detail endpoint handles 'url' query param.
    
    const detailUrl = firstMovie.url;
    console.log(`Fetching Detail for: ${detailUrl}`);
    const detailRes = await fetch(`${api}/detail?url=${encodeURIComponent(detailUrl)}`);
    const detailData: any = await detailRes.json();
    
    console.log(`Title: ${detailData.title}`);
    console.log(`Desc: ${detailData.description?.substring(0, 50)}...`);
    console.log(`Episodes: ${detailData.episodes.length}`);
    
    if (detailData.episodes.length > 0) {
        const firstEp = detailData.episodes[0];
        console.log(`First Ep: ${firstEp.name} -> ${firstEp.url}`);
    
        // 3. Stream (Auto-resolve)
        console.log(`Fetching Stream for Episode URL: ${firstEp.url}`);
        const streamRes = await fetch(`${api}/stream?url=${encodeURIComponent(firstEp.url)}`);
        const streamData: any = await streamRes.json();
        
        if (streamData.error) {
            console.error("Stream Error:", streamData.error);
        } else {
            const firstLink = streamData.link[0];
            console.log(`Stream URL (Decrypted): ${firstLink.file.substring(0, 50)}...`);
            console.log("Success! 🎉");
        }
    }
}

run();
