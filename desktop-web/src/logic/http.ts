import type { GetOption } from "client-ext-animevsub-helper"
// import { Http } from "client-ext-animevsub-helper" // Disabled extension usage
import { i18n } from "src/boot/i18n"
import { C_URL } from "src/constants"

// Map referer hash to URL
const REFERER_MAP: Record<string, string> = {
  "#animevsub-vsub": "https://animevietsub.lol/",
  "#vuighe": "https://vuighe.net/",
  "#nettruyen": "https://www.nettruyenmax.com/",
  "#fb": "https://www.facebook.com/",
  "#ihentai": "https://ihentai.xyz/",
  "#streamc": "https://embed.streamc.xyz/",
  "#star": "",
};

async function callProxy(options: { url: string; method?: string; headers?: Record<string, string>; data?: any }) {
    let { url: targetUrl, method = "GET", headers = {}, data } = options;

    // Extract Referer from Hash
    for (const [key, value] of Object.entries(REFERER_MAP)) {
        if (targetUrl.endsWith(key)) {
            targetUrl = targetUrl.replace(key, "");
            // Only set referer if not already present
            if (!headers["referer"] && !headers["Referer"]) {
                 headers["referer"] = value;
            }
            break;
        }
    }

    const proxyHost = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
        const res = await fetch(`${proxyHost}/proxy`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                url: targetUrl,
                method,
                headers,
                data
            })
        });

        const text = await res.text();

        const responseHeaders: Record<string, string> = {};
        res.headers.forEach((val, key) => responseHeaders[key] = val);

        return {
            status: res.status,
            headers: responseHeaders,
            url: targetUrl,
            data: text
        };
    } catch (e) {
        console.error("Proxy Request Failed", e);
        throw e;
    }
}

async function httpGet(
  url: string | GetOption,
  headers?: Record<string, string>
) {
  console.log("get: ", url)

  // Construct options
  let options: any = {};
  if (typeof url === "object") {
    options = url;
  } else {
    options = {
        url: url.includes("://") ? url : C_URL + url + "#animevsub-vsub",
        headers
    };
  }

  const response = await callProxy({
      url: options.url,
      method: "GET",
      headers: options.headers
  }).then((response) => {
    if (response.status === 403 || response.status === 520) {
      console.log("response fail")
    }
    return response
  })

  console.log("get-result: ", response)

  if (response.status !== 200 && response.status !== 201) throw response

  return response as Omit<typeof response, "data"> & { data: string }
}

async function httpPost(
  url: string,
  data: Record<string, number | string | boolean>,
  headers?: Record<string, string>
) {
  console.log("post: ", {
    url: C_URL + url,
    data,
    headers
  })

  const fullUrl = C_URL + url + "#animevsub-vsub";

  const response = await callProxy({
    url: fullUrl,
    method: "POST",
    headers,
    data
  })

  console.log("post-result: ", response)

  if (response.status !== 200 && response.status !== 201) throw response

  return response as Omit<typeof response, "data"> & { data: string }
}

// Always export the functions, bypass extension check
export const get = httpGet
export const post = httpPost

