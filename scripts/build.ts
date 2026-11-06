import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';

const SITE_URL = 'https://omerfuyar.github.io';

const ROOT = join(import.meta.dirname, '..');
const SITE_DIR = join(ROOT, 'site');
const POSTS_DIR = join(ROOT, 'posts');
const TEMPLATES_DIR = join(ROOT, 'templates');
export const OUT_DIR = join(ROOT, 'dist');

interface Post {
    id: string;      // The name of the file without .md, used in the URL
    title: string;   // The human-readable title to show in list and page
    summary: string; // A short summary to show in list and meta description
    date: string;    // The date to show, also used for sorting (YYYY-MM-DD)
    lang: string;    // The language of the post, defaults to "en"
    html: string;    // The rendered markdown body
}

export function build(): void {
    rmSync(OUT_DIR, { recursive: true, force: true });
    cpSync(SITE_DIR, OUT_DIR, { recursive: true });

    const posts = readPosts();
    const postTemplate = readFileSync(join(TEMPLATES_DIR, 'post.html'), 'utf8');
    const blogTemplate = readFileSync(join(TEMPLATES_DIR, 'blog.html'), 'utf8');

    for (const post of posts) {
        writePage(`blog/${post.id}/index.html`, render(postTemplate, {
            lang: post.lang,
            title: escapeHtml(post.title),
            description: escapeHtml(post.summary),
            url: `${SITE_URL}/blog/${post.id}/`,
            date: escapeHtml(post.date),
            content: post.html,
        }));
    }

    const cards = posts.map(post => `
            <a href="/blog/${post.id}/" class="card">
                <h2 class="title">${escapeHtml(post.title)}</h2>
                <p class="text">${escapeHtml(post.summary)}</p>
                <p class="subtitle">${escapeHtml(post.date)}</p>
            </a>`).join('');

    writePage('blog/index.html', render(blogTemplate, {
        url: `${SITE_URL}/blog/`,
        posts: cards || '<p class="text">There are no posts yet.</p>',
    }));

    const urls = ['/', '/profile/', '/blog/', ...posts.map(post => `/blog/${post.id}/`)];
    writePage('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `    <url><loc>${SITE_URL}${url}</loc></url>`).join('\n')}
</urlset>
`);

    console.log(`Built ${posts.length} post(s) into dist/`);
}

function readPosts(): Post[] {
    return readdirSync(POSTS_DIR)
        .filter(file => file.endsWith('.md'))
        .map(file => parsePost(file.slice(0, -'.md'.length), readFileSync(join(POSTS_DIR, file), 'utf8')))
        .sort((a, b) => b.date.localeCompare(a.date));
}

// Posts start with a front matter block of "key: value" lines between "---" lines.
function parsePost(id: string, source: string): Post {
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source);

    if (!match) {
        throw new Error(`posts/${id}.md: missing front matter`);
    }

    const meta: Record<string, string> = {};

    for (const line of match[1]!.split(/\r?\n/)) {
        const separator = line.indexOf(':');

        if (separator !== -1) {
            meta[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
        }
    }

    for (const key of ['title', 'summary', 'date']) {
        if (!meta[key]) {
            throw new Error(`posts/${id}.md: missing "${key}" in front matter`);
        }
    }

    return {
        id,
        title: meta['title']!,
        summary: meta['summary']!,
        date: meta['date']!,
        lang: meta['lang'] || 'en',
        html: marked.parse(source.slice(match[0].length), { async: false }),
    };
}

// Replaces {{key}} placeholders in a single pass, so inserted values are never re-scanned.
function render(template: string, values: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
        const value = values[key];

        if (value === undefined) {
            throw new Error(`Template placeholder {{${key}}} has no value`);
        }

        return value;
    });
}

function writePage(path: string, content: string): void {
    const fullPath = join(OUT_DIR, path);
    mkdirSync(join(fullPath, '..'), { recursive: true });
    writeFileSync(fullPath, content);
}

function escapeHtml(text: string): string {
    return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

if (import.meta.main) {
    build();
}
