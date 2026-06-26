# Hot Sour Soup

A tiny static journal for Himanshu and Aryan. It runs on GitHub Pages with plain HTML, CSS, JavaScript, and JSON. No build step. No backend. Just files.

## File Map

- `index.html` opens the all-author feed by default.
- `aryan.html` opens Aryan's log by default.
- `site.config.json` stores the site title, author names, image folders, and reusable post themes.
- `himanshu.json` stores Himanshu's posts.
- `aryan.json` stores Aryan's posts.
- `himanshu_images/` stores local images for Himanshu posts.
- `aryan_images/` stores local images for Aryan posts.
- `posts.js` loads config and posts, then renders filters and cards.
- `style.css` controls the compact futuristic glass layout and visual styles.
- `manage_website/` contains the local control room for creating posts, editing posts, changing themes, and updating site settings.
- `_config.yml` excludes the manager from GitHub Pages builds so it stays a local utility.

## Changing Author Names

Edit `site.config.json` only:

```json
"himanshu": {
  "displayName": "Himanshu",
  "handle": "my_log",
  "postFile": "himanshu.json",
  "imageFolder": "himanshu_images",
  "accent": "#a66a42"
}
```

Posts do not need author names because each author has their own JSON file.

## Adding A New Post

The easiest option is the local manager:

On Windows, double-click:

```text
start_manager.bat
```

That opens a helper script called `start_manager.ps1`, checks for a real Python 3 install, starts the local server, then opens the manager.

On Mac, double-click:

```text
start_manager_mac.command
```

If macOS refuses to open it, right-click it, choose `Open`, then confirm. Or start it manually:

If it says the file is not allowed to execute, run this once in Terminal:

```bash
chmod +x start_manager_mac.command
```

```powershell
python -m http.server 8000
```

If Windows says Python is missing, install Python 3 from `https://www.python.org/downloads/` and tick `Add python.exe to PATH` during installation.

Then open:

```text
http://localhost:8000/manage_website/
```

Choose the repo folder, open `Create Post`, build the post from scrapbook blocks, and save. The manager will ask you to type the author's display name before it changes that author's post file.

The manager is committed into the repo for convenience, but it is excluded from the public GitHub Pages build.

Add a new object to the top of `himanshu.json` or `aryan.json`:

```json
{
  "id": "my-new-post",
  "title": "My New Post",
  "date": "2026-06-22",
  "tag": "note",
  "tags": ["note", "music", "weekend"],
  "theme": "porcelain",
  "content": [
    {
      "type": "text",
      "text": "Write the post text here."
    },
    {
      "type": "link",
      "text": "A nice link",
      "url": "https://example.com"
    }
  ]
}
```

Use a unique `id`. Dates should use `YYYY-MM-DD`.

## Draft Posts

Add `"draft": true` to hide a post:

```json
{
  "id": "hidden-template",
  "title": "Hidden Template",
  "date": "2026-06-22",
  "tag": "template",
  "tags": ["template"],
  "theme": "ink",
  "draft": true,
  "content": []
}
```

Set it to `false` or remove it when ready.

## Content Blocks

Text:

```json
{ "type": "text", "text": "A paragraph of text." }
```

Quote:

```json
{ "type": "quote", "text": "A highlighted thought." }
```

Link:

```json
{ "type": "link", "text": "Open this", "url": "https://example.com" }
```

Local image:

```json
{
  "type": "image",
  "src": "photo.jpg",
  "alt": "Describe the image",
  "caption": "Optional caption."
}
```

For Himanshu, put `photo.jpg` in `himanshu_images/`. For Aryan, put it in `aryan_images/`.

Remote image:

```json
{
  "type": "image",
  "url": "https://example.com/photo.jpg",
  "alt": "Describe the remote image",
  "caption": "Optional caption."
}
```

Image beside text:

```json
{
  "type": "imageText",
  "src": "portrait.jpg",
  "alt": "Describe the image",
  "caption": "Optional caption.",
  "position": "left",
  "text": "Write the paragraph that should sit beside the image."
}
```

Use `"position": "right"` when the image should sit on the right. Phones stack this block automatically.

Gallery:

```json
{
  "type": "gallery",
  "images": [
    { "src": "local-one.jpg", "alt": "Local image" },
    { "url": "https://example.com/remote.jpg", "alt": "Remote image" }
  ]
}
```

List:

```json
{ "type": "list", "items": ["first thing", "second thing"] }
```

Code:

```json
{
  "type": "code",
  "language": "txt",
  "code": "line one\nline two"
}
```

## Post Themes

Themes live in `site.config.json` under `postThemes`.

```json
"porcelain": {
  "label": "Prism",
  "accent": "#00d5ff",
  "paper": "rgba(255, 255, 255, 0.78)",
  "tint": "rgba(0, 213, 255, 0.18)",
  "border": "rgba(255, 255, 255, 0.72)"
}
```

Use the theme key in a post:

```json
"theme": "porcelain"
```

Current theme keys: `porcelain`, `matcha`, `sunprint`, `ink`.

Current theme labels: Prism, Limewave, Solar, Ultraviolet.

## Filters

The site automatically builds filters for:

- author
- tag
- post theme
- search text

Tags come from the `tag` and `tags` fields in each post.

The `Visual Style` dropdown changes the whole site mood. Current styles are:

- Light Aura
- Dark Neon
- Matrix
- Plasma
- Mono Glass
- Solar Pop

The selected visual style is saved in the browser, so it stays selected on the next visit.

## Local Testing

Because the site reads JSON files, test it through a small local web server instead of opening `index.html` directly.

One easy option:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

The local manager lives at `http://localhost:8000/manage_website/`.

## Tiny Fun Features

The beat deck uses the browser's built-in Web Audio API to play tiny generated drum patterns. Pick a mode from the Beat menu, then press `play beat`.

Current modes:

- Jungle Break
- Lo-Fi Pulse
- Neon House
- Matrix DnB
- Soft Glitch

There are no audio files, no radio streams, and nothing external to host. This keeps the site portable on GitHub Pages and avoids broken cross-origin streams.

To change the web profile image in the top bar, open the local manager, go to `Site Settings`, and fill `Web Profile Image` with a repository path such as `assets/profile.png`. Leave it blank to use the simple initials mark.

## Likes

Likes are local to the browser. The site stores the posts you liked in `localStorage`, then adds `1` to the post's base `likes` number from the JSON. Because GitHub Pages has no backend, these likes are not shared across devices or visitors. For a truly shared like count, the project would need an external service or backend.
