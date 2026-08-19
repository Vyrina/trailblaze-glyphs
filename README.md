# Trailblaze Glyphs

A browser workbench to translate Latin text into *Honkai: Star Rail* in-game scripts and render/export high-resolution glyph graphics.

**Live Demo**: [https://vyrina.github.io/trailblaze-glyphs/](https://vyrina.github.io/trailblaze-glyphs/)

---

## Features

- **Bi-directional conversion**: Latin-to-script typing and reverse script-to-Latin decoding.
- **4 in-game scripts**: Jarilo-VI, Xianzhou, Penacony, and Amphoreus.
- **Retina PNG export**: Renders text at 2x resolution and copies directly to clipboard for design workflows.
- **Interactive character index**: Quick character map sidebar with click-to-insert.
- **Dynamic scaling**: Font size adjustment (16px–120px) with quick presets.
- **Keyboard shortcuts**:
  - `Ctrl + Shift + S` / `Cmd + Shift + S`: Swap translation direction
  - `Ctrl + Shift + C` / `Cmd + Shift + C`: Copy PNG image to clipboard
  - `Escape`: Clear active input pane

---

## Scripts & Fonts

| Script | Lore Region / World | Font File |
|---|---|---|
| **Jarilo-VI** | 1st World (Belobog) | `assets/fonts/jarilo.ttf` |
| **Xianzhou** | 2nd World (Luofu) | `assets/fonts/xianzhou.ttf` |
| **Penacony** | 3rd World (Dreamscape) | `assets/fonts/penacony.ttf` |
| **Amphoreus** | 4th World (Eternal Realm) | `assets/fonts/amphoreus.ttf` |

---

## Running Locally

Clone the repo and open `index.html` in your browser, or start a local server:

```bash
git clone https://github.com/Vyrina/trailblaze-glyphs.git
cd trailblaze-glyphs
npx serve .
```

---

## Credits & Disclaimer

- **Honkai: Star Rail**: All original script designs, lore names, and associated IP belong to miHoYo / HoYoverse. This is an unofficial, non-commercial fan tool.
- **Game Assets & Font Sources**: Font references extracted from [Mar-7th/StarRailRes](https://github.com/Mar-7th/StarRailRes).

---

## License

[MIT](LICENSE)