// Assembles a Vercel Build Output API (v3) directory from the TanStack Start
// build output. This version of TanStack Start has no Vercel/Nitro preset, so
// `vite build` only emits a generic fetch-handler server (dist/server/server.js)
// plus client assets (dist/client). Vercel has no routing glue for that and
// 404s every route. Here we wrap the SSR fetch handler in a Node serverless
// function and serve dist/client statically via the filesystem handler.
//
// No-ops off Vercel: local builds run the Cloudflare plugin and emit a
// different layout (dist/server/index.js + wrangler.json), so there is nothing
// to assemble.
import { cp, mkdir, writeFile, rm, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { nodeFileTrace } from "@vercel/nft";

if (!process.env.VERCEL) {
  console.log("[vercel-build] not on Vercel, skipping Build Output API assembly");
  process.exit(0);
}

// Node serverless function: adapt Node req/res <-> Web Request/Response and
// delegate to the TanStack Start SSR fetch handler. The SSR bundle is copied to
// dist/server/ inside the function (preserving its build layout) and its npm
// dependencies live in node_modules/ alongside it, so bare imports resolve.
const FUNCTION_ENTRY = `import server from "./dist/server/server.js";

export default async function handler(req, res) {
  try {
    const response = await server.fetch(toWebRequest(req), process.env, {});
    await sendWebResponse(res, response);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.statusCode = 500;
    res.end("Internal Server Error");
  }
}

function toWebRequest(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const proto = req.headers["x-forwarded-proto"] || "https";
  const url = proto + "://" + host + req.url;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else if (value != null) {
      headers.set(key, value);
    }
  }

  const method = req.method || "GET";
  const hasBody = method !== "GET" && method !== "HEAD";

  return new Request(url, {
    method,
    headers,
    body: hasBody ? req : undefined,
    duplex: hasBody ? "half" : undefined,
  });
}

async function sendWebResponse(res, response) {
  res.statusCode = response.status;

  // Preserve multiple Set-Cookie headers (Headers.forEach collapses them).
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    res.setHeader(key, value);
  });
  if (setCookies.length) res.setHeader("set-cookie", setCookies);

  if (!response.body) {
    res.end();
    return;
  }

  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}
`;

const root = process.cwd();
const distClient = path.join(root, "dist", "client");
const distServer = path.join(root, "dist", "server");

if (!existsSync(path.join(distServer, "server.js"))) {
  throw new Error(
    "[vercel-build] dist/server/server.js not found — expected the Vercel " +
      "(non-Cloudflare) build output. Did `vite build` run with VERCEL set?",
  );
}

const outDir = path.join(root, ".vercel", "output");
const staticDir = path.join(outDir, "static");
const fnDir = path.join(outDir, "functions", "index.func");

await rm(outDir, { recursive: true, force: true });
await mkdir(staticDir, { recursive: true });
await mkdir(fnDir, { recursive: true });

// Client assets are served statically; the filesystem handler matches these
// before falling through to the SSR function.
await cp(distClient, staticDir, { recursive: true });

// The SSR build externalizes all npm dependencies (standard Vite SSR), so the
// function needs both the dist/server bundle AND the exact set of node_modules
// files it imports. Trace from every server chunk (server.js dynamically
// imports its assets/*.js) and copy the resulting file list, preserving each
// path relative to the project root so node_modules resolution works.
const serverEntries = (await readdir(path.join(distServer, "assets")))
  .filter((f) => f.endsWith(".js"))
  .map((f) => path.join("dist", "server", "assets", f));
serverEntries.push(path.join("dist", "server", "server.js"));

const { fileList } = await nodeFileTrace(serverEntries, { base: root });

for (const file of fileList) {
  await cp(path.join(root, file), path.join(fnDir, file), { recursive: true });
}
console.log(`[vercel-build] traced ${fileList.size} files into the function`);

await writeFile(path.join(fnDir, "index.mjs"), FUNCTION_ENTRY);

// The dist/server/*.js files use ESM syntax but have a .js extension and no
// package.json of their own. Vercel deploys the function in isolation with no
// parent package.json, so Node would default .js to CommonJS and throw on the
// `export`/`import` syntax. Mark the function root as ESM (packages under
// node_modules keep their own package.json "type", so this only affects our
// emitted bundle files).
await writeFile(
  path.join(fnDir, "package.json"),
  JSON.stringify({ type: "module" }, null, 2),
);

await writeFile(
  path.join(fnDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
    },
    null,
    2,
  ),
);

await writeFile(
  path.join(outDir, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Serve any matching file in static/ first (hashed assets, robots.txt),
        // then hand everything else to the SSR function.
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index" },
      ],
    },
    null,
    2,
  ),
);

console.log("[vercel-build] assembled .vercel/output (Build Output API v3)");
