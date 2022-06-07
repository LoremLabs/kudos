import chalk from "chalk";
import { File, Web3Storage } from "web3.storage";
// import * as ipfs from "ipfs-http-client";

const getFileIpfs = async ({ token, cid }) => {
  if (!token) {
    console.log(
      chalk.red("A token is needed. You can create one on https://web3.storage")
    );

    process.exit(1);
  }

  // Retrieve from IPFS
  const storage = new Web3Storage({ token });
  const res = await storage.get(cid);
  const files = await res.files(); // Promise<Web3File[]>

  // TODO: how to get content directly?
  let commandJson;

  for (const file of files) {
    if (file.name === "command.json") {
      // convert the file to its contents
      // NB: This wasn't in any IPFS documentation I found. It seems IPFS 101,
      const buffer = await file.arrayBuffer();
      const td = new TextDecoder();
      commandJson = td.decode(buffer);
    }
  }

  if (!commandJson || !commandJson.length) {
    console.log(chalk.red("No command.json found in IPFS"));
    process.exit(1);
  }

  return commandJson;
};

const uploadIpfsWeb3Storage = async ({ token, payload }) => {
  // console.log('uploadIpfsWeb3Storage', token, payload.toString());
  if (!token) {
    console.log(
      chalk.red("A token is needed. You can create one on https://web3.storage")
    );

    process.exit(1);
  }

  // Upload to IPFS
  // Return the IPFS hash of the data
  const storage = new Web3Storage({ token });
  const file = packageCommand({ commandJson: payload });
  const cid = await storage.put(file);

  return { cid };
};

const packageCommand = ({ commandJson }) => {
  return [new File([commandJson], "/command.json")];
};

export { getFileIpfs, uploadIpfsWeb3Storage };
