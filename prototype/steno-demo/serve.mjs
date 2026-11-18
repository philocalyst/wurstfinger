// Serves the demo. No dependencies.
//
//   node serve.mjs [port]
//
// It listens on localhost unless HOST says otherwise. HOST may name several
// addresses, separated by commas, to serve on each of them.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] || process.env.PORT || 5273);
const hosts = (process.env.HOST || '127.0.0.1').split(',').map(h => h.trim()).filter(Boolean);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.png': 'image/png', '.md': 'text/markdown; charset=utf-8',
};

const serve = (req, res) => {
  const url = new URL(req.url, 'http://x');
  let file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); return; }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  });
};

for (const host of hosts) {
  http.createServer(serve).listen(port, host, () => console.log(`steno demo on http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/`));
}
