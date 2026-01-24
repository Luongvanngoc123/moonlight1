import { useCache } from "src/apis/useCache"
import Worker from "src/apis/workers/pre-search?worker"
import { C_URL } from "src/constants"
// import { post } from "src/logic/http"

import type PreSearchParser from "../parser/pre-search"
import { PostWorker } from "../wrap-worker"

import { getPathName } from "../parser/__helpers__/getPathName"

export async function PreSearch(query: string) {
  const proxyHost = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  try {
    const res = await fetch(`${proxyHost}/api/v1/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    return (data.results || []).map((item: any) => ({
      image: item.image,
      path: getPathName(item.url),
      name: item.title,
      status: "FULL" // API doesn't return status yet
    }));
  } catch (e) {
    console.error("Search Error", e);
    return [];
  }
}
