import dnslink from "@dnslink/js";
const { resolve } = dnslink;

// const log = console.log;

// taskExistsInNamespace: Check if task exists in namespace
const taskExistsInNamespace = async (task, namespace) => {
  // lookup task in ipns, see if it exists
  const linkUrl = `${task}.${namespace}`;

  let result;
  try {
    //      result = await resolve('dnslink.dev/abcd?foo=bar', {
    result = await resolve(linkUrl, {
      timeout: 2000, // 2 seconds
      dns: true,
      // lookupTXT: {
      //     retries: 3, // (optional, default=5)
      //     endpoints: 'dns'
      // }
    });
  } catch (err) {
    // Errors provided by DNS server
    // console.log({ err });
    return [false];
  }
  const { links } = result;

  if (links.ipfs && links.ipfs.length > 0) {
    return [true, links.ipfs[0]]; // return the ipfs hash
  } else {
    return [false];
  }
};

// find the best namespace to use for the task
const bestNamespace = async (namespaces, task) => {
  // foreach namespace,
  // lookup app path in ipns
  // if found, go get app definition

  let matched = {};
  for await (const namespace of namespaces) {
    const namespaceStatus = await taskExistsInNamespace(task, namespace);
    if (!matched.namespace && namespaceStatus[0]) {
      matched.namespace = namespace;
      matched.ipfs = namespaceStatus[1];
      return matched;
    }
  }
  return matched;
};

export { bestNamespace, taskExistsInNamespace };
