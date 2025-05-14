import arg from "arg";
import { staticAssetServeFactory } from "./src/serve";
import pino, { type Level } from "pino";
import type { Server } from "bun";

const args = arg({
    // Types
    '--help': Boolean,
    '--version': Boolean,
    '--verbose': arg.COUNT, // Counts the number of times --verbose is passed
    '--static': Boolean,
    '--immutable': Boolean,
    '--cache': Boolean,
    '--dir': String,


    // Aliases
    '-v': '--verbose',
    '-d': '--dir'
});

let loglevel: Level;

switch (args['--verbose']) {
    case 1:
        loglevel = 'info';
        break;
    case 2:
        loglevel = 'debug';
        break;
    case 3:
        loglevel = 'trace';
        break;
    default:
        loglevel = 'warn';
        break;
}

let transport: pino.LoggerOptions['transport'];

export const logger = pino({
    level: loglevel,
    transport
});


if (args["--dir"] === undefined || args["--dir"].length === 0) {
    throw new Error("Directory must be specified");
}

async function requestLogWrapper(req: Request, server: Server, func: (req: Request) => Promise<Response>): Promise<Response> {
    logger.info({
        req: {
            method: req.method,
            url: req.url,
            headers: Object.fromEntries(req.headers),
            remoteAddress: server.requestIP,
    } }, "new request");
    const start = performance.now();
    const res = await func(req);
    logger.info({
        res: {
            statusCode: res.status,
            headers: Object.fromEntries(req.headers),
    },
    responseTime: performance.now() - start,
}, "request complete");
    return res;

}

const directory = args["--dir"]
const serverFunc = staticAssetServeFactory(directory);
console.log("starting server for directory", directory);
Bun.serve({
    routes:{
        "/health": new Response("OK"),
    },
    async fetch(req, server) {
        return await requestLogWrapper(req, server, serverFunc);
      },
      error(error) {
          if (error.code === "ENOENT") {
              return new Response('no such file or directory', {
                  status: 404,
                  headers: {
                      "Content-Type": "text/plain",
                  },
              });
          }
          logger.error({err: error}, "err");
          return new Response(`Internal Error: ${error.message}`, {
              status: 500,
              headers: {
                  "Content-Type": "text/plain",
              },
          });
      },
});