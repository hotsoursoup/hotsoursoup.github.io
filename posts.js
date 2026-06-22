const state = {
    config: null,
    posts: [],
    filters: {
        author: "all",
        tag: "all",
        theme: "all",
        search: ""
    },
    audioContext: null,
    music: null,
    musicOn: false,
    beat: null,
    beatOn: false,
    visualTheme: "aura"
};

const visualThemes = [
    { value: "aura", label: "Light Aura" },
    { value: "neon", label: "Dark Neon" },
    { value: "matrix", label: "Matrix" },
    { value: "plasma", label: "Plasma" },
    { value: "mono", label: "Mono Glass" },
    { value: "sunset", label: "Solar Pop" }
];

const els = {
    posts: document.querySelector("#posts"),
    count: document.querySelector("#post-count"),
    authorFilter: document.querySelector("#author-filter"),
    tagFilter: document.querySelector("#tag-filter"),
    themeFilter: document.querySelector("#theme-filter"),
    visualTheme: document.querySelector("#visual-theme"),
    searchFilter: document.querySelector("#search-filter"),
    clearFilters: document.querySelector("#clear-filters"),
    emptyTemplate: document.querySelector("#empty-state-template"),
    musicButton: document.querySelector("[data-music-toggle]"),
    beatButton: document.querySelector("[data-beat-toggle]")
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
        state.visualTheme = getInitialVisualTheme();

        applyVisualTheme(state.visualTheme);
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
    els.musicButton.addEventListener("click", toggleMusic);
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

function applyVisualTheme(theme) {
    const validThemes = new Set(visualThemes.map((item) => item.value));
    const nextTheme = validThemes.has(theme) ? theme : "aura";
    document.documentElement.dataset.visualTheme = nextTheme;
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

function toggleMusic() {
    state.musicOn = !state.musicOn;
    els.musicButton.setAttribute("aria-pressed", String(state.musicOn));
    els.musicButton.classList.toggle("playing", state.musicOn);

    if (state.musicOn) {
        startMusic();
    } else {
        stopMusic();
    }
}

async function getAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
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

async function startMusic() {
    const context = await getAudioContext();
    if (!context) {
        return;
    }

    const master = context.createGain();
    const filter = context.createBiquadFilter();
    const delay = context.createDelay(1.6);
    const feedback = context.createGain();
    const wet = context.createGain();
    const voices = createMusicVoices(context);
    const seed = Math.random() * 1000;
    let rafId = 0;
    let stepTimer = 0;
    let step = 0;

    master.gain.value = 0.0001;
    filter.type = "lowpass";
    filter.frequency.value = 980;
    filter.Q.value = 0.8;
    delay.delayTime.value = 0.34;
    feedback.gain.value = 0.22;
    wet.gain.value = 0.26;

    voices.forEach((voice) => {
        voice.gain.gain.value = 0;
        voice.oscillator.connect(voice.gain);
        voice.gain.connect(filter);
        voice.oscillator.start();
    });
    filter.connect(master);
    filter.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(master);
    master.connect(context.destination);
    master.gain.exponentialRampToValueAtTime(0.085, context.currentTime + 0.8);

    const tick = () => {
        if (!state.musicOn) {
            return;
        }

        const now = context.currentTime;
        const movement = (perlin1D(now * 0.035 + seed) + 1) / 2;
        filter.frequency.setTargetAtTime(520 + movement * 1650, now, 0.45);
        delay.delayTime.setTargetAtTime(0.22 + movement * 0.26, now, 0.65);

        if (now >= stepTimer) {
            playPerlinStep({ context, voices, seed, step });
            step += 1;
            stepTimer = now + 0.42 + ((perlin1D(seed + step * 0.19) + 1) / 2) * 0.42;
        }

        rafId = requestAnimationFrame(tick);
    };

    tick();
    state.music = { context, voices, master, rafId, filter, delay, feedback, wet };
}

function createMusicVoices(context) {
    const voiceSettings = [
        { type: "sine", level: 0.036, octave: 1 },
        { type: "triangle", level: 0.022, octave: 2 },
        { type: "sine", level: 0.017, octave: 0.5 }
    ];

    return voiceSettings.map((setting) => ({
        ...setting,
        oscillator: context.createOscillator(),
        gain: context.createGain()
    })).map((voice) => {
        voice.oscillator.type = voice.type;
        return voice;
    });
}

function playPerlinStep({ context, voices, seed, step }) {
    const scale = [0, 2, 4, 7, 9, 11, 14, 16];
    const root = 146.83;
    const shape = (perlin1D(seed + step * 0.31) + 1) / 2;
    const drift = (perlin1D(seed * 0.7 + step * 0.13) + 1) / 2;
    const degree = Math.min(scale.length - 1, Math.floor(shape * scale.length));
    const baseFrequency = root * Math.pow(2, scale[degree] / 12);
    const now = context.currentTime;

    voices.forEach((voice, index) => {
        const offset = perlin1D(seed + step * 0.17 + index * 12.7) * 5.5;
        const frequency = baseFrequency * voice.octave * Math.pow(2, offset / 1200);
        const attack = 0.03 + index * 0.025;
        const release = 0.55 + drift * 1.15 + index * 0.18;
        const peak = voice.level * (0.5 + shape * 0.9);

        voice.oscillator.frequency.setTargetAtTime(frequency, now, 0.09 + index * 0.04);
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setTargetAtTime(peak, now, attack);
        voice.gain.gain.setTargetAtTime(0.0001, now + 0.18, release);
    });
}

function stopMusic() {
    if (!state.music) {
        return;
    }

    const { context, voices, master, rafId } = state.music;
    if (!master || !voices) {
        state.music = null;
        return;
    }
    const now = context.currentTime;
    cancelAnimationFrame(rafId);
    master.gain.cancelScheduledValues(now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    voices.forEach((voice) => {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setTargetAtTime(0.0001, now, 0.08);
        voice.oscillator.stop(now + 0.55);
    });
    state.music = { context };
}

function toggleBeat() {
    state.beatOn = !state.beatOn;
    els.beatButton.setAttribute("aria-pressed", String(state.beatOn));
    els.beatButton.classList.toggle("playing", state.beatOn);

    if (state.beatOn) {
        startBeat();
    } else {
        stopBeat();
    }
}

async function startBeat() {
    const context = await getAudioContext();
    if (!context) {
        return;
    }

    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    const tempo = 165;
    const stepDuration = 60 / tempo / 2;
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
    master.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.35);

    const schedule = () => {
        while (nextTime < context.currentTime + 0.16) {
            scheduleJungleStep(context, master, step, nextTime);
            nextTime += stepDuration;
            step += 1;
        }
    };

    schedule();
    timer = window.setInterval(schedule, 35);
    state.beat = { context, master, timer };
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

function playSnare(context, destination, time) {
    const noise = createNoiseSource(context, 0.18);
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = "bandpass";
    filter.frequency.value = 1850;
    filter.Q.value = 0.8;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.42, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    noise.start(time);
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

function perlin1D(value) {
    const left = Math.floor(value);
    const right = left + 1;
    const local = value - left;
    const eased = fade(local);
    const a = gradient(left) * local;
    const b = gradient(right) * (local - 1);
    return lerp(a, b, eased) * 2;
}

function gradient(index) {
    const x = Math.sin(index * 127.1 + 311.7) * 43758.5453123;
    return (x - Math.floor(x)) < 0.5 ? -1 : 1;
}

function fade(value) {
    return value * value * value * (value * (value * 6 - 15) + 10);
}

function lerp(a, b, amount) {
    return a + (b - a) * amount;
}

init();
