# Hot Sour Soup Manager

This folder contains the local website manager. It is meant for your computer, not as a public editing system.

The root `_config.yml` excludes this folder from the GitHub Pages build.

## Open It

From the repo root:

```powershell
python -m http.server 8000
```

Open:

```text
http://localhost:8000/manage_website/
```

Use Chrome or Edge. The manager uses the browser File System Access API, which lets a local page edit local files only after you choose the folder.

## First Step

Click `Choose Site Folder` and select the `hotsoursoup.github.io` folder.

The manager loads:

- `site.config.json`
- `himanshu.json`
- `aryan.json`

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
- Insert block templates for text, quote, image, link, list, gallery, and code.

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
