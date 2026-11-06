# Guide

How to run, edit, and deploy this site.

## Requirements

- [Node.js](https://nodejs.org/) 26 or newer (the exact version used in CI is in `.nvmrc`)

Node runs the TypeScript build scripts directly by stripping their types, so there is no compile step and no bundler.

## Getting Started

```sh
npm install      # install dependencies (marked, and @types/node for the editor)
npm run dev      # build, serve on http://localhost:5173 and rebuild + reload on changes
npm run build    # build the site into ./dist
```

Set `PORT` to use a different port, e.g. `PORT=3000 npm run dev`.

## Project Structure

```text
site/                 Copied as-is into dist/
  index.html          Home page (split view: Blog / Profile)
  profile/index.html  Profile page
  404.html            Shown by GitHub Pages for unknown URLs
  favicon.svg
  styles/             One stylesheet per page, all import index.css
  images/             Images (AVIF)
posts/
  <post-id>.md        Blog posts in Markdown with front matter
templates/
  blog.html           Blog list page
  post.html           Single post page
scripts/
  build.ts            Builds dist/ from site/, posts/ and templates/
  dev.ts              Local dev server with live reload
.github/workflows/
  static.yml          GitHub Pages deployment workflow
```

The output URLs are:

| Source                    | URL                |
| ------------------------- | ------------------ |
| `site/index.html`         | `/`                |
| `site/profile/index.html` | `/profile/`        |
| `templates/blog.html`     | `/blog/`           |
| `posts/<post-id>.md`      | `/blog/<post-id>/` |

The build also writes `/sitemap.xml` with every page.

## Writing a Blog Post

1. Create a Markdown file in `posts/`, e.g. `posts/my-post.md`.
   The file name (without `.md`) is the post's **id** and becomes its URL: `/blog/my-post/`.

2. Start the file with a front matter block:

   ```md
   ---
   title: My Post
   summary: A short summary shown on the blog list.
   date: 2026-11-06
   lang: en
   ---

   # My Post

   Post content...
   ```

    | Field     | Required | Description                                                   |
    | --------- | -------- | ------------------------------------------------------------- |
    | `title`   | Yes      | Title on the post card, browser tab and link previews         |
    | `summary` | Yes      | Text on the post card and the page's meta description         |
    | `date`    | Yes      | `YYYY-MM-DD`, shown as written; posts are sorted newest first |
    | `lang`    | No       | Language of the post (`en`, `tr`, ...), defaults to `en`      |

   Each line is `key: value`; everything after the first `:` is the value, so no quotes are needed.

3. Run `npm run dev` and open `http://localhost:5173/blog/` to check it.

Posts are rendered with [marked](https://marked.js.org/) at build time, so standard Markdown (headings, emphasis, lists, block quotes, code blocks, tables, images, links) is supported. Put images in `site/images/` and reference them as `/images/<name>`.

To remove a post, delete its `.md` file.

## Adding a New Page

Create it inside `site/` as `site/<name>/index.html` so it is served at `/<name>/`. Copy the `<head>` of an existing page so it keeps the viewport, description, Open Graph and font tags. If it should be listed in the sitemap, add its URL to the `urls` list in `scripts/build.ts`.

## Images

Use AVIF for photos; it is about a third of the size of the equivalent JPEG. With ImageMagick:

```sh
magick photo.jpg -quality 50 site/images/photo.avif
```

## Deployment

Pushing to the `main` branch triggers the GitHub Actions workflow in `.github/workflows/static.yml`, which sets up the Node version from `.nvmrc`, runs `npm ci` and `npm run build`, and publishes `./dist` to GitHub Pages. It can also be started manually from the **Actions** tab.

Run `npm run build` locally before pushing to catch errors early. `npm ci` installs exactly what is in `package-lock.json`, so commit that file whenever dependencies change.

## Type Checking

TypeScript is not installed as a dependency. VS Code type-checks `scripts/` with its built-in TypeScript using `tsconfig.json`. To check from the command line without adding a dependency:

```sh
npx -p typescript tsc --noEmit
```
