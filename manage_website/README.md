# Hot Sour Soup Manager

This folder contains the local website manager. It is meant for your computer, not as a public editing system.

The root `_config.yml` excludes this folder from the GitHub Pages build.

## Open It

Easy Windows option:

Double-click `start_manager.bat` in the repo root. It starts a local server and opens the manager.

The Windows launcher uses `start_manager.ps1` behind the scenes. It checks whether Python is real before starting the server, so the Microsoft Store Python shortcut will not fool it.

Easy Mac option:

Double-click `start_manager_mac.command` in the repo root. If macOS blocks it, right-click the file, choose `Open`, then confirm. It starts a local server and opens the manager.

If macOS says the command file is not executable, run this once in Terminal from the repo root:

```bash
chmod +x start_manager_mac.command
```

Manual option:

From the repo root:

```powershell
python -m http.server 8000
```

On Mac, use:

```bash
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000/manage_website/
```

Use Chrome or Edge. The manager uses the browser File System Access API, which lets a local page edit local files only after you choose the folder.

Requirements:

- Python 3, only to start the local server.
- Chrome or Edge.
- No .NET Framework.
- The repo folder on your computer.

If Windows says Python is missing, install Python 3 from `https://www.python.org/downloads/` and tick `Add python.exe to PATH` during installation.

## First Step

Click `Choose Site Folder` and select the `hotsoursoup.github.io` folder.

The manager loads:

- `site.config.json`
- `himanshu.json`
- `aryan.json`

## Create A New Post

1. Open the manager.
2. Click `Choose Site Folder`.
3. Select the `hotsoursoup.github.io` folder.
4. Open the `Create Post` tab.
5. Choose the author.
6. Fill title, date, tags, and post theme.
7. Build the post from scrapbook blocks. Use `+` to add text, heading, image, link, list, gallery, quote, or code.
8. Move blocks with `Up` and `Down`, or remove a block with `X`.
9. Click `Save Post`.
10. Type the author's exact name, such as `Himanshu` or `Aryan`.
11. Check the public page locally, then commit and push.

## Identity Confirmation

Before changing an author's posts, the manager asks you to type that author's display name exactly.

Examples:

- Type `Himanshu` to save, delete, or reorder Himanshu posts.
- Type `Aryan` to save, delete, or reorder Aryan posts.

This helps avoid editing each other's posts by accident.

For global changes, such as post themes or site settings, either configured author name is accepted.

## What It Can Do

- Create posts.
- Edit posts.
- Delete posts.
- Clone posts as drafts.
- Reorder posts.
- Toggle draft status.
- Edit reusable post themes.
- Edit site title, subtitle, and author settings.
- Preview post content before saving.
- Insert scrapbook blocks for heading, text, quote, image, link, list, gallery, and code.
- Move and remove each draft block without touching raw JSON.

## Backups

Every save creates a backup copy first in:

```text
manage_website_backups/
```

Those backup files are local safety snapshots. You can delete old backups whenever they pile up.

## Publishing

The manager only edits local files. After using it:

```bash
git status
git add .
git commit -m "Update posts"
git pull --rebase origin main
git push
```

## Image Posts

For a local image block:

```json
{
  "type": "image",
  "src": "photo.jpg",
  "alt": "Describe the image",
  "caption": "Optional caption"
}
```

Put `photo.jpg` in the correct folder:

- `himanshu_images/`
- `aryan_images/`

Remote image URLs can use `url` instead of `src`.
