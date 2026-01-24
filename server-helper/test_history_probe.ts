import { gotScraping } from 'got-scraping';
import { CookieJar } from 'tough-cookie';

// Re-use logic from test_login_flow but focusing on GET history
async function probeHistory() {
    const cookieJar = new CookieJar();
    // We assume user can provide a cookie string if needed, 
    // OR we reuse the flow: Login -> Get Cookie -> Get History.
    // Since I don't have creds, I can only check Public URLs or guess.
    // BUT, "History" is private.
    // So I must "Mock" the probing with the USER'S session?
    // I can't.
    // However, I can look at the SITE source code (if I could browse).
    
    // I will try to fetch "/tu-phim/da-xem" or "/lich-su" to see if it exists (Status 200 vs 404).
    // Even if I get Redirect (Login), the URL existence is a clue.
    
    const candidates = [
        "https://animevietsub.vip/tu-phim/da-xem",
        "https://animevietsub.vip/lich-su-xem",
        "https://animevietsub.vip/tai-khoan/lich-su",
        "https://animevietsub.vip/history"
    ];

    for (const url of candidates) {
        try {
            console.log("Probing:", url);
            const { statusCode, headers } = await gotScraping({
                url,
                method: 'HEAD', // Light check
                followRedirect: false,
                throwHttpErrors: false
            });
            console.log(`Status: ${statusCode}, Location: ${headers.location || 'N/A'}`);
        } catch (e: any) {
            console.log("Error:", e.message);
        }
    }
}

probeHistory();
