// @ts-check
import { requestData } from "./lib/rest.js";

/**
 * @typedef {{ login: string; contributions: number; }} Contributor
 * @param {string} repo owner/repo-name
 * @param {string} [ghToken]
 */
export async function getContributors(repo, ghToken) {
  /** @type {Contributor[]} */
  const allContributers = [];

  const endpoint = getAPIURL(repo);
  for await (const { result } of requestData(endpoint, ghToken)) {
    for (const contrib of /** @type {Contributor[]} */ (result)) {
      const { login, contributions } = contrib;
      const contributor = { login, contributions };
      allContributers.push(contributor);
    }
  }
  return allContributers;
}

/**
 * @param {string} repo owner/name
 */
function getAPIURL(repo) {
  return new URL(`https://api.github.com/repos/${repo}/contributors`).href;
}
