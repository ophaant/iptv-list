# 📺 IPTV Playlist Updater

Automated IPTV playlist generator and validator that keeps a clean, working list of Indonesian, South Korean, Sports, and Anime channels up-to-date daily using GitHub Actions.

## 🚀 Features

- **Automated Validation**: Sends `HEAD`/`GET` requests with stream-optimized timeouts and a browser-like User-Agent to check if links are active before adding them.
- **Auto-Update**: Runs automatically via GitHub Actions once every day.
- **Curated Groups**: Channels are sorted and grouped under:
  - `Indonesia` (Indonesian local & regional channels)
  - `Korea` (South Korean channels)
  - `Olahraga` (Sports & Active games)
  - `Anime` (Anime broadcasts like Muse, Ani-One, Animax, etc.)

## 🔗 Live Playlist Link

Many IPTV players (especially **OTT Player**, Smart TVs, and older TV boxes) cannot import raw GitHub URLs (`raw.githubusercontent.com`) due to **SSL certificate validation failures** or **CORS (Cross-Origin Resource Sharing) restrictions**.

To ensure 100% compatibility, you should use the **jsDelivr CDN** link instead, which has universal CORS headers and works in all players:

```text
https://cdn.jsdelivr.net/gh/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>/playlist.m3u
```

*(Note: Replace `<YOUR_GITHUB_USERNAME>` and `<YOUR_REPO_NAME>` with your actual GitHub username and repository name).*

## 🛠️ Local Development

If you want to run the updater manually on your computer:

### Prerequisites

- Node.js (v20 or higher)
- npm

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the update and generation script:
   ```bash
   npm run update
   ```

The script will fetch the latest channels, validate active streams concurrently, and output the updated playlist to `playlist.m3u`.

## 🤖 GitHub Actions Setup

To enable the daily auto-update:

1. Push this codebase to a new repository on GitHub.
2. Ensure GitHub Actions has write permission in your repository settings:
   - Go to **Settings > Actions > General > Workflow permissions**.
   - Select **Read and write permissions** and click **Save**.
3. The workflow under `.github/workflows/update.yml` will run daily at `00:00 UTC` and commit the updated `playlist.m3u` file if any stream status changed. You can also trigger it manually from the **Actions** tab.
