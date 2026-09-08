const fs = require("fs");
const http = require("http");
const path = require("path");

const port = Number(process.argv[2] || 5173);
const root = path.resolve(process.argv[3] || "public");

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let file = path.join(root, decodeURIComponent(url.pathname));
  if (url.pathname.endsWith("/")) file = path.join(file, "index.html");
  const resolved = path.resolve(file);
  if (!resolved.startsWith(root)) return send(res, 403, "Forbidden");

  fs.stat(resolved, (statError, stat) => {
    if (statError || !stat.isFile()) return send(res, 404, "Not found");
    const ext = path.extname(resolved).toLowerCase();
    res.writeHead(200, {
      "content-type": types[ext] || "application/octet-stream",
      "cache-control": "no-store",
    });
    fs.createReadStream(resolved).pipe(res);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}/`);
});
