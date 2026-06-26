const state = {
    config: null,
    posts: [],
    likedPosts: new Set(),
    filters: {
        author: "all",
        tag: "all",
        theme: "all",
        search: ""
    },
    audioContext: null,
    audioMessage: "",
    beat: null,
    beatOn: false,
    beatMode: "jungle",
    visualTheme: "aura",
    wpiStyle: "portal"
};

const visualThemes = [
    { value: "aura", label: "Light Aura" },
    { value: "neon", label: "Dark Neon" },
    { value: "matrix", label: "Matrix" },
    { value: "plasma", label: "Plasma" },
    { value: "mono", label: "Mono Glass" },
    { value: "sunset", label: "Solar Pop" }
];

const wpiStyles = [
    { value: "portal", label: "Portal Ring" },
    { value: "kaleidoscope", label: "Kaleidoscope" },
    { value: "halo", label: "Soft Halo" },
    { value: "prism", label: "Prism Spin" },
    { value: "minimal", label: "Minimal Orb" }
];

const beatModes = [
    { value: "jungle", label: "Jungle Break", tempo: 165, gain: 0.16 },
    { value: "lofi", label: "Lo-Fi Pulse", tempo: 84, gain: 0.13 },
    { value: "neon", label: "Neon House", tempo: 124, gain: 0.14 },
    { value: "matrix", label: "Matrix DnB", tempo: 172, gain: 0.15 },
    { value: "glitch", label: "Soft Glitch", tempo: 96, gain: 0.11 }
];

const LIKE_STORAGE_KEY = "hotSourSoupLikedPosts";

const els = {
    posts: document.querySelector("#posts"),
    count: document.querySelector("#post-count"),
    authorFilter: document.querySelector("#author-filter"),
    tagFilter: document.querySelector("#tag-filter"),
    themeFilter: document.querySelector("#theme-filter"),
    visualTheme: document.querySelector("#visual-theme"),
    wpiStyle: document.querySelector("#wpi-style"),
    searchFilter: document.querySelector("#search-filter"),
    clearFilters: document.querySelector("#clear-filters"),
    emptyTemplate: document.querySelector("#empty-state-template"),
    beatMode: document.querySelector("#beat-mode"),
    beatButton: document.querySelector("[data-beat-toggle]"),
    audioStatus: document.querySelector("[data-audio-status]")
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
        state.likedPosts = loadLikedPosts();
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
        state.visualTheme = getInitialVisualTheme();
        state.wpiStyle = getInitialWpiStyle();
        state.beatMode = getInitialBeatMode();

        applyVisualTheme(state.visualTheme);
        applyWpiStyle(state.wpiStyle);
        buildFilters();
        bindEvents();
        setActiveNav();
        render();
    } catch (error) {
        els.posts.innerHTML = "";
        const box = document.createElement("article");
        box.className = "empty-state";
        box.innerHTML = `<p class="eyebrow">loading error</p><h2>The signal did not lock.</h2><p>${escapeHtml(error.message)}</p>`;
        els.posts.append(box);
        els.count.textContent = "Could not load posts.";
    }
}

function normalizePost(post, authorId, author) {
    const tags = Array.from(new Set([post.tag, ...(post.tags || [])].filter(Boolean)));
    const fallbackId = `${post.date || "undated"}-${post.title || "untitled"}`;
    const postId = post.id || fallbackId;
    return {
        ...post,
        authorId,
        authorName: author.displayName,
        authorHandle: author.handle,
        imageFolder: author.imageFolder,
        likeKey: `${authorId}:${postId}`,
        likes: normalizeLikeCount(post.likes),
        tags,
        theme: post.theme || "porcelain",
        content: post.content || []
    };
}

function normalizeLikeCount(value) {
    const count = Number(value);
    if (!Number.isFinite(count) || count < 0) {
        return 0;
    }
    return Math.floor(count);
}

function buildFilters() {
    const authors = Object.entries(state.config.authors).map(([id, author]) => ({
        value: id,
        label: author.displayName
    }));
    const tags = [...new Set(state.posts.flatMap((post) => post.tags))].sort();
    const visibleThemeIds = [...new Set(state.posts.map((post) => post.theme))].sort();
    const themes = visibleThemeIds.map((id) => {
        const theme = state.config.postThemes[id] || { label: id };
        return {
            value: id,
            label: theme.label
        };
    });

    fillSelect(els.authorFilter, [{ value: "all", label: "All authors" }, ...authors], state.filters.author);
    fillSelect(els.tagFilter, [{ value: "all", label: "All tags" }, ...tags.map((tag) => ({ value: tag, label: tag }))]);
    fillSelect(els.themeFilter, [{ value: "all", label: "All themes" }, ...themes]);
    fillSelect(els.visualTheme, visualThemes, state.visualTheme);
    fillSelect(els.wpiStyle, wpiStyles, state.wpiStyle);
    fillSelect(els.beatMode, beatModes, state.beatMode);
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
    els.visualTheme.addEventListener("change", () => {
        state.visualTheme = els.visualTheme.value;
        applyVisualTheme(state.visualTheme);
        localStorage.setItem("hotSourSoupTheme", state.visualTheme);
    });
    els.wpiStyle.addEventListener("change", () => {
        state.wpiStyle = els.wpiStyle.value;
        applyWpiStyle(state.wpiStyle);
        localStorage.setItem("hotSourSoupWpiStyle", state.wpiStyle);
    });
    els.beatMode.addEventListener("change", () => {
        state.beatMode = els.beatMode.value;
        localStorage.setItem("hotSourSoupBeatMode", state.beatMode);
        if (state.beatOn) {
            stopBeat();
            startBeat().then((started) => {
                state.beatOn = started;
                els.beatButton.setAttribute("aria-pressed", String(started));
                els.beatButton.classList.toggle("playing", started);
                updateAudioStatus(started ? null : "audio blocked");
            });
        } else {
            updateAudioStatus();
        }
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
    els.beatButton.addEventListener("click", toggleBeat);
}

function getInitialVisualTheme() {
    const requestedTheme = new URLSearchParams(window.location.search).get("style");
    const savedTheme = localStorage.getItem("hotSourSoupTheme");
    const validThemes = new Set(visualThemes.map((theme) => theme.value));

    if (validThemes.has(requestedTheme)) {
        return requestedTheme;
    }

    if (validThemes.has(savedTheme)) {
        return savedTheme;
    }

    return "aura";
}

function getInitialWpiStyle() {
    const savedStyle = localStorage.getItem("hotSourSoupWpiStyle");
    const validStyles = new Set(wpiStyles.map((style) => style.value));
    return validStyles.has(savedStyle) ? savedStyle : "portal";
}

function getInitialBeatMode() {
    const savedMode = localStorage.getItem("hotSourSoupBeatMode");
    const validModes = new Set(beatModes.map((mode) => mode.value));
    return validModes.has(savedMode) ? savedMode : "jungle";
}

function applyVisualTheme(theme) {
    const validThemes = new Set(visualThemes.map((item) => item.value));
    const nextTheme = validThemes.has(theme) ? theme : "aura";
    document.documentElement.dataset.visualTheme = nextTheme;
}

function applyWpiStyle(style) {
    const validStyles = new Set(wpiStyles.map((item) => item.value));
    const nextStyle = validStyles.has(style) ? style : "portal";
    document.documentElement.dataset.wpiStyle = nextStyle;
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
    els.count.textContent = `${posts.length} ${noun} online in the feed`;
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
            block.alt,
            block.caption,
            block.url,
            block.src,
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

    article.append(header, tagRow, body, renderPostActions(post));
    return article;
}

function renderPostActions(post) {
    const actions = document.createElement("footer");
    actions.className = "post-actions";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "like-button";

    const icon = document.createElement("span");
    icon.className = "like-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = "&hearts;";

    const count = document.createElement("span");
    count.dataset.likeCount = "";

    button.append(icon, count);
    button.addEventListener("click", () => togglePostLike(post, button));
    updateLikeButton(button, post);

    actions.append(button);
    return actions;
}

function togglePostLike(post, button) {
    if (hasLikedPost(post)) {
        state.likedPosts.delete(post.likeKey);
    } else {
        state.likedPosts.add(post.likeKey);
    }

    saveLikedPosts();
    updateLikeButton(button, post);
}

function updateLikeButton(button, post) {
    const liked = hasLikedPost(post);
    const count = likeCountFor(post);
    const label = `${count} ${count === 1 ? "like" : "likes"}`;

    button.classList.toggle("liked", liked);
    button.setAttribute("aria-pressed", String(liked));
    button.setAttribute("aria-label", liked ? `Remove like from ${post.title}` : `Like ${post.title}`);
    button.querySelector("[data-like-count]").textContent = label;
}

function likeCountFor(post) {
    return post.likes + (hasLikedPost(post) ? 1 : 0);
}

function hasLikedPost(post) {
    return state.likedPosts.has(post.likeKey);
}

function loadLikedPosts() {
    try {
        const stored = localStorage.getItem(LIKE_STORAGE_KEY);
        if (!stored) {
            return new Set();
        }

        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
            return new Set(parsed.filter((item) => typeof item === "string"));
        }
    } catch {
        // If storage is blocked or corrupted, likes still work for this page view.
    }

    return new Set();
}

function saveLikedPosts() {
    try {
        localStorage.setItem(LIKE_STORAGE_KEY, JSON.stringify([...state.likedPosts]));
    } catch {
        // Some privacy modes block localStorage writes. The in-memory state still updates.
    }
}

function renderBlock(block, post) {
    switch (block.type) {
        case "text":
            return element("p", "post-text", block.text);
        case "heading":
            return element("h3", "post-section-heading", block.text);
        case "quote":
            return element("blockquote", "", block.text);
        case "link":
            return renderLink(block);
        case "image":
            return renderFigure(block, post);
        case "imageText":
            return renderImageText(block, post);
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
    figure.className = `image-block ${block.align ? `image-align-${block.align}` : ""}`.trim();
    const img = document.createElement("img");
    img.src = imageSource(block, post);
    img.alt = block.alt || "";
    img.loading = "lazy";
    img.addEventListener("load", () => {
        const ratio = img.naturalWidth / Math.max(1, img.naturalHeight);
        figure.classList.toggle("is-portrait", ratio < 0.86);
        figure.classList.toggle("is-landscape", ratio >= 0.86);
    });
    figure.append(img);

    if (block.caption) {
        const caption = document.createElement("figcaption");
        caption.textContent = block.caption;
        figure.append(caption);
    }
    return figure;
}

function renderImageText(block, post) {
    const wrapper = document.createElement("div");
    wrapper.className = `media-text ${block.position === "right" ? "media-text-right" : "media-text-left"}`;

    const copy = document.createElement("div");
    copy.className = "media-text-copy";
    textParagraphs(block.text).forEach((paragraph) => copy.append(element("p", "post-text", paragraph)));

    wrapper.append(renderFigure(block, post), copy);
    return wrapper;
}

function renderGallery(block, post) {
    const gallery = document.createElement("div");
    gallery.className = "gallery";
    (block.images || []).forEach((image) => gallery.append(renderFigure(image, post)));
    return gallery;
}

function textParagraphs(text) {
    return String(text || "")
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
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

function updateAudioStatus(message) {
    if (!els.audioStatus) {
        return;
    }
    if (message) {
        els.audioStatus.textContent = message;
        return;
    }

    if (state.beatOn) {
        els.audioStatus.textContent = `${currentBeatMode().label.toLowerCase()} online`;
    } else {
        els.audioStatus.textContent = "audio idle";
    }
}

async function getAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
        state.audioMessage = "audio not supported in this browser";
        updateAudioStatus(state.audioMessage);
        return null;
    }

    if (!state.audioContext) {
        state.audioContext = new AudioContext();
    }

    if (state.audioContext.state === "suspended") {
        await state.audioContext.resume();
    }

    return state.audioContext;
}

async function toggleBeat() {
    if (state.beatOn) {
        state.beatOn = false;
        els.beatButton.setAttribute("aria-pressed", "false");
        els.beatButton.classList.remove("playing");
        stopBeat();
        updateAudioStatus();
        return;
    }

    state.audioMessage = "";
    const started = await startBeat();
    state.beatOn = started;
    els.beatButton.setAttribute("aria-pressed", String(started));
    els.beatButton.classList.toggle("playing", started);
    updateAudioStatus(started ? null : state.audioMessage || "audio blocked");
}

async function startBeat() {
    const context = await getAudioContext();
    if (!context) {
        return false;
    }

    const mode = currentBeatMode();
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    const stepDuration = 60 / mode.tempo / 2;
    let step = 0;
    let nextTime = context.currentTime + 0.05;
    let timer = 0;

    master.gain.value = 0.0001;
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.12;
    master.connect(compressor);
    compressor.connect(context.destination);
    master.gain.exponentialRampToValueAtTime(mode.gain, context.currentTime + 0.35);
    playKick(context, master, context.currentTime + 0.02);
    playHat(context, master, context.currentTime + 0.05, 0.08);

    const schedule = () => {
        while (nextTime < context.currentTime + 0.16) {
            scheduleBeatStep(context, master, step, nextTime, mode.value);
            nextTime += stepDuration;
            step += 1;
        }
    };

    schedule();
    timer = window.setInterval(schedule, 35);
    state.beat = { context, master, timer };
    return true;
}

function currentBeatMode() {
    return beatModes.find((mode) => mode.value === state.beatMode) || beatModes[0];
}

function scheduleBeatStep(context, destination, step, time, mode) {
    if (mode === "lofi") {
        scheduleLofiStep(context, destination, step, time);
    } else if (mode === "neon") {
        scheduleNeonStep(context, destination, step, time);
    } else if (mode === "matrix") {
        scheduleMatrixStep(context, destination, step, time);
    } else if (mode === "glitch") {
        scheduleGlitchStep(context, destination, step, time);
    } else {
        scheduleJungleStep(context, destination, step, time);
    }
}

function scheduleJungleStep(context, destination, step, time) {
    const pattern = step % 16;
    const swing = pattern % 2 ? 0.018 : 0;
    const t = time + swing;

    if ([0, 6, 10].includes(pattern)) {
        playKick(context, destination, t);
    }
    if ([4, 12].includes(pattern)) {
        playSnare(context, destination, t);
    }
    if ([3, 7, 11, 15].includes(pattern)) {
        playGhostSnare(context, destination, t);
    }
    if (pattern % 2 === 0 || [5, 13].includes(pattern)) {
        playHat(context, destination, t, pattern % 4 === 0 ? 0.06 : 0.035);
    }
    if ([9, 14].includes(pattern)) {
        playTom(context, destination, t);
    }
}

function scheduleLofiStep(context, destination, step, time) {
    const pattern = step % 16;
    const swing = pattern % 2 ? 0.026 : 0;
    const t = time + swing;

    if ([0, 8].includes(pattern)) {
        playKick(context, destination, t);
    }
    if ([4, 12].includes(pattern)) {
        playSnare(context, destination, t, 0.28);
    }
    if (pattern % 2 === 0) {
        playHat(context, destination, t, pattern % 8 === 0 ? 0.045 : 0.024);
    }
    if ([2, 10].includes(pattern)) {
        playToneBlip(context, destination, t, pattern === 2 ? 246.94 : 196, 0.038);
    }
}

function scheduleNeonStep(context, destination, step, time) {
    const pattern = step % 16;
    if ([0, 4, 8, 12].includes(pattern)) {
        playKick(context, destination, time);
    }
    if ([4, 12].includes(pattern)) {
        playSnare(context, destination, time, 0.24);
    }
    if (pattern % 2 === 1) {
        playHat(context, destination, time, 0.034);
    }
    if ([3, 7, 11, 15].includes(pattern)) {
        playToneBlip(context, destination, time + 0.01, 392 + (pattern % 8) * 18, 0.025);
    }
}

function scheduleMatrixStep(context, destination, step, time) {
    const pattern = step % 16;
    const t = time + (pattern % 2 ? 0.012 : 0);
    if ([0, 5, 10].includes(pattern)) {
        playKick(context, destination, t);
    }
    if ([4, 12].includes(pattern)) {
        playSnare(context, destination, t, 0.34);
    }
    if ([2, 3, 6, 7, 10, 11, 14, 15].includes(pattern)) {
        playHat(context, destination, t, 0.036);
    }
    if ([7, 15].includes(pattern)) {
        playGhostSnare(context, destination, t);
    }
}

function scheduleGlitchStep(context, destination, step, time) {
    const pattern = step % 16;
    if ([0, 9].includes(pattern)) {
        playKick(context, destination, time);
    }
    if ([5, 13].includes(pattern)) {
        playSnare(context, destination, time, 0.2);
    }
    if ([1, 4, 6, 11, 14].includes(pattern)) {
        playHat(context, destination, time, 0.026);
    }
    if ([3, 8, 15].includes(pattern)) {
        playToneBlip(context, destination, time, 310 + pattern * 9, 0.018);
    }
}

function playKick(context, destination, time) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.13);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.9, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(time);
    osc.stop(time + 0.24);
}

function playSnare(context, destination, time, level = 0.42) {
    const noise = createNoiseSource(context, 0.18);
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = "bandpass";
    filter.frequency.value = 1850;
    filter.Q.value = 0.8;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    noise.start(time);
}

function playToneBlip(context, destination, time, frequency, level) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(time);
    osc.stop(time + 0.12);
}

function playGhostSnare(context, destination, time) {
    const noise = createNoiseSource(context, 0.08);
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = "highpass";
    filter.frequency.value = 1400;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.12, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.065);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    noise.start(time);
}

function playHat(context, destination, time, level) {
    const noise = createNoiseSource(context, 0.045);
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = "highpass";
    filter.frequency.value = 6200;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    noise.start(time);
}

function playTom(context, destination, time) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(92, time + 0.12);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.22, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(time);
    osc.stop(time + 0.18);
}

function createNoiseSource(context, duration) {
    const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < sampleCount; index += 1) {
        data[index] = Math.random() * 2 - 1;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    return source;
}

function stopBeat() {
    if (!state.beat) {
        return;
    }

    const { context, master, timer } = state.beat;
    if (!master) {
        state.beat = null;
        return;
    }
    const now = context.currentTime;
    window.clearInterval(timer);
    master.gain.cancelScheduledValues(now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    state.beat = { context };
}

init();
