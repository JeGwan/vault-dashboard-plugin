# Vault Dashboard

An Obsidian plugin that brings a personal dashboard with iOS-style widget grid right into your vault.

## Features

### 7 Built-in Widgets

| Widget | Description |
|--------|-------------|
| **Flip Clock** | Animated flip clock with date display |
| **Weather** | Real-time weather via Open-Meteo API (free, no key needed) with multi-city tabs |
| **Daily Quote** | 100+ curated quotes with Wikipedia author thumbnails |
| **Random Photo** | Random photos from Picsum with photographer credit |
| **YouTube Player** | Background music player with play/pause, volume, progress |
| **Calendar** | Mini calendar with daily note preview (rendered markdown) |
| **Activity Heatmap** | GitHub-style 26-week activity heatmap from vault file modifications |

### iOS-Style Grid Layout

- **4-column grid** — widgets snap to grid cells
- **Edit mode** — tap the ✎ button to enter edit mode with iOS-style jiggle animation
- **Drag to move** — long-press and drag any widget to reposition
- **Resize** — drag the ⇲ handle to change widget size (column span × row span)
- **Persistent layout** — your arrangement is saved and restored across sessions

### Theme Integration

Automatically adapts to your Obsidian theme (light/dark mode) using CSS custom properties.

## Installation

### From Obsidian Community Plugins

1. Open **Settings** → **Community plugins** → **Browse**
2. Search for "Vault Dashboard"
3. Click **Install**, then **Enable**

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/JeGwan/vault-dashboard-plugin/releases/latest)
2. Create folder: `<vault>/.obsidian/plugins/vault-dashboard/`
3. Copy the three files into that folder
4. Enable the plugin in **Settings** → **Community plugins**

## Usage

- Click the **dashboard icon** in the left ribbon, or
- Open command palette → **"Open vault dashboard"**

### Edit Mode

1. Click **✎ Edit** in the top-right corner
2. **Move widgets**: long-press (hold ~300ms) and drag to any grid position
3. **Resize widgets**: drag the ⇲ handle in the bottom-right corner
4. Click **✓ Done** to save and exit edit mode

### Settings

Go to **Settings** → **Vault Dashboard** to configure:

- **Widget visibility** — toggle each widget on/off
- **Weather cities** — add/remove cities from the weather widget
- **YouTube source** — set a video ID, playlist ID, or full URL

## Calendar Widget

The calendar shows a mini month view. When you click a date, it looks for the daily note:

- **Today** → `1-인박스/오늘.md`
- **Past dates** → `2-일기/1-Daily/YY.MM.DD 일기.md`

The note content is rendered as markdown inline. Click the file link to open the full note.

## Requirements

- **Obsidian** v1.5.0+
- **Desktop only** (uses Electron APIs for YouTube embed)

## Development

```bash
# Install dependencies
npm install

# Development (watch mode + auto-deploy to vault)
npm run dev

# Production build
npm run build
```

The build automatically deploys to `.obsidian/plugins/vault-dashboard/`.

## License

[MIT](LICENSE)
