// @ts-check
import parseAuthor from "parse-author";
import { requestData } from "./lib/rest.js";

/**
 * @typedef {{ login: string } | { email: string }} Author
 * @param {string} repo owner/repo-name
 * @param {string} commitRange sha_1...sha_2
 * @param {string} [ghToken]
 */
export async function getCommits(repo, commitRange, ghToken) {
  const result = [];

  const endpoint = getAPIURL(repo, commitRange);
  for await (const res of requestData(endpoint, ghToken)) {
    for (const { sha, commit, author } of res.result.commits) {
      result.push({
        sha: /** @type {string} */ (sha),
        author: {
          login: /** @type {string} */ (author.login),
          name: /** @type {string} */ (commit.author.name),
          email: /** @type {string} */ (commit.author.email),
        },
        coAuthors: getCommitCoAuthors(commit.message),
      });
    }
  }
  return result;
}

/**
 * @param {string} repo owner/name
 * @param {string} commitRange sha_1...sha_2
 */
function getAPIURL(repo, commitRange) {
  return new URL(`https://api.github.com/repos/${repo}/compare/${commitRange}`)
    .href;
}

/**
 * @param {string} commitMessage
 */
function getCommitCoAuthors(commitMessage) {
  const coAuthors = [];
  const coAuthorRegex = /^co-authored-by: (.+)$/gim;
  const matches = commitMessage.matchAll(coAuthorRegex);
  for (const match of matches) {
    const { email, name } = parseAuthor(match[1]);
    if (!email) continue;
    coAuthors.push({ email, name });
  }
  return coAuthors;
}
