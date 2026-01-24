import { gotScraping } from 'got-scraping';
import { CookieJar } from 'tough-cookie';
// import { Md5 } from 'ts-md5';

async function testLogin() {
    const email = "test@gmail.com"; // Dummy/Real? User didn't provide creds in chat.
    // I will use a dummy one just to see the redirect BEHAVIOR.
    // If invalid creds, it should return Login Page (200) or Redirect to Login (302).
    // It should NOT loop 10 times.
    
    // Note: User's error trace showed `DangNhap` failing.
    // I can't use real creds. But I can check if the server redirects efficiently.
    
    const url = "https://animevietsub.vip/account/login/?_fxRef=https://animevietsub.vip/account/info";
    const cookieJar = new CookieJar();
    
    const data = {
        email: "wrong@email.com",
        password: "",
        password_md5: "wronghash", 
        save_password: "1",
        submit: ""
    };

    console.log("Testing POST to", url);
    
    try {
        const response = await gotScraping({
            url,
            method: 'POST',
            form: data,
            cookieJar,
            headerGeneratorOptions: {
                browsers: [{ name: 'chrome', minVersion: 110 }],
                devices: ['desktop'],
                operatingSystems: ['windows'],
            },
            hooks: {
                beforeRedirect: [
                    (options, response) => {
                        console.log(`[Redirect] Status: ${response.statusCode} -> ${options.url.href}`);
                        console.log(`[Cookies]`, response.headers['set-cookie']);
                    }
                ]
            }
        });
        
        console.log("Final Url:", response.url);
        console.log("Final Status:", response.statusCode);
        console.log("Body include user-name-text?", response.body.includes("user-name-text"));
        
        const cookies = await cookieJar.getCookies(url);
        console.log("Cookies in Jar:", cookies);

    } catch (e: any) {
        console.error("Test Failed:", e.message);
        if (e.response) {
             console.log("Last Response Url:", e.response.url);
        }
    }
}

testLogin();
