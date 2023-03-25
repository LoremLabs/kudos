// import chalk from "chalk";

const normalizeIdentifier = (
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

export { normalizeIdentifier };
