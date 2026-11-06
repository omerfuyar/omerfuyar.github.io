import { watch } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer, type ServerResponse } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { build, OUT_DIR } from './build.ts';

const PORT = Number(process.env['PORT'] ?? 5173);
const ROOT = join(import.meta.dirname, '..');
const WATCHED_DIRS = ['site', 'posts', 'templates'];

const CONTENT_TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
};

// Injected into every HTML page in dev only, reloads the page after a rebuild.
const RELOAD_SCRIPT = `<script>new EventSource('/__reload').onmessage = () => location.reload();</script>`;
const reloadClients = new Set<ServerResponse>();

build();

let rebuildTimer: NodeJS.Timeout | undefined;

for (const dir of WATCHED_DIRS) {
    watch(join(ROOT, dir), { recursive: true }, () => {
        clearTimeout(rebuildTimer);
        rebuildTimer = setTimeout(() => {
            try {
                build();
                for (const client of reloadClients) {
                    client.write('data: reload\n\n');
                }
            } catch (error) {
                console.error(error);
            }
        }, 100);
    });
}

createServer(async (req, res) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');

    if (pathname === '/__reload') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
        reloadClients.add(res);
        req.on('close', () => reloadClients.delete(res));
        return;
    }

    let status = 200;
    let path = join(OUT_DIR, normalize(decodeURIComponent(pathname)));

    try {
        if (!path.startsWith(OUT_DIR)) {
            throw new Error('Path outside of dist/');
        }

        if ((await stat(path)).isDirectory()) {
            path = join(path, 'index.html');
        }

        await stat(path);
    } catch {
        status = 404;
        path = join(OUT_DIR, '404.html');
    }

    const type = CONTENT_TYPES[extname(path)] ?? 'application/octet-stream';
    let body: Buffer | string = await readFile(path);

    if (type.startsWith('text/html')) {
        body = body.toString().replace('</body>', `${RELOAD_SCRIPT}</body>`);
    }

    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(body);
}).listen(PORT, () => {
    console.log(`Dev server running at http://localhost:${PORT}/`);
});
