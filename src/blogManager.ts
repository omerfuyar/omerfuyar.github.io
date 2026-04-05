import * as md from 'marked';

interface BlogPost {
    id: string;      // The name of the file
    title: string;   // The human-readable title to show in List
    date: string;    // The date to show in List
}

const blogListDiv = document.getElementById('blog-list')!;
const blogContentDiv = document.getElementById('blog-content')!;

const urlParams = new URLSearchParams(window.location.search);
const requestedPostId = urlParams.get('post');

const HTML_WAIT_POSTS = `<p class="message-wait">Loading posts...</p>`;
const HTML_WAIT_POST = `<p class="message-wait">Loading post...</p>`;
const HTML_ERROR_POSTS = `<p class="message-error">Failed to load the index list.</p>`;
const HTML_ERROR_POST = `<p class="message-error">Failed to load the post.</p>`;

if (requestedPostId) {
    await renderPost(requestedPostId);
}
else {
    await renderPostList();
}

async function renderPost(postId: string) {
    blogListDiv.style.display = 'none';
    blogContentDiv.style.display = 'block';
    blogContentDiv.innerHTML = HTML_WAIT_POST;

    const response = await fetch(`/posts/${postId}.md`);

    if (!response.ok) {
        console.error(`Could not fetch post: ${postId} (${response.status} ${response.statusText})`);
        blogContentDiv.innerHTML = HTML_ERROR_POST;
        return;
    }

    const htmlContent = await md.parse(await response.text());

    if (htmlContent) {
        blogContentDiv.innerHTML = htmlContent;
    } else {
        blogContentDiv.innerHTML = HTML_ERROR_POST;
    }
}

async function renderPostList() {
    blogContentDiv.style.display = 'none';
    blogListDiv.style.display = 'block';
    blogListDiv.innerHTML = HTML_WAIT_POSTS;

    const responseReceipt = await fetch('/posts/index.json');

    if (!responseReceipt.ok) {
        console.error(`Could not fetch post index: (${responseReceipt.status} ${responseReceipt.statusText})`);
        blogListDiv.innerHTML = HTML_ERROR_POSTS;
        return;
    }

    const allPosts = await responseReceipt.json() as BlogPost[];

    blogListDiv.innerHTML = '';

    for (const post of allPosts) {
        const link = document.createElement('a');

        link.href = `?post=${post.id}`;

        link.innerHTML = `<strong>${post.title}</strong> - ${post.date}`;

        link.className = 'blog-list-item';

        blogListDiv.appendChild(link);
        blogListDiv.appendChild(document.createElement('br'));
        blogListDiv.appendChild(document.createElement('br'));
    }
}