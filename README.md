# bun-static-file-server

A very simple static file server in the Bun JS runtime. Absolutely not recommended for usage.

Supports if-none-match and if-modified-since 304 returns and provides standard weak ETag headers.

Run it with

`bun run ./index.ts --dir ./test`

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.12. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
