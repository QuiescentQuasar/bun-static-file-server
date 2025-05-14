import path from "node:path";
import { file } from 'bun';


const PRECOMPRESSED_CONTENT_TYPES: Record<string, string> = {
    "html": "text/html",
    "js": "application/javascript",
    "json": "application/json",
    "css": "text/css",
    "svg": "image/svg+xml",
    "xml": "application/xml",
    "wasm": "application/wasm",
}

// Get the file from the path. returns a precompressed file if it exists and is accepted
async function getFile(path: string, brotli: boolean, gzip: boolean) {
    // check for precompressed files
    // return a precompressed file if exists and is accepted
    const brFile = file(path + ".br");
    const gzFile = file(path + ".gz");
    if (brotli && await brFile.exists()) {
        return brFile;
    } else if (gzip && await brFile.exists()) {
        return gzFile;
    } else {
        return file(path);
    }
}

interface Options {
    etag?: boolean | 'strong',
    // strongEtag?: boolean,
    brotli?: boolean,
    gzip?: boolean
}

export function staticAssetServeFactory(dir: string, options?: Options = {}) {
    return serveAsset.bind(null, dir)
}

export async function serveAsset(folderPath: string, req: Request) {
    try {
        const pathname = new URL(req.url).pathname;
        const filepath = path.join(folderPath, pathname);

        const acceptedEncoding = req.headers.get("accept-encoding") || "";

        const brotli = acceptedEncoding.includes("br") || acceptedEncoding.includes("brotli");
        const gzip = acceptedEncoding.includes("gzip");

        const file = await getFile(filepath, brotli, gzip);

        const eTag = `W/"${file.size}-${file.lastModified}"`;

        if (req.headers.get('if-none-match') === eTag) {
            return new Response(null, {
                status: 304
            });
        }

        if (req.headers.get('if-modified-since') !== null) {
            // return 304 if the file has not been modified since the if-modified-since date
            const ifModifiedSince = new Date(req.headers.get('if-modified-since') || 0);
            if (ifModifiedSince.getTime() >= file.lastModified) {
                return new Response(null, {
                    status: 304
                });
            }
        }

        const headers = new Headers({
            "ETag": eTag,
            "last-modified": new Date(file.lastModified).toUTCString(),
            "vary": "accept-encoding"
        });

        if (file.name?.slice(-3) === ".br") {
            headers.set("content-encoding", "br");
            // use the file extension that occurs before the .br
            headers.set("content-type", PRECOMPRESSED_CONTENT_TYPES[file.name?.slice(0, file.name.length - 3).split('.').pop() ?? ''] || "application/octet-stream");
        } else if (file.name?.slice(-3) === ".gz") {
            headers.set("content-encoding", 'gzip');
            headers.set("content-type", PRECOMPRESSED_CONTENT_TYPES[file.name?.slice(0, file.name.length - 3).split('.').pop() ?? ''] || "application/octet-stream");
        }

        return new Response(file, {
            headers,
            status: 200,
        });
    } catch (e) {
        console.error(e);

        return Response.json(
            {
                code: 500,
                message: "Encountered an error serving static content",
            },
            { status: 500 },
        );
    }
}
