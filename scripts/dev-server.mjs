import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const host = "127.0.0.1";
const port = Number(process.env.PORT || 5173);
const root = join(process.cwd(), "frontend");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function resolvePath(url) {
  const pathname = new URL(url, `http://${host}:${port}`).pathname;
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(root, requestedPath));

  if (!filePath.startsWith(root)) {
    return join(root, "index.html");
  }

  return filePath;
}

const server = createServer(async (req, res) => {
  try {
    const filePath = resolvePath(req.url || "/");
    const body = await readFile(filePath);
    const contentType = contentTypes[extname(filePath)] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(port, host, () => {
  console.log(`StudyHub frontend running at http://${host}:${port}`);
});
