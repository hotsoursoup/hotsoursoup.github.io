const state = {
    config: null,
    posts: [],
    filters: {
        author: "all",
        tag: "all",
        theme: "all",
        search: ""
    },
    audio: null,
    radioOn: false
};

const els = {
    posts: document.querySelector("#posts"),
    count: document.querySelector("#post-count"),
    authorFilter: document.querySelector("#author-filter"),
    tagFilter: document.querySelector("#tag-filter"),
    themeFilter: document.querySelector("#theme-filter"),
    searchFilter: document.querySelector("#search-filter"),
    clearFilters: document.querySelector("#clear-filters"),
    emptyTemplate: document.querySelector("#empty-state-template"),
    radioButton: document.querySelector("[data-radio-toggle]")
};

async function loadJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Could not load ${path}`);
    }
    return response.json();
}

async function init() {
    try {
        state.config = await loadJson("site.config.json");
        const authorEntries = Object.entries(state.config.authors);
        const postGroups = await Promise.all(
            authorEntries.map(async ([authorId, author]) => {
                const posts = await loadJson(author.postFile);
                return posts
                    .filter((post) => !post.draft)
                    .map((post) => normalizePost(post, authorId, author));
            })
        );

        state.posts = postGroups.flat().sort((a, b) => b.date.localeCompare(a.date));
        state.filters.author = getInitialAuthor(authorEntries);

        buildFilters();
        bindEvents();
        setActiveNav();
        render();
    } catch (error) {
        els.posts.innerHTML = "";
        const box = document.createElement("article");
        box.className = "empty-state";
        box.innerHTML = `<p class="eyebrow">loading error</p><h2>The soup did not simmer.</h2><p>${escapeHtml(error.message)}</p>`;
        els.posts.append(box);
        els.count.textContent = "Could not load posts.";
    }
}

function normalizePost(post, authorId, author) {
    const tags = Array.from(new Set([post.tag, ...(post.tags || [])].filter(Boolean)));
    return {
        ...post,
        authorId,
        authorName: author.displayName,
        authorHandle: author.handle,
        imageFolder: author.imageFolder,
        tags,
        theme: post.theme || "porcelain",
        content: post.content || []
    };
}

function buildFilters() {
    const authors = Object.entries(state.config.authors).map(([id, author]) => ({
        value: id,
        label: author.displayName
    }));
    const tags = [...new Set(state.posts.flatMap((post) => post.tags))].sort();
    const themes = Object.entries(state.config.postThemes).map(([id, theme]) => ({
        value: id,
        label: theme.label
    }));

    fillSelect(els.authorFilter, [{ value: "all", label: "All authors" }, ...authors], state.filters.author);
    fillSelect(els.tagFilter, [{ value: "all", label: "All tags" }, ...tags.map((tag) => ({ value: tag, label: tag }))]);
    fillSelect(els.themeFilter, [{ value: "all", label: "All themes" }, ...themes]);
}

function fillSelect(select, options, selected = "all") {
    select.innerHTML = "";
    options.forEach((option) => {
        const item = document.createElement("option");
        item.value = option.value;
        item.textContent = option.label;
        item.selected = option.value === selected;
        select.append(item);
    });
}

function bindEvents() {
    els.authorFilter.addEventListener("change", () => {
        state.filters.author = els.authorFilter.value;
        setActiveNav();
        render();
    });
    els.tagFilter.addEventListener("change", () => {
        state.filters.tag = els.tagFilter.value;
        render();
    });
    els.themeFilter.addEventListener("change", () => {
        state.filters.theme = els.themeFilter.value;
        render();
    });
    els.searchFilter.addEventListener("input", () => {
        state.filters.search = els.searchFilter.value.trim().toLowerCase();
        render();
    });
    const currentPage = window.location.pathname.split("/").pop();
    const canFilterInPlace = currentPage === "" || currentPage === "index.html";
    document.querySelectorAll("[data-nav-author]").forEach((link) => {
        link.addEventListener("click", (event) => {
            if (!canFilterInPlace) {
                return;
            }

            event.preventDefault();
            setAuthorFilter(link.dataset.navAuthor);
            const url = link.dataset.navAuthor === "all" ? "index.html" : `index.html?author=${link.dataset.navAuthor}`;
            window.history.pushState({}, "", url);
        });
    });
    els.clearFilters.addEventListener("click", () => {
        state.filters = { author: "all", tag: "all", theme: "all", search: "" };
        els.authorFilter.value = "all";
        els.tagFilter.value = "all";
        els.themeFilter.value = "all";
        els.searchFilter.value = "";
        setActiveNav();
        render();
    });
    els.radioButton.addEventListener("click", toggleRadio);
}

function getInitialAuthor(authorEntries) {
    const authors = new Set(authorEntries.map(([authorId]) => authorId));
    const requestedAuthor = new URLSearchParams(window.location.search).get("author");
    const defaultAuthor = document.body.dataset.defaultAuthor || "all";

    if (requestedAuthor === "all" || authors.has(requestedAuthor)) {
        return requestedAuthor;
    }

    return authors.has(defaultAuthor) ? defaultAuthor : "all";
}

function setAuthorFilter(author) {
    state.filters.author = author || "all";
    els.authorFilter.value = state.filters.author;
    setActiveNav();
    render();
}

function setActiveNav() {
    document.querySelectorAll("[data-nav-author]").forEach((link) => {
        link.classList.toggle("active", link.dataset.navAuthor === state.filters.author);
    });
}

function render() {
    const posts = filteredPosts();
    els.posts.innerHTML = "";

    if (!posts.length) {
        els.posts.append(els.emptyTemplate.content.cloneNode(true));
    } else {
        posts.forEach((post) => els.posts.append(renderPost(post)));
    }

    const noun = posts.length === 1 ? "post" : "posts";
    els.count.textContent = `${posts.length} ${noun} glowing on the shelf`;
}

function filteredPosts() {
    return state.posts.filter((post) => {
        const matchesAuthor = state.filters.author === "all" || post.authorId === state.filters.author;
        const matchesTag = state.filters.tag === "all" || post.tags.includes(state.filters.tag);
        const matchesTheme = state.filters.theme === "all" || post.theme === state.filters.theme;
        const matchesSearch = !state.filters.search || searchablePostText(post).includes(state.filters.search);
        return matchesAuthor && matchesTag && matchesTheme && matchesSearch;
    });
}

function searchablePostText(post) {
    const contentText = post.content
        .map((block) => [
            block.text,
            block.caption,
            block.url,
            block.code,
            ...(block.items || []),
            ...(block.images || []).flatMap((image) => [image.alt, image.caption, image.url, image.src])
        ].filter(Boolean).join(" "))
        .join(" ");
    return [post.title, post.date, post.authorName, post.theme, post.tags.join(" "), contentText]
        .join(" ")
        .toLowerCase();
}

function renderPost(post) {
    const theme = state.config.postThemes[post.theme] || state.config.postThemes.porcelain;
    const article = document.createElement("article");
    article.className = "post-card";
    article.style.setProperty("--post-accent", theme.accent);
    article.style.setProperty("--post-paper", theme.paper);
    article.style.setProperty("--post-tint", theme.tint);
    article.style.setProperty("--post-border", theme.border);

    const header = document.createElement("header");
    header.className = "post-header";
    header.innerHTML = `
        <div>
            <p class="post-kicker">${escapeHtml(post.authorName)} / ${escapeHtml(theme.label)}</p>
            <h2>${escapeHtml(post.title)}</h2>
        </div>
        <time datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time>
    `;

    const tagRow = document.createElement("div");
    tagRow.className = "tag-row";
    post.tags.forEach((tag) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `#${tag}`;
        button.addEventListener("click", () => {
            state.filters.tag = tag;
            els.tagFilter.value = tag;
            render();
        });
        tagRow.append(button);
    });

    const body = document.createElement("div");
    body.className = "post-body";
    post.content.forEach((block) => body.append(renderBlock(block, post)));

    article.append(header, tagRow, body);
    return article;
}

function renderBlock(block, post) {
    switch (block.type) {
        case "text":
            return element("p", "post-text", block.text);
        case "quote":
            return element("blockquote", "", block.text);
        case "link":
            return renderLink(block);
        case "image":
            return renderFigure(block, post);
        case "gallery":
            return renderGallery(block, post);
        case "list":
            return renderList(block);
        case "code":
            return renderCode(block);
        default:
            return element("p", "post-text", `Unsupported block type: ${block.type}`);
    }
}

function renderLink(block) {
    const paragraph = document.createElement("p");
    const link = document.createElement("a");
    link.href = block.url;
    link.textContent = block.text || block.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    paragraph.append(link);
    return paragraph;
}

function renderFigure(block, post) {
    const figure = document.createElement("figure");
    const img = document.createElement("img");
    img.src = imageSource(block, post);
    img.alt = block.alt || "";
    img.loading = "lazy";
    figure.append(img);

    if (block.caption) {
        const caption = document.createElement("figcaption");
        caption.textContent = block.caption;
        figure.append(caption);
    }
    return figure;
}

function renderGallery(block, post) {
    const gallery = document.createElement("div");
    gallery.className = "gallery";
    (block.images || []).forEach((image) => gallery.append(renderFigure(image, post)));
    return gallery;
}

function renderList(block) {
    const list = document.createElement("ul");
    list.className = "post-list-items";
    (block.items || []).forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        list.append(li);
    });
    return list;
}

function renderCode(block) {
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = block.code || "";
    if (block.language) {
        code.dataset.language = block.language;
    }
    pre.append(code);
    return pre;
}

function imageSource(block, post) {
    if (block.url) {
        return block.url;
    }
    return `${post.imageFolder}/${block.src}`;
}

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    node.textContent = text || "";
    return node;
}

function formatDate(date) {
    return new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "short",
        day: "2-digit"
    }).format(new Date(`${date}T00:00:00`));
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function toggleRadio() {
    state.radioOn = !state.radioOn;
    els.radioButton.setAttribute("aria-pressed", String(state.radioOn));
    els.radioButton.classList.toggle("playing", state.radioOn);

    if (state.radioOn) {
        startRadio();
    } else {
        stopRadio();
    }
}

function startRadio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
        return;
    }
    const context = state.audio?.context || new AudioContext();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const oscillator = context.createOscillator();
    const shimmer = context.createOscillator();

    oscillator.type = "sine";
    oscillator.frequency.value = 174;
    shimmer.type = "triangle";
    shimmer.frequency.value = 261.63;
    filter.type = "lowpass";
    filter.frequency.value = 700;
    gain.gain.value = 0.025;

    oscillator.connect(filter);
    shimmer.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    shimmer.start();

    state.audio = { context, oscillator, shimmer, gain };
}

function stopRadio() {
    if (!state.audio) {
        return;
    }
    const { oscillator, shimmer, gain, context } = state.audio;
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.25);
    oscillator.stop(context.currentTime + 0.3);
    shimmer.stop(context.currentTime + 0.3);
    state.audio = { context };
}

init();
