import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { gotScraping } from "got-scraping";
import { Buffer } from "node:buffer";
import { CookieJar } from 'tough-cookie';

const app = new Hono();

// Enable CORS - Allow Vercel and custom domains
app.use("/*", cors({
  origin: '*', // Allow all origins (can restrict to Vercel domain later)
  allowHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  credentials: true
}));

const REFERER_MAP: Record<string, string> = {
  "#animevsub-vsub": "https://animevietsub.lol/",
  "#vuighe": "https://vuighe.net/",
  "#nettruyen": "https://www.nettruyenmax.com/",
  "#fb": "https://www.facebook.com/",
  "#ihentai": "https://ihentai.xyz/",
  "#streamc": "https://embed.streamc.xyz/",
  "#star": "",
};

app.get("/", (c) => c.text("AnimeVsub Helper Proxy Server is Running with Stealth Mode! 忍者"));

app.get("/proxy", async (c) => {
    const url = c.req.query("url");
    const referer = c.req.query("referer");
    
    if (!url) return c.text("URL required", 400);

    console.log(`[Proxy Stream] ${url}`);

    // Prepare headers for got-scraping
    // We avoid forwarding ALL headers to prevent fingerprint mismatch
    // We mostly care about Referer and Cookie
    const customHeaders: Record<string, string> = {};
    const clientHeaders = c.req.header();

    if (clientHeaders['cookie']) {
        customHeaders['cookie'] = clientHeaders['cookie'];
    }

    if (referer) {
        customHeaders["referer"] = referer;
    } else {
        // Fallback logic
        for (const [key, value] of Object.entries(REFERER_MAP)) {
            if (url.endsWith(key)) {
                customHeaders["referer"] = value;
                break;
            }
        }
    }

    console.log(`[Proxy Headers] Referer: ${customHeaders['referer']} | Spoofing Chrome Windows`);

    try {
        const stream = gotScraping.stream(url, {
            headers: customHeaders,
            headerGeneratorOptions: {
                browsers: [{ name: 'chrome', minVersion: 110 }],
                devices: ['desktop'],
                operatingSystems: ['windows'],
            },
            // Got handles redirects automatically
        });

        // Hono with node-adapter supports piping Node Streams
        // We need to capture the response to set headers/status
        return new Promise((resolve) => {
            stream.on('response', (response) => {
                console.log(`[Proxy Response] ${response.statusCode} ${url}`);
                
                const responseHeaders: Record<string, string> = {};
                // Copy response headers
                for (const [key, val] of Object.entries(response.headers)) {
                     if (key.startsWith(':') || ['content-encoding', 'host', 'connection', 'transfer-encoding'].includes(key.toLowerCase())) continue;
                     if (Array.isArray(val)) responseHeaders[key] = val.join(', ');
                     else if (val) responseHeaders[key] = val;
                }
                
                responseHeaders['access-control-allow-origin'] = '*';
                
                // Pass stream directly. Note: casting to any to bypass type check as Hono expects Fetch API Stream usually
                resolve(c.body(stream as any, response.statusCode as any, responseHeaders));
            });

            stream.on('error', (err) => {
                console.error("Stream Error", err);
                // Try catch might not catch stream errors emitted later, but this listener will
                // If headers already sent, this might crash, but for now it's okay
                resolve(c.text(err.message, 500));
            });
        });

    } catch (e: any) {
        console.error("Setup Error", e);
        return c.text(e.message, 500);
    }
});

// Import decrypt logic (ignoring type check for now till we fix tsconfig)
// @ts-ignore
import { decrypt, initializeDha } from './src/logic/decrypt.ts';

// Helper to add protocol
const addProtocolUrl = (file: string) => file.startsWith("http") ? file : `https:${file}`;

app.get("/api/source", async (c) => {
    const id = c.req.query("id");
    const play = c.req.query("play");
    const link = c.req.query("link"); // hash

    if (!id || !play || !link) return c.json({ error: "Missing parameters" }, 400);

    try {
        console.log(`[API Source] Resolving for ID: ${id}`);
        
        // 1. Initialize WASM if needed
        await initializeDha();

        // 2. Fetch Source from Upstream
        // We use gotScraping to mimic Chrome
        const bodyParams = new URLSearchParams({ id, play, link, backuplinks: "1" }).toString();
        
        const response = await gotScraping({
            url: "https://animevietsub.vip/ajax/player?v=2019a",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Referer": "https://animevietsub.lol/",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: bodyParams,
            responseType: 'json',
            headerGeneratorOptions: {
                browsers: [{ name: 'chrome', minVersion: 110 }],
                devices: ['desktop'],
                operatingSystems: ['windows'],
            }
        });

        const data: any = response.body;
        
        if (!data || !data.link) {
            console.error("[API Source] Upstream returned no link", data);
            return c.json({ error: "Source not found" }, 404);
        }

        // 3. Process Links (Decrypt & Rewrite)
        await Promise.all(data.link.map(async (item: any) => {
            if (item.file.includes("://")) {
                item.file = addProtocolUrl(item.file);
            } else {
                // Decrypt
                let m3u8Content = await decrypt(item.file);
                
                // Build absolute URL using X-Forwarded-* headers from Nginx
                // These tell us the EXTERNAL URL that browser used to access the site
                const forwardedHost = c.req.header('x-forwarded-host') || c.req.header('host') || 'localhost:3000';
                const forwardedProto = c.req.header('x-forwarded-proto') || 'http';
                
                // Replace segment URLs with absolute proxy URLs
                // Must be absolute because m3u8 is in data URI (no base URL for relative resolution)
                m3u8Content = m3u8Content.replace(/(https?:\/\/[^\s\n"']+)/g, (match: string) => {
                    const [realUrl] = match.split('#');
                    return `${forwardedProto}://${forwardedHost}/api/proxy?url=${encodeURIComponent(realUrl)}&referer=${encodeURIComponent("https://animevietsub.vip/")}`;
                });

                // Convert to Data URI (Client expects this or URL)
                item.file = `data:application/vnd.apple.mpegurl;base64,${Buffer.from(m3u8Content).toString('base64')}`;
                
                item.label = item.label || "HD";
                item.type = "hls";
            }
        }));

        return c.json(data);

    } catch (e: any) {
        console.error("[API Source] Error", e);
        return c.json({ error: e.message }, 500);
    }
});

// @ts-ignore
import * as cheerio from 'cheerio';

const v1 = new Hono();

// Search API
v1.get("/search", async (c) => {
    const q = c.req.query("q");
    const page = c.req.query("page") || "1";

    if (!q) return c.json({ error: "Missing query 'q'" }, 400);

    try {
        // Fetch search page
        const searchPath = `tim-kiem/${encodeURIComponent(q).replace(/%20/g, '+')}/trang-${page}.html`;
        const url = `https://animevietsub.vip/${searchPath}`;

        console.log(`[API Search] Fetching ${url}`);

        const response = await gotScraping({
            url,
            headerGeneratorOptions: {
                browsers: [{ name: 'chrome', minVersion: 110 }],
                devices: ['desktop'],
                operatingSystems: ['windows'],
            }
        });

        const html = response.body;
        const $ = cheerio.load(html);
        const results: any[] = [];

        // Select items matching common patterns
        $('.TPostMv').each((i, el) => {
            const title = $(el).find('h2, .Title').text().trim();
            const href = $(el).find('a').attr('href');
            let image = $(el).find('img').attr('src');
            
            if (href && title) {
                if (image && !image.startsWith('http')) {
                    image = `https:${image}`;
                }
                
                results.push({ title, url: href, image });
            }
        });

        return c.json({
            query: q,
            page: Number(page),
            results
        });

    } catch (e: any) {
        console.error("Search Error", e);
        return c.json({ error: e.message }, 500);
    }
});

// Detail API
v1.get("/detail", async (c) => {
    const url = c.req.query("url"); // Full URL or Slug
    if (!url) return c.json({ error: "Missing 'url'" }, 400);

    try {
        // Ensure full URL
        const targetUrl = url.startsWith("http") ? url : `https://animevietsub.vip/${url}`;
        console.log(`[API Detail] Fetching ${targetUrl}`);

        const response = await gotScraping({
            url: targetUrl,
            headerGeneratorOptions: {
                browsers: [{ name: 'chrome', minVersion: 110 }],
                devices: ['desktop'],
                operatingSystems: ['windows'],
            }
        });

        const html = response.body;
        const $ = cheerio.load(html);

        // Parse Metadata
        const title = $('h1.Title').text().trim() || $('.title-1').text().trim(); // Adjust selectors based on site
        const description = $('.Description').text().trim() || $('.content').text().trim(); // Adjust
        let image = $('.Image img').attr('src') || $('.poster img').attr('src');
        if (image && !image.startsWith('http')) image = `https:${image}`;

        // Parse Episodes
        // Structure: .list-episode a, or .list-server a
        const episodes: any[] = [];
        $('.list-episode a, .list-server .server-item').each((i, el) => {
            const name = $(el).text().trim();
            const href = $(el).attr('href');
            if (href) {
                // Determine if this href is a watch link or just pagination
                // AnimeVietsub watch links often end with .html or /tap-...
                episodes.push({
                    name,
                    url: href.startsWith("http") ? href : `https://animevietsub.vip${href}`
                });
            }
        });

        // Also check if there is a "Xem Phim" button if list is empty (Movie)
        if (episodes.length === 0) {
            const watchLink = $('.WatchNow').attr('href') || $('.btn-watch').attr('href');
            if (watchLink) {
                episodes.push({ name: "Full", url: watchLink });
            }
        }

        return c.json({
            title,
            description,
            image,
            episodes
        });

    } catch (e: any) {
        console.error("Detail Error", e);
        return c.json({ error: e.message }, 500);
    }
});

// Stream API (Refactored logic)
v1.get("/stream", async (c) => {
    let id = c.req.query("id");
    let play = c.req.query("play");
    let link = c.req.query("link"); 
    const url = c.req.query("url");

    try {
        // If Episode URL is provided, fetch params from it
        if (url) {
            const targetUrl = url.startsWith("http") ? url : `https://animevietsub.vip/${url}`;
            console.log(`[API Stream] Auto-resolving params from: ${targetUrl}`);
            
            const response = await gotScraping({
                url: targetUrl,
                headerGeneratorOptions: { browsers: [{ name: 'chrome', minVersion: 110 }], devices: ['desktop'], operatingSystems: ['windows'] }
            });
            
            const $ = cheerio.load(response.body);
            
            // params are usually in hidden inputs or data attributes for the player
            // Common pattern: input#id, input#link
            id = $('input#id').val() as string || $('input[name="id"]').val() as string;
            link = $('input#link').val() as string || $('input[name="link"]').val() as string;
            play = $('input#play').val() as string || $('input[name="play"]').val() as string || 'api'; // default 'api' if missing? 
            
            // Sometimes they are in script variables. Fallback regex?
            if (!id) {
                const html = response.body as string;
                const idMatch = html.match(/id\s*:\s*["'](\d+)["']/);
                if (idMatch) id = idMatch[1];
                
                const linkMatch = html.match(/link\s*:\s*["']([^"']+)["']/);
                if (linkMatch) link = linkMatch[1];
            }
            
            console.log(`[API Stream] Resolved Params -> id: ${id}, link: ${link?.substring(0, 10)}...`);
        }

        if (!id || !link) return c.json({ error: "Missing parameters or failed to resolve from URL" }, 400);
        if (!play) play = "api"; // Default?

        await initializeDha();
        
        const bodyParams = new URLSearchParams({ id, play, link, backuplinks: "1" }).toString();
        const response = await gotScraping({
            url: "https://animevietsub.vip/ajax/player?v=2019a",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Referer": "https://animevietsub.lol/",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: bodyParams,
            responseType: 'json',
            headerGeneratorOptions: { browsers: [{ name: 'chrome', minVersion: 110 }], devices: ['desktop'], operatingSystems: ['windows'] }
        });

        const data: any = response.body;
        if (!data || !data.link) return c.json({ error: "Source not found" }, 404);

        await Promise.all(data.link.map(async (item: any) => {
            if (item.file.includes("://")) {
                item.file = addProtocolUrl(item.file);
            } else {
                let m3u8Content = await decrypt(item.file);
                // Use forwarded headers to build absolute URLs (same logic as /api/source)
                const forwardedHost = c.req.header('x-forwarded-host') || c.req.header('host') || 'localhost:3000';
                const forwardedProto = c.req.header('x-forwarded-proto') || 'http';
                m3u8Content = m3u8Content.replace(/(https?:\/\/[^\s\n"']+)/g, (match: string) => {
                    const [realUrl] = match.split('#');
                    return `${forwardedProto}://${forwardedHost}/api/proxy?url=${encodeURIComponent(realUrl)}&referer=${encodeURIComponent("https://animevietsub.vip/")}`;
                });
                item.file = `data:application/vnd.apple.mpegurl;base64,${Buffer.from(m3u8Content).toString('base64')}`;
                item.label = item.label || "HD";
                item.type = "hls";
            }
        }));
        return c.json(data);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// Mount /api/v1
app.route('/api/v1', v1);

// For API POST requests (still useful to use gotScraping for consistency)
app.post("/proxy", async (c) => {
// ... existing code ...
  try {
    const body = await c.req.json();
    const { url, method = "GET", headers = {}, data } = body;

    if (!url) return c.json({ error: "URL is required" }, 400);

    console.log(`[Proxy Request] ${method} ${url}`);

    const customHeaders = { ...headers };
    
    // Allow overriding headers from body
    // Remove forbidden ones just in case
    delete customHeaders['host'];
    delete customHeaders['connection'];
    delete customHeaders['content-length'];

    // Map Referer
    const currentReferer = customHeaders["referer"];
    if (currentReferer && REFERER_MAP[currentReferer]) {
        customHeaders["referer"] = REFERER_MAP[currentReferer];
    }

    const start = Date.now();
    // Create a fresh cookie jar for this request sequence
    const cookieJar = new CookieJar();
    
    // Populate cookieJar with cookies from request headers
    // got ignores headers['cookie'] if cookieJar is set, so we must add them manually
    // Check both customHeaders (explicit) and request headers (browser)
    const cookieHeader = customHeaders['cookie'] || c.req.header('cookie');
    
    if (cookieHeader) {
        const cookies = cookieHeader.split(';');
        for (const cookieStr of cookies) {
            if (cookieStr.trim()) {
                try {
                    await cookieJar.setCookie(cookieStr.trim(), url);
                } catch (e) {
                    console.warn(`[Proxy] Failed to set cookie: ${cookieStr}`, e);
                }
            }
        }
        delete customHeaders['cookie']; // Clean up header as it's now in jar
    }
    
    // Determine body handling
    let gotOptions: any = {
        url,
        method,
        headers: customHeaders,
        cookieJar,
        headerGeneratorOptions: {
            browsers: [{ name: 'chrome', minVersion: 110 }],
            devices: ['desktop'],
            operatingSystems: ['windows'],
        },
        maxRedirects: 20,
        hooks: {
            beforeRedirect: [
                (options, response) => {
                    console.log(`[Proxy Redirect] to ${options.url.href}`);
                    console.log(`[Proxy Redirect Headers]`, options.headers);
                }
            ]
        },
        throwHttpErrors: false
    };

    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        const contentType = customHeaders['content-type'] || customHeaders['Content-Type'] || '';
        
        if (typeof data === 'object' && data !== null) {
            if (contentType.includes('application/json')) {
                gotOptions.body = JSON.stringify(data);
            } else {
                // Default to form-urlencoded for objects if not JSON
                // This fixes Login (PHP expects $_POST)
                gotOptions.form = data;
                // got will set Content-Type to application/x-www-form-urlencoded
                // So we should remove existing Content-Type header if it conflicts, or got overrides it.
                // Usually safe to let got handle it.
            }
        } else {
            gotOptions.body = data;
        }
    }

    const response = await gotScraping(gotOptions);
    
    console.log(`[Proxy Response] ${response.statusCode} ${url} (${Date.now() - start}ms)`);

    const responseHeaders: Record<string, string> = {};
    for (const [key, val] of Object.entries(response.headers)) {
       if (key.startsWith(':') || ['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) continue;
       
       // Skip Set-Cookie here as we will handle it from Jar/Response combined
       if (key.toLowerCase() !== 'set-cookie') {
           if (Array.isArray(val)) responseHeaders[key] = val.join(', ');
           else if (val) responseHeaders[key] = val as string;
       }
    }

    // Retrieve cookies from jar (which includes cookies from redirects)
    // And also check response.headers['set-cookie'] if any leftover (got usually puts them in jar)
    const cookies = await cookieJar.getCookies(url);
    if (cookies.length > 0) {
        cookies.forEach(cookie => {
            c.header('set-cookie', cookie.toString(), { append: true });
        });
    }
    
    // Fallback: If got didn't put some in jar (unlikely) or just raw headers
    const rawSetCookie = response.headers['set-cookie'];
    if (rawSetCookie) {
         if (Array.isArray(rawSetCookie)) {
             rawSetCookie.forEach(v => c.header('set-cookie', v, { append: true }));
         } else {
             c.header('set-cookie', rawSetCookie as string, { append: true });
         }
    }

    return c.body(response.rawBody as any, response.statusCode as any, responseHeaders);

  } catch (err: any) {
    console.error("[Proxy Error]", err);
    return c.json({ error: err.message }, 500);
  }
});

const port = Number(process.env.PORT) || 3000;
console.log(`Server is running on port ${port} with got-scraping 🚀`);

serve({
  fetch: app.fetch,
  port,
});
