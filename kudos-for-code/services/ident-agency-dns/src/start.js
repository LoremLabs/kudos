import http from "http";

import chalk from "chalk";
import dns2 from "dns2";

import handle from "./dns-resolver.js";

const log = console.log;

const start = ({ flags }) => {
  const { port, host, pingPort } = flags;

  const server = dns2.createServer({
    udp: true,
    handle: (request, send) => handle(request, send, { flags }),
  });

  server.on("request", (request) => {
    flags.debug && log(request.header.id, request.questions[0]);
  });

  server.on("listening", (result) => {
    log(chalk.cyan("ident-agency-dns"), result);
  });

  server.listen({
    host,
    udp: port,
    tcp: port,
  });

  // setup ping http server
  const pingServer = http.createServer((req, res) => {
    log("ping", req.url);
    res.writeHead(200);
    res.end("pong");
  });
  pingServer.on("listening", () => {
    log(chalk.cyan("ident-agency-dns ping server started on port"), pingPort);
  });

  pingServer.listen(pingPort);

  (async () => {
    const closed = new Promise((resolve) => process.on("SIGINT", resolve));
    await closed;
    process.stdout.write("\n");
    await server.close();
    pingServer.close();
    log(chalk.cyan("ident-agency-dns closed"));
  })();
};

export default start;
