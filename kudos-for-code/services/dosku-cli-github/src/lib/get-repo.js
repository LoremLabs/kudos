export function getRepository(context) {
  if (context.input[1] && /^[\w.-]+\/[\w.-]+$/.test(context.input[1])) {
    return context.input[1];
  }

  if (context.config.get("kudos.context")) {
    let json;
    try {
      json = JSON.parse(context.config.get("kudos.context"));
    } catch (error) {
      throw new Error("Invalid JSON in context");
    }

    const repositoryUrl = json?.code?.repositoryUrl;
    if (
      repositoryUrl &&
      typeof repositoryUrl === "string" &&
      repositoryUrl.startsWith("https://github.com")
    ) {
      try {
        const url = new URL(repositoryUrl);
        return url.pathname.slice(1).split("/").slice(0, 2).join("/");
      } catch (error) {
        throw new Error("Invalid repositoryUrl in context");
      }
    }
  }
}
