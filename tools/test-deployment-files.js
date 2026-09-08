const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const dockerfile = read("Dockerfile");
const compose = read("docker-compose.yml");
const nginx = read(path.join("deploy", "nginx.conf"));
const index = read(path.join("public", "index.html"));
const app = read(path.join("public", "assets", "app.js"));

assert.match(dockerfile, /^FROM nginx:1\.27-alpine/m);
assert.match(dockerfile, /COPY public\/ \/usr\/share\/nginx\/html\//);
assert.match(dockerfile, /HEALTHCHECK[\s\S]*\/healthz/);
assert.match(compose, /\$\{DOCS_PORT:-8080\}:80/);
assert.match(compose, /read_only: true/);
assert.match(nginx, /server_name docs\.xi-ai\.cn;/);
assert.doesNotMatch(nginx, /server_name api\.xi-ai\.cn;/);
assert.match(nginx, /location = \/healthz/);
assert.match(nginx, /try_files \$uri \$uri\/ \/index\.html;/);
assert.doesNotMatch(index, /mcp\.figma\.com\/mcp\/html-to-design\/capture\.js/);
assert.match(app, /figmaCapture/);

console.log("deployment file contract passed");
