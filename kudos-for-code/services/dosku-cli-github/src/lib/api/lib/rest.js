// @ts-check
import fetch from "node-fetch";

/**
 * Fetch data with GitHub REST API
 * @param {string} endpoint
 * @param {string} [token]
 * @param {number} [pages]
 * @param {string} [apiVersion]
 */
export async function* requestData(
  endpoint,
  token,
  pages = 30,
  apiVersion = "2022-11-28"
) {
  /** @type {string | null} */
  let url = endpoint;
  do {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": apiVersion,
        ...(token && { Authorization: `token ${token}` }),
      },
    });

    if (!response.ok) {
      const { status: code, statusText: text } = response;
      throw new Error(`Failed to fetch ${url}. ${code} ${text}`);
    }

    const result = await response.json();
    yield { url, result };

    url = nextPage(response.headers.get("link") || "");
  } while (url !== null && --pages > 0);

  if (pages === 0 && url !== null) {
    const msg = `[gh/utils/rest@requestData]: Some pages were skipped.
    <${endpoint}>
      ➡ <${url}>
    ℹ Specify a larger value for \`pages\` argument.`;
    console.warn(msg);
  }
}

/**
 * @param {string} link link header value
 */
function nextPage(link) {
  const m = link.match(/<([^>]+)>\s*;\s*rel="next"/);
  return m ? m[1] : null;
}
