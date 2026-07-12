const state = {
    root: null,
    config: null,
    postsByAuthor: {},
    currentBlocks: [],
    selectedAuthor: "",
    editing: null,
    dirtyOrder: false
};

const els = {
    connect: document.querySelector("#connect-folder"),
    statusDot: document.querySelector("#status-dot"),
    connectionStatus: document.querySelector("#connection-status"),
    statusMessage: document.querySelector("#status-message"),
    managerTheme: document.querySelector("#manager-theme"),
    reqBrowser: document.querySelector("#req-browser"),
    reqLocalhost: document.querySelector("#req-localhost"),
    reqFolder: document.querySelector("#req-folder"),
    reqPython: document.querySelector("#req-python"),
    workspace: document.querySelector(".workspace"),
    tabs: document.querySelectorAll(".tab-button"),
    panels: document.querySelectorAll(".panel"),
    manageAuthor: document.querySelector("#manage-author"),
    postList: document.querySelector("#post-list"),
    postSearch: document.querySelector("#post-search"),
    showDrafts: document.querySelector("#show-drafts"),
    savePostOrder: document.querySelector("#save-post-order"),
    postForm: document.querySelector("#post-form"),
    editorTitle: document.querySelector("#editor-title"),
    postAuthor: document.querySelector("#post-author"),
    postId: document.querySelector("#post-id"),
    postTitle: document.querySelector("#post-title"),
    postDate: document.querySelector("#post-date"),
    postTag: document.querySelector("#post-tag"),
    postTags: document.querySelector("#post-tags"),
    postTheme: document.querySelector("#post-theme"),
    postDraft: document.querySelector("#post-draft"),
    blockType: document.querySelector("#block-type"),
    addBlock: document.querySelector("#add-block"),
    blockBuilder: document.querySelector("#block-builder"),
    postContent: document.querySelector("#post-content"),
    postPreview: document.querySelector("#post-preview"),
    newPost: document.querySelector("#new-post"),
    duplicatePost: document.querySelector("#duplicate-post"),
    deletePost: document.querySelector("#delete-post"),
    themeList: document.querySelector("#theme-list"),
    addTheme: document.querySelector("#add-theme"),
    saveThemes: document.querySelector("#save-themes"),
    siteTitle: document.querySelector("#site-title"),
    siteSubtitle: document.querySelector("#site-subtitle"),
    siteProfileImage: document.querySelector("#site-profile-image"),
    authorSettings: document.querySelector("#author-settings"),
    saveSiteConfig: document.querySelector("#save-site-config"),
    postCardTemplate: document.querySelector("#post-card-template")
};

const visualThemes = [
    { value: "aura", label: "Light Aura" },
    { value: "neon", label: "Dark Neon" },
    { value: "matrix", label: "Matrix" },
    { value: "plasma", label: "Plasma" },
    { value: "mono", label: "Mono Glass" },
    { value: "sunset", label: "Solar Pop" }
];

const blockTemplates = {
    text: { type: "text", text: "Write a paragraph here." },
    heading: { type: "heading", text: "A Small Section Heading" },
    quote: { type: "quote", text: "A highlighted thought." },
    image: { type: "image", src: "image-name.jpg", alt: "Describe the image", caption: "Optional caption." },
    imageText: {
        type: "imageText",
        src: "image-name.jpg",
        alt: "Describe the image",
        caption: "Optional caption.",
        position: "left",
        text: "Write the text that should sit beside this image."
    },
    link: { type: "link", text: "Open this", url: "https://example.com" },
    list: { type: "list", items: ["first thing", "second thing"] },
    gallery: {
        type: "gallery",
        images: [
            { src: "local-image.jpg", alt: "Local image" },
            { url: "https://example.com/remote.jpg", alt: "Remote image" }
        ]
    },
    code: { type: "code", language: "txt", code: "line one\\nline two" }
};

setupManagerTheme();
bindEvents();
runPreflight();

function bindEvents() {
    els.connect.addEventListener("click", connectFolder);
    els.tabs.forEach((tab) => tab.addEventListener("click", () => showTab(tab.dataset.tab)));
    els.manageAuthor.addEventListener("change", () => {
        state.selectedAuthor = els.manageAuthor.value;
        renderPostList();
    });
    els.postSearch.addEventListener("input", renderPostList);
    els.showDrafts.addEventListener("change", renderPostList);
    els.savePostOrder.addEventListener("click", savePostOrder);
    els.postForm.addEventListener("submit", savePostFromForm);
    els.postContent.addEventListener("input", syncBlocksFromJson);
    els.postAuthor.addEventListener("change", () => {
        updateImageStatusIndicators();
        renderPreview();
    });
    els.postTitle.addEventListener("input", renderPreview);
    els.postDate.addEventListener("input", renderPreview);
    els.postTag.addEventListener("input", renderPreview);
    els.postTags.addEventListener("input", renderPreview);
    els.postTheme.addEventListener("change", renderPreview);
    els.postDraft.addEventListener("change", renderPreview);
    els.newPost.addEventListener("click", () => loadPostIntoEditor(blankPost(), state.selectedAuthor));
    els.duplicatePost.addEventListener("click", duplicateCurrentPost);
    els.deletePost.addEventListener("click", deleteCurrentPost);
    els.addTheme.addEventListener("click", addThemeCard);
    els.saveThemes.addEventListener("click", saveThemes);
    els.saveSiteConfig.addEventListener("click", saveSiteConfig);
    els.managerTheme.addEventListener("change", () => {
        applyManagerTheme(els.managerTheme.value);
        localStorage.setItem("hotSourSoupManagerTheme", els.managerTheme.value);
    });
    els.addBlock.addEventListener("click", () => insertBlock(els.blockType.value));
    els.blockBuilder.addEventListener("input", updateBlockFromInput);
    els.blockBuilder.addEventListener("change", updateBlockFromInput);
    els.blockBuilder.addEventListener("click", handleBlockBuilderClick);
}

function setupManagerTheme() {
    const savedTheme = localStorage.getItem("hotSourSoupManagerTheme") || localStorage.getItem("hotSourSoupTheme");
    const validThemes = new Set(visualThemes.map((theme) => theme.value));
    const selectedTheme = validThemes.has(savedTheme) ? savedTheme : "aura";

    els.managerTheme.innerHTML = "";
    visualThemes.forEach((theme) => {
        const option = document.createElement("option");
        option.value = theme.value;
        option.textContent = theme.label;
        option.selected = theme.value === selectedTheme;
        els.managerTheme.append(option);
    });
    applyManagerTheme(selectedTheme);
}

function applyManagerTheme(theme) {
    const validThemes = new Set(visualThemes.map((item) => item.value));
    document.documentElement.dataset.visualTheme = validThemes.has(theme) ? theme : "aura";
}

async function connectFolder() {
    if (!("showDirectoryPicker" in window)) {
        setStatus("Wrong browser", "Use Chrome or Edge. This browser cannot safely edit local JSON files.", false);
        runPreflight();
        return;
    }

    if (!isLocalhost()) {
        setStatus("Not local", "Open this through http://localhost:8000/manage_website/. Do not open the HTML file directly.", false);
        runPreflight();
        return;
    }

    try {
        state.root = await window.showDirectoryPicker({ mode: "readwrite" });
        await loadAll();
        els.workspace.hidden = false;
        setStatus("Connected", `Loaded ${Object.keys(state.config.authors).length} authors from ${state.root.name}.`, true);
        runPreflight();
    } catch (error) {
        setStatus("Not connected", error.message, false);
        runPreflight();
    }
}

async function loadAll() {
    state.config = await readJson("site.config.json");
    state.postsByAuthor = {};

    for (const [authorId, author] of Object.entries(state.config.authors)) {
        state.postsByAuthor[authorId] = await readJson(author.postFile);
    }

    state.selectedAuthor = Object.keys(state.config.authors)[0];
    populateControls();
    renderPostList();
    loadPostIntoEditor(blankPost(), state.selectedAuthor);
    renderThemes();
    renderSiteConfig();
}

function runPreflight() {
    const supportsFolderAccess = "showDirectoryPicker" in window;
    const local = isLocalhost();

    setRequirement(
        els.reqBrowser,
        supportsFolderAccess ? "ok" : "bad",
        supportsFolderAccess
            ? "Good. This browser can ask for folder access."
            : "Use Chrome or Edge. Safari/Firefox usually cannot edit local files here."
    );

    setRequirement(
        els.reqLocalhost,
        local ? "ok" : "bad",
        local
            ? "Good. You opened this through localhost."
            : "Start the local server first, then open http://localhost:8000/manage_website/."
    );

    setRequirement(
        els.reqFolder,
        state.root ? "ok" : "warn",
        state.root
            ? `Selected: ${state.root.name}`
            : "Click Choose Site Folder and select hotsoursoup.github.io."
    );

    setRequirement(
        els.reqPython,
        local ? "ok" : "warn",
        local
            ? "The local server is running. Python or another server already did its job."
            : "If the launcher fails, install Python 3. No .NET Framework is needed."
    );
}

function setRequirement(node, status, message) {
    if (!node) {
        return;
    }
    node.classList.remove("ok", "warn", "bad");
    node.classList.add(status);
    const small = node.querySelector("small");
    if (small) {
        small.textContent = message;
    }
}

function isLocalhost() {
    return ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
}

async function readJson(path) {
    const file = await state.root.getFileHandle(path);
    const blob = await file.getFile();
    return JSON.parse(await blob.text());
}

async function writeJson(path, data) {
    await backupJson(path);
    const file = await state.root.getFileHandle(path, { create: true });
    const writable = await file.createWritable();
    await writable.write(`${JSON.stringify(data, null, 2)}\n`);
    await writable.close();
}

async function backupJson(path) {
    try {
        const source = await state.root.getFileHandle(path);
        const blob = await (await source.getFile()).text();
        const backupDirectory = await state.root.getDirectoryHandle("manage_website_backups", { create: true });
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupName = `${path.replace(/[^a-z0-9.-]+/gi, "_")}.${stamp}.bak.json`;
        const backup = await backupDirectory.getFileHandle(backupName, { create: true });
        const writable = await backup.createWritable();
        await writable.write(blob);
        await writable.close();
    } catch {
        // Backups are best-effort so a missing old file does not block saving a new one.
    }
}

function populateControls() {
    const authorOptions = Object.entries(state.config.authors).map(([id, author]) => ({
        value: id,
        label: author.displayName
    }));
    const themeOptions = Object.entries(state.config.postThemes).map(([id, theme]) => ({
        value: id,
        label: `${theme.label} (${id})`
    }));

    fillSelect(els.manageAuthor, authorOptions, state.selectedAuthor);
    fillSelect(els.postAuthor, authorOptions, state.selectedAuthor);
    fillSelect(els.postTheme, themeOptions, themeOptions[0]?.value || "");
}

function fillSelect(select, options, selected) {
    select.innerHTML = "";
    options.forEach((option) => {
        const node = document.createElement("option");
        node.value = option.value;
        node.textContent = option.label;
        node.selected = option.value === selected;
        select.append(node);
    });
}

function renderPostList() {
    const authorId = state.selectedAuthor;
    const query = els.postSearch.value.trim().toLowerCase();
    const showDrafts = els.showDrafts.checked;
    const posts = state.postsByAuthor[authorId] || [];
    els.postList.innerHTML = "";

    posts.forEach((post, index) => {
        if (!showDrafts && post.draft) {
            return;
        }
        if (query && !postSearchText(post).includes(query)) {
            return;
        }

        const card = els.postCardTemplate.content.firstElementChild.cloneNode(true);
        card.querySelector("h3").textContent = post.title || "(Untitled)";
        card.querySelector(".post-meta").textContent = `${post.date || "No date"} | ${post.theme || "No theme"}${post.draft ? " | Draft" : ""}`;
        card.querySelector(".post-tags").textContent = tagsFor(post).map((tag) => `#${tag}`).join(" ");
        card.querySelectorAll("button").forEach((button) => {
            button.addEventListener("click", () => handlePostAction(button.dataset.action, authorId, index));
        });
        els.postList.append(card);
    });
}

function postSearchText(post) {
    return [
        post.id,
        post.title,
        post.date,
        post.tag,
        ...(post.tags || []),
        JSON.stringify(post.content || [])
    ].join(" ").toLowerCase();
}

function handlePostAction(action, authorId, index) {
    const posts = state.postsByAuthor[authorId];
    if (action === "edit") {
        loadPostIntoEditor(posts[index], authorId, index);
        showTab("compose");
    }
    if (action === "copy") {
        const copy = structuredClone(posts[index]);
        copy.id = uniquePostId(`${copy.id || "post"}-copy`, posts);
        copy.title = `${copy.title || "Untitled"} Copy`;
        copy.draft = true;
        loadPostIntoEditor(copy, authorId);
        showTab("compose");
    }
    if (action === "up" && index > 0) {
        [posts[index - 1], posts[index]] = [posts[index], posts[index - 1]];
        state.dirtyOrder = true;
        renderPostList();
    }
    if (action === "down" && index < posts.length - 1) {
        [posts[index + 1], posts[index]] = [posts[index], posts[index + 1]];
        state.dirtyOrder = true;
        renderPostList();
    }
}

function loadPostIntoEditor(post, authorId, index = null) {
    state.editing = { authorId, index };
    els.editorTitle.textContent = index === null ? "Create Post" : "Edit Post";
    els.postAuthor.value = authorId;
    els.postId.value = post.id || "";
    els.postTitle.value = post.title || "";
    els.postDate.value = post.date || today();
    els.postTag.value = post.tag || "";
    els.postTags.value = (post.tags || []).join(", ");
    els.postTheme.value = post.theme || Object.keys(state.config.postThemes)[0] || "";
    els.postDraft.checked = Boolean(post.draft);
    state.currentBlocks = structuredClone(post.content || []);
    syncJsonFromBlocks();
    renderBlockBuilder();
    renderPreview();
    updateImageStatusIndicators();
}

function blankPost() {
    return {
        id: `post-${today()}`,
        title: "",
        date: today(),
        tag: "note",
        tags: ["note"],
        theme: Object.keys(state.config?.postThemes || { porcelain: true })[0],
        draft: true,
        content: [structuredClone(blockTemplates.text)]
    };
}

async function savePostFromForm(event) {
    event.preventDefault();
    const authorId = els.postAuthor.value;
    const author = state.config.authors[authorId];
    if (!await confirmIdentity(author.displayName, "save this post")) {
        return;
    }

    const posts = state.postsByAuthor[authorId];
    let post;
    try {
        post = formToPost();
    } catch (error) {
        alert(error.message);
        return;
    }
    const duplicateIndex = posts.findIndex((item, index) => item.id === post.id && index !== state.editing?.index);
    if (duplicateIndex >= 0) {
        alert("That post ID already exists for this author. Choose a unique ID.");
        return;
    }

    if (state.editing?.index === null || state.editing?.authorId !== authorId) {
        posts.unshift(post);
        state.editing = { authorId, index: 0 };
    } else {
        posts[state.editing.index] = post;
    }

    await writeAuthorPosts(authorId);
    setStatus("Saved", `${author.displayName}'s post file was updated.`, true);
    state.selectedAuthor = authorId;
    els.manageAuthor.value = authorId;
    renderPostList();
}

function formToPost() {
    const post = {
        id: slugify(els.postId.value || els.postTitle.value || `post-${today()}`),
        title: els.postTitle.value.trim(),
        date: els.postDate.value || today(),
        tag: els.postTag.value.trim(),
        tags: csv(els.postTags.value),
        theme: els.postTheme.value,
        content: parseContent()
    };

    if (els.postDraft.checked) {
        post.draft = true;
    }

    return post;
}

function parseContent() {
    if (!Array.isArray(state.currentBlocks)) {
        throw new Error("The block editor is empty or broken. Add a block and try again.");
    }
    return structuredClone(state.currentBlocks);
}

async function deleteCurrentPost() {
    if (!state.editing || state.editing.index === null) {
        alert("Choose an existing post first.");
        return;
    }

    const authorId = state.editing.authorId;
    const author = state.config.authors[authorId];
    if (!await confirmIdentity(author.displayName, "delete this post")) {
        return;
    }

    state.postsByAuthor[authorId].splice(state.editing.index, 1);
    await writeAuthorPosts(authorId);
    loadPostIntoEditor(blankPost(), authorId);
    renderPostList();
    setStatus("Deleted", `${author.displayName}'s post was removed locally.`, true);
}

function duplicateCurrentPost() {
    let post;
    try {
        post = formToPost();
    } catch (error) {
        alert(error.message);
        return;
    }
    const authorId = els.postAuthor.value;
    post.id = uniquePostId(`${post.id || "post"}-copy`, state.postsByAuthor[authorId]);
    post.title = `${post.title || "Untitled"} Copy`;
    post.draft = true;
    loadPostIntoEditor(post, authorId);
}

async function savePostOrder() {
    const authorId = state.selectedAuthor;
    const author = state.config.authors[authorId];
    if (!state.dirtyOrder && !confirm("The order has not changed. Save anyway?")) {
        return;
    }
    if (!await confirmIdentity(author.displayName, "save the post order")) {
        return;
    }
    await writeAuthorPosts(authorId);
    state.dirtyOrder = false;
    setStatus("Order saved", `${author.displayName}'s post order was written to ${author.postFile}.`, true);
}

async function writeAuthorPosts(authorId) {
    await writeJson(state.config.authors[authorId].postFile, state.postsByAuthor[authorId]);
}

function insertBlock(type) {
    state.currentBlocks.push(structuredClone(blockTemplates[type] || blockTemplates.text));
    syncJsonFromBlocks();
    renderBlockBuilder();
    renderPreview();
}

function renderPreview() {
    els.postPreview.innerHTML = "";
    try {
        const wrapper = document.createElement("div");
        wrapper.append(renderPreviewPost(previewPostFromForm()));
        const frame = document.createElement("iframe");
        frame.className = "public-preview-frame";
        frame.title = "Public website preview";
        frame.srcdoc = previewDocument(wrapper.innerHTML);
        frame.addEventListener("load", () => setupPreviewFrame(frame));
        els.postPreview.append(frame);
    } catch (error) {
        const warning = document.createElement("article");
        warning.className = "preview-error";
        warning.innerHTML = `<strong>Preview is waiting.</strong><p>${escapeHtml(error.message)}</p>`;
        els.postPreview.append(warning);
    }
}

function previewDocument(postHtml) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <base href="../">
    <link rel="stylesheet" href="style.css?v=20260701-1">
    <style>
        html, body { min-height: auto; background: transparent; }
        body { margin: 0; overflow: hidden; }
        body::before, body::after { display: none; }
        .post-card { margin: 0; box-shadow: 0 10px 28px rgba(29, 42, 70, 0.10); }
        .preview-image-fallback {
            min-width: min(100%, 280px);
            min-height: 130px;
            display: grid;
            place-items: center;
            border-radius: 18px;
            color: var(--muted);
            background: color-mix(in srgb, var(--glass-strong) 72%, transparent);
            padding: 16px;
            text-align: center;
        }
    </style>
</head>
<body>
    ${postHtml}
</body>
</html>`;
}

function setupPreviewFrame(frame) {
    const document = frame.contentDocument;
    if (!document) {
        return;
    }

    document.querySelectorAll(".code-toggle").forEach((toggle) => {
        toggle.addEventListener("click", () => {
            const panel = toggle.closest(".code-panel");
            const isOpen = panel.classList.toggle("is-open");
            toggle.setAttribute("aria-expanded", String(isOpen));
            toggle.querySelector("span").textContent = isOpen ? "hide code" : "show code";
            resizePreviewFrame(frame);
        });
    });

    document.querySelectorAll(".copy-code").forEach((button) => {
        button.addEventListener("click", async () => {
            const code = button.closest(".code-panel")?.querySelector("code")?.textContent || "";
            try {
                await navigator.clipboard.writeText(code);
                button.textContent = "copied";
                window.setTimeout(() => {
                    button.textContent = "copy code";
                }, 1200);
            } catch {
                button.textContent = "copy failed";
                window.setTimeout(() => {
                    button.textContent = "copy code";
                }, 1200);
            }
        });
    });

    document.querySelectorAll("img").forEach((img) => {
        img.addEventListener("load", () => resizePreviewFrame(frame));
        img.addEventListener("error", () => {
            const fallback = document.createElement("div");
            fallback.className = "preview-image-fallback";
            fallback.textContent = `Image not found: ${img.getAttribute("src") || "missing source"}`;
            img.replaceWith(fallback);
            resizePreviewFrame(frame);
        });
    });

    resizePreviewFrame(frame);
    window.setTimeout(() => resizePreviewFrame(frame), 300);
}

function resizePreviewFrame(frame) {
    const document = frame.contentDocument;
    if (!document) {
        return;
    }
    const height = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        260
    );
    frame.style.height = `${height}px`;
}

function previewPostFromForm() {
    const authorId = els.postAuthor.value || state.selectedAuthor || Object.keys(state.config?.authors || {})[0];
    const author = state.config?.authors?.[authorId] || {};
    const tags = Array.from(new Set([els.postTag.value.trim(), ...csv(els.postTags.value)].filter(Boolean)));
    return {
        id: els.postId.value.trim() || "preview-post",
        title: els.postTitle.value.trim() || "Untitled Post",
        date: els.postDate.value || today(),
        tags,
        theme: els.postTheme.value || Object.keys(state.config?.postThemes || { porcelain: true })[0],
        content: structuredClone(state.currentBlocks || []),
        authorId,
        authorName: author.displayName || "Author",
        imageFolder: author.imageFolder || "",
        likes: 0
    };
}

function renderPreviewPost(post) {
    const theme = state.config.postThemes[post.theme] || Object.values(state.config.postThemes)[0] || {};
    const article = document.createElement("article");
    article.className = "post-card preview-public-post";
    article.style.setProperty("--post-accent", theme.accent || "var(--accent-2)");
    article.style.setProperty("--post-paper", theme.paper || "var(--glass-strong)");
    article.style.setProperty("--post-tint", theme.tint || "transparent");
    article.style.setProperty("--post-border", theme.border || "var(--line)");

    const header = document.createElement("header");
    header.className = "post-header";
    const headerCopy = document.createElement("div");
    const kicker = document.createElement("p");
    kicker.className = "post-kicker";
    kicker.textContent = `${post.authorName} / ${theme.label || post.theme}`;
    const title = document.createElement("h2");
    title.textContent = post.title;
    if (post.titleNote) {
        const note = document.createElement("small");
        note.textContent = post.titleNote;
        title.append(note);
    }
    headerCopy.append(kicker, title);
    const time = document.createElement("time");
    time.dateTime = post.date;
    time.textContent = formatPreviewDate(post.date);
    header.append(headerCopy, time);

    const tagRow = document.createElement("div");
    tagRow.className = "tag-row";
    post.tags.forEach((tag) => {
        const tagButton = document.createElement("button");
        tagButton.type = "button";
        tagButton.textContent = `#${tag}`;
        tagButton.disabled = true;
        tagRow.append(tagButton);
    });

    const body = document.createElement("div");
    body.className = "post-body";
    post.content.forEach((block) => body.append(renderPreviewBlock(block, post)));

    const actions = document.createElement("footer");
    actions.className = "post-actions preview-actions";
    actions.innerHTML = `<button type="button" class="like-button" disabled><span class="like-icon" aria-hidden="true">&hearts;</span><span>0 likes</span></button>`;

    article.append(header, tagRow, body, actions);
    return article;
}

function renderPreviewBlock(block, post) {
    switch (block.type) {
        case "text":
            return element("p", "post-text", block.text);
        case "heading":
            return element("h3", "post-section-heading", block.text);
        case "quote":
            return element("blockquote", "", block.text);
        case "link":
            return renderPreviewLink(block);
        case "image":
            return renderPreviewFigure(block, post);
        case "imageText":
            return renderPreviewImageText(block, post);
        case "gallery":
            return renderPreviewGallery(block, post);
        case "list":
            return renderPreviewList(block);
        case "code":
            return renderPreviewCode(block);
        default:
            return element("p", "post-text preview-error-line", `Unsupported block type: ${block.type || "unknown"}`);
    }
}

function renderPreviewLink(block) {
    const paragraph = document.createElement("p");
    const link = document.createElement("a");
    link.href = block.url || "#";
    link.textContent = block.text || block.url || "Untitled link";
    link.target = "_blank";
    link.rel = "noreferrer";
    paragraph.append(link);
    return paragraph;
}

function renderPreviewFigure(block, post) {
    const figure = document.createElement("figure");
    figure.className = `image-block ${block.align ? `image-align-${block.align}` : ""}`.trim();
    const source = previewImageSource(block, post);

    if (!source) {
        figure.classList.add("image-missing");
        figure.append(imageFallback("No image source yet."));
        return figure;
    }

    const img = document.createElement("img");
    img.src = source;
    img.alt = block.alt || "";
    img.loading = "lazy";
    img.addEventListener("load", () => {
        const ratio = img.naturalWidth / Math.max(1, img.naturalHeight);
        figure.classList.toggle("is-portrait", ratio < 0.86);
        figure.classList.toggle("is-landscape", ratio >= 0.86);
    });
    img.addEventListener("error", () => {
        figure.classList.add("image-missing");
        img.replaceWith(imageFallback(`Image not found: ${block.src || block.url || "missing source"}`));
    });
    figure.append(img);

    if (block.caption) {
        const caption = document.createElement("figcaption");
        caption.textContent = block.caption;
        figure.append(caption);
    }
    return figure;
}

function imageFallback(message) {
    const fallback = document.createElement("div");
    fallback.className = "preview-image-fallback";
    fallback.textContent = message;
    return fallback;
}

function previewImageSource(block, post) {
    if (block.url) {
        return block.url;
    }
    if (block.src && post.imageFolder) {
        return `${post.imageFolder}/${block.src}`;
    }
    return "";
}

function renderPreviewImageText(block, post) {
    const wrapper = document.createElement("div");
    wrapper.className = `media-text ${block.position === "right" ? "media-text-right" : "media-text-left"}`;
    const copy = document.createElement("div");
    copy.className = "media-text-copy";
    textParagraphs(block.text).forEach((paragraph) => copy.append(element("p", "post-text", paragraph)));
    wrapper.append(renderPreviewFigure(block, post), copy);
    return wrapper;
}

function renderPreviewGallery(block, post) {
    const gallery = document.createElement("div");
    gallery.className = "gallery";
    if (!(block.images || []).length) {
        gallery.append(imageFallback("No gallery images yet."));
        return gallery;
    }
    (block.images || []).forEach((image) => gallery.append(renderPreviewFigure(image, post)));
    return gallery;
}

function renderPreviewList(block) {
    const list = document.createElement("ul");
    list.className = "post-list-items";
    (block.items || []).forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        list.append(li);
    });
    return list;
}

function renderPreviewCode(block) {
    const panel = document.createElement("section");
    panel.className = "code-panel";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "code-toggle";
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = `<span>show code</span><span class="code-line" aria-hidden="true"></span>`;

    const drawer = document.createElement("div");
    drawer.className = "code-drawer";

    const toolbar = document.createElement("div");
    toolbar.className = "code-toolbar";
    const language = document.createElement("span");
    language.textContent = block.language ? `${block.language} code` : "code";
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "copy-code";
    copy.textContent = "copy code";

    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = block.code || "";
    pre.append(code);

    toggle.addEventListener("click", () => {
        const isOpen = panel.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.querySelector("span").textContent = isOpen ? "hide code" : "show code";
    });

    copy.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(block.code || "");
            copy.textContent = "copied";
            window.setTimeout(() => {
                copy.textContent = "copy code";
            }, 1200);
        } catch {
            copy.textContent = "copy failed";
            window.setTimeout(() => {
                copy.textContent = "copy code";
            }, 1200);
        }
    });

    toolbar.append(language, copy);
    drawer.append(toolbar, pre);
    panel.append(toggle, drawer);
    return panel;
}

function renderBlockBuilder() {
    const blocks = state.currentBlocks || [];
    els.blockBuilder.innerHTML = "";

    if (!blocks.length) {
        const empty = document.createElement("article");
        empty.className = "empty-builder";
        empty.innerHTML = "<h3>No blocks yet.</h3><p>Choose a block type and press +.</p>";
        els.blockBuilder.append(empty);
        return;
    }

    blocks.forEach((block, index) => {
        const card = document.createElement("article");
        card.className = `block-card block-${block.type || "unknown"}`;
        card.dataset.index = index;
        card.innerHTML = `
            <header class="block-card-header">
                <div>
                    <p class="eyebrow">block ${index + 1}</p>
                    <h4>${blockLabel(block.type)}</h4>
                </div>
                <div class="block-actions">
                    <button type="button" data-block-action="up" title="Move up">Up</button>
                    <button type="button" data-block-action="down" title="Move down">Down</button>
                    <button type="button" data-block-action="delete" class="mini-danger" title="Remove">X</button>
                </div>
            </header>
            ${blockFields(block, index)}
        `;
        els.blockBuilder.append(card);
    });
    updateImageStatusIndicators();
}

function blockFields(block, index) {
    if (block.type === "text") {
        return fieldTextarea(index, "text", "Text", block.text || "", "Write the paragraph here.");
    }
    if (block.type === "heading") {
        return fieldInput(index, "text", "Heading", block.text || "", "A Small Section Heading");
    }
    if (block.type === "quote") {
        return fieldTextarea(index, "text", "Quote", block.text || "", "A highlighted thought.");
    }
    if (block.type === "link") {
        return `
            ${fieldInput(index, "text", "Link Text", block.text || "", "Open this")}
            ${fieldInput(index, "url", "URL", block.url || "", "https://example.com")}
        `;
    }
    if (block.type === "image") {
        return `
            ${fieldInput(index, "src", "Local File Name", block.src || "", "photo.jpg")}
            ${imageStatusBadge(index, "src")}
            ${fieldInput(index, "url", "Remote Image URL", block.url || "", "https://example.com/photo.jpg")}
            ${fieldInput(index, "alt", "Alt Text", block.alt || "", "Describe the image")}
            ${fieldInput(index, "caption", "Caption", block.caption || "", "Optional caption")}
            <p class="block-hint">Use either local file name or remote URL. Local files go in that author's image folder.</p>
        `;
    }
    if (block.type === "imageText") {
        return `
            ${fieldSelect(index, "position", "Image Side", block.position || "left", [
                { value: "left", label: "Left" },
                { value: "right", label: "Right" }
            ])}
            ${fieldInput(index, "src", "Local File Name", block.src || "", "photo.jpg")}
            ${imageStatusBadge(index, "src")}
            ${fieldInput(index, "url", "Remote Image URL", block.url || "", "https://example.com/photo.jpg")}
            ${fieldInput(index, "alt", "Alt Text", block.alt || "", "Describe the image")}
            ${fieldInput(index, "caption", "Caption", block.caption || "", "Optional caption")}
            ${fieldTextarea(index, "text", "Text Beside Image", block.text || "", "Write the paragraph here.")}
            <p class="block-hint">Use this for narrow images that look better beside text on laptop screens. Phones will stack the image and text.</p>
        `;
    }
    if (block.type === "gallery") {
        const lines = (block.images || []).map((image) => image.src || image.url || "").join("\n");
        return `
            ${fieldTextarea(index, "imagesText", "Images", lines, "one-image.jpg\\nhttps://example.com/remote.jpg")}
            <p class="block-hint">One image per line. Local filenames and remote URLs both work.</p>
        `;
    }
    if (block.type === "list") {
        return fieldTextarea(index, "itemsText", "List Items", (block.items || []).join("\n"), "first thing\nsecond thing");
    }
    if (block.type === "code") {
        return `
            ${fieldInput(index, "language", "Language", block.language || "txt", "js")}
            ${fieldTextarea(index, "code", "Code", block.code || "", "paste code here")}
        `;
    }
    return `<p class="block-hint">Unknown block type. Delete it or edit the JSON drawer.</p>`;
}

function imageStatusBadge(index, key) {
    return `<p class="image-file-status checking" data-image-status data-block-index="${index}" data-block-key="${key}">checking image...</p>`;
}

function fieldInput(index, key, label, value, placeholder) {
    return `<label class="block-field"><span>${label}</span><input data-block-index="${index}" data-block-key="${key}" value="${escapeAttribute(value)}" placeholder="${escapeAttribute(placeholder)}"></label>`;
}

function fieldTextarea(index, key, label, value, placeholder) {
    return `<label class="block-field wide-block-field"><span>${label}</span><textarea data-block-index="${index}" data-block-key="${key}" rows="4" placeholder="${escapeAttribute(placeholder)}">${escapeHtml(value)}</textarea></label>`;
}

function fieldSelect(index, key, label, value, options) {
    const choices = options.map((option) => {
        const selected = option.value === value ? " selected" : "";
        return `<option value="${escapeAttribute(option.value)}"${selected}>${escapeHtml(option.label)}</option>`;
    }).join("");
    return `<label class="block-field"><span>${label}</span><select data-block-index="${index}" data-block-key="${key}">${choices}</select></label>`;
}

async function updateImageStatusIndicators() {
    const badges = [...document.querySelectorAll("[data-image-status]")];
    if (!badges.length) {
        return;
    }

    await Promise.all(badges.map(async (badge) => {
        const block = state.currentBlocks[Number(badge.dataset.blockIndex)];
        const filename = block?.[badge.dataset.blockKey]?.trim();
        const authorId = els.postAuthor.value;
        const folder = state.config?.authors?.[authorId]?.imageFolder || "image folder";

        badge.classList.remove("ok", "bad", "warn", "checking");
        if (block?.url) {
            badge.classList.add("warn");
            badge.textContent = "remote URL used; local file ignored";
            return;
        }
        if (!filename) {
            badge.classList.add("warn");
            badge.textContent = "no local image filename yet";
            return;
        }

        badge.classList.add("checking");
        badge.textContent = `checking ${folder}/${filename}...`;
        const exists = await localImageExists(authorId, filename);
        badge.classList.remove("checking");
        badge.classList.add(exists ? "ok" : "bad");
        badge.textContent = exists ? `found: ${folder}/${filename}` : `missing: ${folder}/${filename}`;
    }));
}

async function localImageExists(authorId, filename) {
    try {
        const folder = state.config.authors[authorId].imageFolder;
        const directory = await state.root.getDirectoryHandle(folder);
        await directory.getFileHandle(filename);
        return true;
    } catch {
        return false;
    }
}

function updateBlockFromInput(event) {
    const target = event.target;
    if (!target.matches("[data-block-index]")) {
        return;
    }

    const index = Number(target.dataset.blockIndex);
    const key = target.dataset.blockKey;
    const block = state.currentBlocks[index];
    if (!block) {
        return;
    }

    if (key === "itemsText") {
        block.items = lines(target.value);
    } else if (key === "imagesText") {
        block.images = lines(target.value).map((value) => {
            const image = value.startsWith("http://") || value.startsWith("https://")
                ? { url: value }
                : { src: value };
            image.alt = "Gallery image";
            return image;
        });
    } else {
        block[key] = target.value;
    }

    cleanupBlock(block);
    syncJsonFromBlocks();
    renderPreview();
    updateImageStatusIndicators();
}

function handleBlockBuilderClick(event) {
    const button = event.target.closest("[data-block-action]");
    if (!button) {
        return;
    }

    const card = button.closest(".block-card");
    const index = Number(card.dataset.index);
    const action = button.dataset.blockAction;
    const blocks = state.currentBlocks;

    if (action === "delete") {
        blocks.splice(index, 1);
    }
    if (action === "up" && index > 0) {
        [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]];
    }
    if (action === "down" && index < blocks.length - 1) {
        [blocks[index + 1], blocks[index]] = [blocks[index], blocks[index + 1]];
    }

    syncJsonFromBlocks();
    renderBlockBuilder();
    renderPreview();
    updateImageStatusIndicators();
}

function syncBlocksFromJson() {
    try {
        const content = JSON.parse(els.postContent.value || "[]");
        if (!Array.isArray(content)) {
            throw new Error("Content must be an array.");
        }
        state.currentBlocks = content;
        renderBlockBuilder();
        renderPreview();
        updateImageStatusIndicators();
    } catch {
        els.postPreview.innerHTML = "<p>Advanced JSON is not valid yet.</p>";
    }
}

function syncJsonFromBlocks() {
    els.postContent.value = JSON.stringify(state.currentBlocks || [], null, 2);
}

function cleanupBlock(block) {
    Object.keys(block).forEach((key) => {
        if (block[key] === "") {
            delete block[key];
        }
    });
}

function blockLabel(type) {
    return {
        text: "Text",
        heading: "Heading",
        quote: "Quote",
        image: "Image",
        imageText: "Image + Text",
        link: "Link",
        list: "List",
        gallery: "Gallery",
        code: "Code"
    }[type] || "Unknown";
}

function lines(value) {
    return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function textParagraphs(text) {
    return String(text || "")
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
}

function renderThemes() {
    els.themeList.innerHTML = "";
    Object.entries(state.config.postThemes).forEach(([id, theme]) => {
        els.themeList.append(themeCard(id, theme));
    });
}

function themeCard(id, theme) {
    const card = document.createElement("article");
    card.className = "theme-card";
    card.innerHTML = `
        ${field("Key", "theme-key", id)}
        ${field("Label", "theme-label", theme.label)}
        ${field("Accent", "theme-accent", theme.accent)}
        ${field("Paper", "theme-paper", theme.paper)}
        ${field("Tint", "theme-tint", theme.tint)}
        ${field("Border", "theme-border", theme.border)}
    `;
    return card;
}

function addThemeCard() {
    els.themeList.append(themeCard("new-theme", {
        label: "New Theme",
        accent: "#00d5ff",
        paper: "rgba(255, 255, 255, 0.78)",
        tint: "rgba(0, 213, 255, 0.18)",
        border: "rgba(255, 255, 255, 0.72)"
    }));
}

async function saveThemes() {
    if (!await confirmAnyAuthor("save global post themes")) {
        return;
    }

    const themes = {};
    els.themeList.querySelectorAll(".theme-card").forEach((card) => {
        const key = slugify(card.querySelector(".theme-key").value);
        if (!key) {
            return;
        }
        themes[key] = {
            label: card.querySelector(".theme-label").value,
            accent: card.querySelector(".theme-accent").value,
            paper: card.querySelector(".theme-paper").value,
            tint: card.querySelector(".theme-tint").value,
            border: card.querySelector(".theme-border").value
        };
    });
    state.config.postThemes = themes;
    await writeJson("site.config.json", state.config);
    populateControls();
    renderThemes();
    setStatus("Themes saved", "site.config.json was updated.", true);
}

function renderSiteConfig() {
    els.siteTitle.value = state.config.site?.title || "";
    els.siteSubtitle.value = state.config.site?.subtitle || "";
    els.siteProfileImage.value = state.config.site?.profileImage || "";
    els.authorSettings.innerHTML = "";

    Object.entries(state.config.authors).forEach(([id, author]) => {
        const card = document.createElement("article");
        card.className = "author-card";
        card.dataset.authorId = id;
        card.innerHTML = `
            ${field("Key", "author-key", id)}
            ${field("Display Name", "author-name", author.displayName)}
            ${field("Handle", "author-handle", author.handle)}
            ${field("Post File", "author-post-file", author.postFile)}
            ${field("Image Folder", "author-image-folder", author.imageFolder)}
            ${field("Accent", "author-accent", author.accent)}
        `;
        els.authorSettings.append(card);
    });
}

async function saveSiteConfig() {
    if (!await confirmAnyAuthor("save global site settings")) {
        return;
    }

    state.config.site = {
        title: els.siteTitle.value,
        subtitle: els.siteSubtitle.value,
        profileImage: els.siteProfileImage.value.trim()
    };
    const authors = {};
    els.authorSettings.querySelectorAll(".author-card").forEach((card) => {
        const key = slugify(card.querySelector(".author-key").value);
        if (!key) {
            return;
        }
        authors[key] = {
            displayName: card.querySelector(".author-name").value,
            handle: card.querySelector(".author-handle").value,
            postFile: card.querySelector(".author-post-file").value,
            imageFolder: card.querySelector(".author-image-folder").value,
            accent: card.querySelector(".author-accent").value
        };
    });
    state.config.authors = authors;
    await writeJson("site.config.json", state.config);
    populateControls();
    renderSiteConfig();
    setStatus("Site config saved", "site.config.json was updated.", true);
}

function field(label, className, value) {
    return `<label><span>${label}</span><input class="${className}" value="${escapeAttribute(value || "")}"></label>`;
}

async function confirmIdentity(displayName, action) {
    const typed = prompt(`Type ${displayName} to ${action}.`);
    return typed === displayName;
}

async function confirmAnyAuthor(action) {
    const names = Object.values(state.config.authors).map((author) => author.displayName);
    const typed = prompt(`Type your author name to ${action}.\nAllowed: ${names.join(", ")}`);
    return names.includes(typed);
}

function showTab(name) {
    els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
    els.panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === name));
}

function setStatus(title, message, connected) {
    els.connectionStatus.textContent = title;
    els.statusMessage.textContent = message;
    els.statusDot.classList.toggle("connected", Boolean(connected));
}

function tagsFor(post) {
    return Array.from(new Set([post.tag, ...(post.tags || [])].filter(Boolean)));
}

function csv(value) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function slugify(value) {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function uniquePostId(base, posts) {
    const slug = slugify(base) || "post";
    const existing = new Set(posts.map((post) => post.id));
    let next = slug;
    let count = 2;
    while (existing.has(next)) {
        next = `${slug}-${count}`;
        count += 1;
    }
    return next;
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

function formatPreviewDate(date) {
    try {
        return new Intl.DateTimeFormat("en", {
            year: "numeric",
            month: "short",
            day: "2-digit"
        }).format(new Date(`${date}T00:00:00`));
    } catch {
        return date || today();
    }
}

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    node.textContent = text || "";
    return node;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
}
