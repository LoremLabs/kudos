// import chalk from "chalk";

export const normalizeIdentifier = (
  rawIdentifier = "",
  { DEFAULT_SCOPE = "twitter" }
) => {
  // simple version for now, could get more complicated
  // we want another layer to parse and remove @
  // we should return a prefixed (scoped) identifier in lowercase, delim with a :

  // rawIdentifier may contain a SCOPE:IDENTIFIER
  // if not, we will use the default scope
  // if the scope is not recognized, we will throw an error

  // check if rawIdentifier contains a scope
  const scopeDelimiter = ":";
  const scopeDelimiterIndex = rawIdentifier.indexOf(scopeDelimiter);
  let scope;
  let identifier;
  if (scopeDelimiterIndex > -1) {
    // we have a scope
    scope = rawIdentifier.slice(0, scopeDelimiterIndex);
    identifier = rawIdentifier.slice(scopeDelimiterIndex + 1);
  } else {
    // we do not have a scope
    scope = DEFAULT_SCOPE;
    identifier = rawIdentifier;
  }

  if (identifier.length < 1) {
    throw new Error("identifier not found");
  }
  if (scope.indexOf("@") !== -1) {
    throw new Error("scope should not contain @");
  }
  if (scope.match(/\s/)) {
    throw new Error("scope should not contain whitespace");
  }

  // scope should not contain a :, but value could?

  return `${scope}:${identifier}`;
};

export const getIdentifierFromHattip = ({ attribution, context }) => {
  // an identifier is something we can validate
  // an attribution is something we can use to construct an identifier
  // not all attributions will be able to return an identifier

  // identifiers are of the form: SCOPE:IDENTIFIER - ex email:matt@mankins.net

  // these are ordered by preference
  if (attribution.identifier) {
    return attribution.identifier; // explicitly set
  }
  if (attribution["github.url"]) {
    return `repo:${attribution["github.url"]}`;
  }
  if (attribution["github.username"]) {
    return `github:${attribution["github.username"]}`;
  }
  if (attribution.email) {
    return `email:${attribution.email}`;
  }
  if (attribution.url) {
    return `url:${attribution.url}`;
  }
  if (attribution.web) {
    return `url:${attribution.web}`;
  }
  if (attribution["twitter.username"]) {
    return `twitter:${attribution["twitter.username"]}`;
  }
  if (attribution["reddit.username"]) {
    return `reddit:${attribution["reddit.username"]}`;
  }
  if (context.repository?.url) {
    return `repo:${context.repository?.url}`;
  }
  if (context.thing) {
    return `thing:${context.thing}`;
  }
  if (attribution.thing) {
    return `thing:${attribution.thing}`;
  }
  if (attribution.name) {
    return `name:${attribution.name}`;
  }
  if (attribution.organization) {
    return `name:${attribution.organization}`;
  }
  if (attribution.company) {
    return `name:${attribution.company}`;
  }

  return;
};
