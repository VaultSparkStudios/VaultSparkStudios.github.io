const LS_KEY = "vshub_credentials";

function getMeta(name, fallback = "") {
  if (typeof document === "undefined") return fallback;
  return document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") || fallback;
}

function getParam(name, fallback = "") {
  if (typeof window === "undefined") return fallback;
  return new URLSearchParams(window.location.search).get(name) || fallback;
}

function getStored(name, fallback = "") {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return (raw ? JSON.parse(raw)[name] : null) || fallback;
  } catch {
    return fallback;
  }
}

// Priority: query param → localStorage → meta tag → hardcoded default
export function getHubRuntimeConfig() {
  return {
    githubToken:    getParam("githubToken",    getStored("githubToken",    getMeta("hub-github-token",    ""))),
    supabaseUrl:    getParam("supabaseUrl",    getMeta("hub-supabase-url", "https://fjnpzjjyhnpmunfoycrp.supabase.co")),
    supabaseAnonKey: getParam("supabaseAnonKey", getStored("supabaseAnonKey", getMeta("hub-supabase-anon-key", ""))),
    youtubeApiKey:  getParam("youtubeApiKey",  getStored("youtubeApiKey",  getMeta("hub-youtube-api-key", ""))),
    gumroadToken:   getParam("gumroadToken",   getStored("gumroadToken",   getMeta("hub-gumroad-token",   ""))),
    githubCacheTtlMs: 300000,
    socialCacheTtlMs: 600000,
  };
}
