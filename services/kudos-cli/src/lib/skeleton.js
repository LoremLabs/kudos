// example ipfs command file

const skeleton = {
  name: "mycmd", // name of command (e.g. create) [no spaces]
  request: {
    endpoint: "https://your.api.here/path/here", // api endpoint https:// .. grpc:// ..
  },
  meta: {
    contact: "", // contact email [optional]
    description: "My new cli command", // description of command
  },
  v: 1, // version of skeleton file
};

export default skeleton;
