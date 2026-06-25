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
    authorSettings: document.querySelector("#author-settings"),
    saveSiteConfig: document.querySelector("#save-site-config"),
    postCardTemplate: document.querySelector("#post-card-template")
};

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
    els.postTitle.addEventListener("input", renderPreview);
    els.postTags.addEventListener("input", renderPreview);
    els.postTheme.addEventListener("change", renderPreview);
    els.newPost.addEventListener("click", () => loadPostIntoEditor(blankPost(), state.selectedAuthor));
    els.duplicatePost.addEventListener("click", duplicateCurrentPost);
    els.deletePost.addEventListener("click", deleteCurrentPost);
    els.addTheme.addEventListener("click", addThemeCard);
    els.saveThemes.addEventListener("click", saveThemes);
    els.saveSiteConfig.addEventListener("click", saveSiteConfig);
    els.addBlock.addEventListener("click", () => insertBlock(els.blockType.value));
    els.blockBuilder.addEventListener("input", updateBlockFromInput);
    els.blockBuilder.addEventListener("change", updateBlockFromInput);
    els.blockBuilder.addEventListener("click", handleBlockBuilderClick);
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
    const content = state.currentBlocks || [];

    const tags = csv(els.postTags.value).map((tag) => `#${escapeHtml(tag)}`).join(" ");
    els.postPreview.innerHTML = `
        <h3>${escapeHtml(els.postTitle.value || "Untitled Post")}</h3>
        <p>${escapeHtml(els.postDate.value || today())} | ${escapeHtml(els.postTheme.value || "theme")}</p>
        <p>${tags}</p>
        ${content.map(previewBlock).join("")}
    `;
}

function previewBlock(block) {
    if (block.type === "heading") return `<h4>${escapeHtml(block.text || "")}</h4>`;
    if (block.type === "text") return `<p>${escapeHtml(block.text || "")}</p>`;
    if (block.type === "quote") return `<blockquote>${escapeHtml(block.text || "")}</blockquote>`;
    if (block.type === "link") return `<p>Link: ${escapeHtml(block.text || block.url || "")}</p>`;
    if (block.type === "image") return `<p>Image: ${escapeHtml(block.src || block.url || "")}</p>`;
    if (block.type === "imageText") return `<p>Image + Text: ${escapeHtml(block.src || block.url || "")} / ${escapeHtml(block.position || "left")}</p>`;
    if (block.type === "gallery") return `<p>Gallery: ${(block.images || []).length} images</p>`;
    if (block.type === "list") return `<p>List: ${(block.items || []).join(", ")}</p>`;
    if (block.type === "code") return `<pre>${escapeHtml(block.code || "")}</pre>`;
    return `<p>Unknown block: ${escapeHtml(block.type || "")}</p>`;
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
        subtitle: els.siteSubtitle.value
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
